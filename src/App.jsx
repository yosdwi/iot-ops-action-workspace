import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, Check, ChevronRight, Database, LayoutDashboard, ListChecks, Loader2, LogOut, Plus, Search, Settings2, Sparkles, Users } from 'lucide-react'
import LoginScreen from './components/LoginScreen'
import NewTicketModal from './components/NewTicketModal'
import TicketTable from './components/TicketTable'
import { supabase } from './lib/supabase'
import { jakartaDate, jakartaDateTimeLabel } from './lib/time'

const EMPTY_MASTERS = { sites: [], shifts: [], people: [], issueTypes: [], actionTypes: [], statuses: [] }

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (authLoading) return <div className="center-screen"><Loader2 className="spin" /></div>
  if (!session) return <LoginScreen />
  return <Workspace session={session} />
}

function Workspace({ session }) {
  const [masters, setMasters] = useState(EMPTY_MASTERS)
  const [operatorId, setOperatorId] = useState(() => localStorage.getItem('iot-ops-operator') || '')
  const [viewDate, setViewDate] = useState(jakartaDate())
  const [latestDate, setLatestDate] = useState('')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [issueFilter, setIssueFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [toast, setToast] = useState(null)
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadMasters()
  }, [])

  useEffect(() => {
    loadTickets(viewDate)
  }, [viewDate])

  async function loadMasters() {
    const queries = await Promise.all([
      supabase.from('sites').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('shifts').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('people').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('issue_types').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('action_types').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('statuses').select('*').eq('is_active', true).order('sort_order'),
    ])
    const firstError = queries.find((x) => x.error)?.error
    if (firstError) return notify(firstError.message, 'error')
    setMasters({ sites: queries[0].data, shifts: queries[1].data, people: queries[2].data, issueTypes: queries[3].data, actionTypes: queries[4].data, statuses: queries[5].data })
  }

  async function loadTickets(date) {
    setLoading(true)
    setSelected(new Set())
    const { data, error } = await supabase
      .from('ticket_workspace')
      .select('*')
      .eq('ticket_date', date)
      .eq('is_archived', false)
      .order('start_time', { ascending: false, nullsFirst: false })
      .limit(1000)

    if (error) {
      notify(error.message, 'error')
      setTickets([])
    } else {
      setTickets(data || [])
      if (!(data || []).length) {
        const latest = await supabase.from('tickets').select('ticket_date').eq('is_archived', false).order('ticket_date', { ascending: false }).limit(1).maybeSingle()
        if (!latest.error) setLatestDate(latest.data?.ticket_date || '')
      }
    }
    setLoading(false)
  }

  function notify(message, type = 'info') {
    setToast({ message, type })
    window.clearTimeout(window.__iotToastTimer)
    window.__iotToastTimer = window.setTimeout(() => setToast(null), 3500)
  }

  function chooseOperator(value) {
    setOperatorId(value)
    if (value) localStorage.setItem('iot-ops-operator', value)
    else localStorage.removeItem('iot-ops-operator')
  }

  function localCorrective(ticketId, value) {
    setTickets((rows) => rows.map((row) => row.ticket_id === ticketId ? { ...row, corrective_action_blocker: value } : row))
  }

  async function saveTicket(row, patch = {}, solve = false) {
    if (!operatorId) return notify('Pilih operator IoT Ops dulu.', 'error')
    const before = { ...row }
    const optimistic = {
      ...row,
      ...patch,
      ...(solve ? { status_id: 'STATUS-SOLVED', status_name: 'Solved', is_completed: true, closed_at: new Date().toISOString() } : {}),
      _saving: true,
    }
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? optimistic : item))

    const { data, error } = await supabase.rpc('save_ticket_action', {
      p_ticket_id: row.ticket_id,
      p_operator_id: operatorId,
      p_action_type_id: patch.action_type_id !== undefined ? patch.action_type_id : (row.action_type_id || null),
      p_corrective_action: patch.corrective_action_blocker !== undefined ? patch.corrective_action_blocker : (row.corrective_action_blocker || null),
      p_solve: solve,
    })

    if (error) {
      setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? before : item))
      return notify(error.message, 'error')
    }
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? { ...data, _saving: false } : item))
  }

  async function reopenTicket(row) {
    if (!operatorId) return notify('Pilih operator IoT Ops dulu.', 'error')
    const before = { ...row }
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? { ...item, status_id: 'STATUS-OPEN', status_name: 'Open', is_completed: false, closed_at: null, closed_by_id: null, _saving: true } : item))
    const { data, error } = await supabase.rpc('reopen_ticket', { p_ticket_id: row.ticket_id, p_operator_id: operatorId })
    if (error) {
      setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? before : item))
      return notify(error.message, 'error')
    }
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? data : item))
  }

  async function bulkApply(actionType = null, solve = false) {
    const ids = [...selected]
    if (!ids.length) return notify('Pilih ticket dulu.', 'error')
    if (!operatorId) return notify('Pilih operator IoT Ops dulu.', 'error')
    const snapshot = new Map(tickets.filter((x) => selected.has(x.ticket_id)).map((x) => [x.ticket_id, x]))
    setTickets((rows) => rows.map((row) => selected.has(row.ticket_id) ? {
      ...row,
      ...(actionType ? { action_type_id: actionType.action_type_id, action_name: actionType.action_name } : {}),
      ...(solve ? { status_id: 'STATUS-SOLVED', status_name: 'Solved', is_completed: true, closed_at: new Date().toISOString() } : {}),
      _saving: true,
    } : row))

    const { data, error } = await supabase.rpc('bulk_apply_ticket_action', {
      p_ticket_ids: ids,
      p_operator_id: operatorId,
      p_action_type_id: actionType?.action_type_id || null,
      p_corrective_action: null,
      p_solve: solve,
    })

    if (error) {
      setTickets((rows) => rows.map((row) => snapshot.has(row.ticket_id) ? snapshot.get(row.ticket_id) : row))
      return notify(error.message, 'error')
    }
    setTickets((rows) => rows.map((row) => selected.has(row.ticket_id) ? { ...row, _saving: false } : row))
    notify(`${data?.updated_count || ids.length} ticket updated.`, 'success')
    setSelected(new Set())
  }

  function addCreated(createdRows) {
    if (!createdRows?.length) return
    const rowsForView = createdRows.filter((row) => row.ticket_date === viewDate)
    if (rowsForView.length) setTickets((rows) => [...rowsForView, ...rows])
  }

  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return tickets.filter((row) => {
      if (siteFilter && row.site_id !== siteFilter) return false
      if (shiftFilter && row.shift_id !== shiftFilter) return false
      if (issueFilter && row.issue_type_id !== issueFilter) return false
      if (statusFilter && row.status_id !== statusFilter) return false
      if (!needle) return true
      return [row.ticket_number, row.unit_no, row.issue_description, row.issue_name].some((value) => String(value || '').toLowerCase().includes(needle))
    })
  }, [tickets, search, siteFilter, shiftFilter, issueFilter, statusFilter])

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((x) => x.status_id === 'STATUS-OPEN').length,
    solved: tickets.filter((x) => x.status_id === 'STATUS-SOLVED').length,
  }), [tickets])

  const quickActions = ['FU IT Site', 'Pengecekan Data', 'Validasi ulang', 'Requested Action']
    .map((name) => masters.actionTypes.find((item) => item.action_name?.toLowerCase() === name.toLowerCase()))
    .filter(Boolean)

  const currentOperator = masters.people.find((x) => x.person_id === operatorId)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark small"><Activity size={20} /></div><div><strong>IoT Ops</strong><span>Action Workspace</span></div></div>
        <nav>
          <button className="nav-item active"><ListChecks size={18} /> Ticketing</button>
          <button className="nav-item" disabled><LayoutDashboard size={18} /> Dashboard <span className="soon">next</span></button>
          <button className="nav-item" disabled><Settings2 size={18} /> Master Data <span className="soon">next</span></button>
          <button className="nav-item" disabled><Database size={18} /> Archive <span className="soon">next</span></button>
        </nav>
        <div className="sidebar-footer"><div className="source-dot" /> Supabase PostgreSQL</div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div><div className="eyebrow">Operational workspace</div><h1>Ticket Action</h1><div className="live-time"><span className="live-dot" /> {jakartaDateTimeLabel(clock)} WIB</div></div>
          <div className="topbar-actions">
            <label className="operator-picker"><Users size={16} /><select value={operatorId} onChange={(e) => chooseOperator(e.target.value)}><option value="">Select operator</option>{masters.people.map((item) => <option key={item.person_id} value={item.person_id}>{item.display_name}</option>)}</select></label>
            <button className="button primary" onClick={() => setShowNewTicket(true)}><Plus size={17} /> New Ticket</button>
            <button className="icon-button" title={session.user.email} onClick={() => supabase.auth.signOut()}><LogOut size={18} /></button>
          </div>
        </header>

        {!operatorId && <div className="notice"><Sparkles size={17} /><div><strong>Pilih operator sebelum action.</strong><span>Google login memberi akses; operator menentukan siapa yang tercatat melakukan update.</span></div></div>}

        <section className="stat-grid">
          <div className="stat-card"><span>Tickets on date</span><strong>{stats.total}</strong></div>
          <div className="stat-card"><span>Open</span><strong>{stats.open}</strong></div>
          <div className="stat-card"><span>Solved</span><strong>{stats.solved}</strong></div>
          <div className="stat-card accent"><span>Selected</span><strong>{selected.size}</strong></div>
        </section>

        <section className="controls-card">
          <div className="filter-row">
            <label className="date-control"><CalendarDays size={16} /><input type="date" value={viewDate} onChange={(e) => setViewDate(e.target.value)} /></label>
            <button className="button secondary compact" onClick={() => setViewDate(jakartaDate())}>Today</button>
            <label className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket, unit, description…" /></label>
            <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}><option value="">All sites</option>{masters.sites.map((x) => <option key={x.site_id} value={x.site_id}>{x.site_code}</option>)}</select>
            <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}><option value="">All shifts</option>{masters.shifts.map((x) => <option key={x.shift_id} value={x.shift_id}>{x.shift_name}</option>)}</select>
            <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)}><option value="">All issues</option>{masters.issueTypes.map((x) => <option key={x.issue_type_id} value={x.issue_type_id}>{x.issue_name}</option>)}</select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All status</option>{masters.statuses.map((x) => <option key={x.status_id} value={x.status_id}>{x.status_name}</option>)}</select>
          </div>

          <div className="quick-row">
            <span className="quick-label">Quick action</span>
            {quickActions.map((action) => <button key={action.action_type_id} className="quick-button" onClick={() => bulkApply(action, false)} disabled={!selected.size}>{action.action_name}</button>)}
            <div className="quick-spacer" />
            <button className="button solve-bulk compact" onClick={() => bulkApply(null, true)} disabled={!selected.size}><Check size={15} /> Solve selected</button>
          </div>
        </section>

        <section className="content-card">
          <div className="content-heading"><div><strong>{filteredTickets.length} shown</strong><span>{viewDate} · {currentOperator ? `Operator ${currentOperator.display_name}` : 'Operator not selected'}</span></div><button className="text-button" onClick={() => loadTickets(viewDate)}>Refresh <ChevronRight size={15} /></button></div>

          {loading ? <div className="table-loading"><Loader2 className="spin" /><span>Loading work queue…</span></div> : filteredTickets.length ? (
            <TicketTable
              tickets={filteredTickets}
              actionTypes={masters.actionTypes}
              selected={selected}
              onToggle={(id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })}
              onToggleAll={(checked) => setSelected(checked ? new Set(filteredTickets.map((x) => x.ticket_id)) : new Set())}
              onLocalCorrective={localCorrective}
              onSave={saveTicket}
              onSolve={(row) => saveTicket(row, {}, true)}
              onReopen={reopenTicket}
            />
          ) : (
            <div className="empty-state"><div className="empty-icon"><CalendarDays size={25} /></div><h3>No tickets for {viewDate}</h3><p>Waktu di header tetap memakai waktu Jakarta saat ini. Dataset migrasi lama tidak dipaksa terlihat sebagai ticket hari ini.</p>{latestDate && latestDate !== viewDate && <button className="button secondary" onClick={() => setViewDate(latestDate)}>View latest data · {latestDate}</button>}</div>
          )}
        </section>
      </main>

      {showNewTicket && <NewTicketModal masters={masters} operatorId={operatorId} onClose={() => setShowNewTicket(false)} onCreated={addCreated} notify={notify} />}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  )
}
