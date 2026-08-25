import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, Check, Database, LayoutDashboard, ListChecks, Loader2, LogOut, Plus, RefreshCw, Rows3, Search, Settings2, Sparkles, Table2, Users } from 'lucide-react'
import LoginScreen from './components/LoginScreen'
import NewTicketModal from './components/NewTicketModal'
import TicketTable from './components/TicketTable'
import GroupedTickets from './components/GroupedTickets'
import SearchableSelect from './components/SearchableSelect'
import MasterData from './components/MasterData'
import { supabase } from './lib/supabase'
import { jakartaDate } from './lib/time'

const EMPTY_MASTERS = {
  sites: [], shifts: [], people: [], issueTypes: [], actionTypes: [], statuses: [], units: [],
  issueDescriptions: [], correctiveActions: [], presets: [],
}
const EMPTY_SUGGESTIONS = { issueDescriptions: [], correctiveActions: [] }
const GROUP_OPTIONS = [
  { value: 'ticket', label: 'Ticket Number' },
  { value: 'unit', label: 'Unit' },
  { value: 'date', label: 'Date' },
  { value: 'site', label: 'Site' },
  { value: 'shift', label: 'Shift' },
  { value: 'issue', label: 'Issue Type' },
  { value: 'description', label: 'Issue Description' },
  { value: 'responder', label: 'Responder' },
  { value: 'action', label: 'Action Type' },
  { value: 'corrective', label: 'Corrective Action' },
  { value: 'status', label: 'Status' },
]

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
  const today = jakartaDate()
  const [activePage, setActivePage] = useState('ticketing')
  const [masters, setMasters] = useState(EMPTY_MASTERS)
  const [suggestions, setSuggestions] = useState(EMPTY_SUGGESTIONS)
  const [operatorId, setOperatorId] = useState(() => localStorage.getItem('iot-ops-operator') || '')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [latestDate, setLatestDate] = useState('')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [issueFilter, setIssueFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [responderFilter, setResponderFilter] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [toast, setToast] = useState(null)
  const [viewMode, setViewMode] = useState('table')
  const [groupBy, setGroupBy] = useState('status')

  useEffect(() => { loadMasters() }, [])

  useEffect(() => {
    if (activePage === 'ticketing') loadTickets()
  }, [activePage, dateFrom, dateTo, siteFilter, shiftFilter, issueFilter, statusFilter, responderFilter])

  async function loadMasters() {
    const queries = await Promise.all([
      supabase.from('sites').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('shifts').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('people').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('issue_types').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('action_types').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('statuses').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('units').select('unit_id,unit_no,site_id,device_id,device_ip,unit_type').eq('is_active', true).order('unit_no').limit(10000),
      supabase.from('issue_descriptions').select('*').eq('is_active', true).order('sort_order').order('description').limit(2000),
      supabase.from('corrective_actions').select('*').eq('is_active', true).order('sort_order').order('corrective_action').limit(2000),
      supabase.from('ticket_presets').select('*').eq('is_active', true).order('sort_order').order('preset_name').limit(500),
    ])
    const firstError = queries.find((x) => x.error)?.error
    if (firstError) return notify(firstError.message, 'error')

    const sites = queries[0].data || []
    const shifts = queries[1].data || []
    const people = queries[2].data || []
    const issueTypes = queries[3].data || []
    const actionTypes = queries[4].data || []
    const statuses = queries[5].data || []
    const units = queries[6].data || []
    const issueDescriptions = queries[7].data || []
    const correctiveActions = queries[8].data || []
    const issueMap = new Map(issueTypes.map((item) => [item.issue_type_id, item]))
    const descriptionMap = new Map(issueDescriptions.map((item) => [item.description_id, item]))
    const presets = (queries[9].data || []).map((item) => ({
      ...item,
      issue_name: issueMap.get(item.issue_type_id)?.issue_name || 'Unknown issue',
      issue_description: descriptionMap.get(item.issue_description_id)?.description || '',
    }))

    setMasters({ sites, shifts, people, issueTypes, actionTypes, statuses, units, issueDescriptions, correctiveActions, presets })
    setSuggestions({
      issueDescriptions: issueDescriptions.map((item) => item.description),
      correctiveActions: correctiveActions.map((item) => item.corrective_action),
    })
  }

  async function loadTickets() {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    setSelected(new Set())
    let query = supabase
      .from('ticket_workspace')
      .select('*')
      .gte('ticket_date', dateFrom)
      .lte('ticket_date', dateTo)
      .eq('is_archived', false)
      .order('ticket_date', { ascending: false })
      .order('start_time', { ascending: false, nullsFirst: false })
      .limit(3000)

    if (siteFilter) query = query.eq('site_id', siteFilter)
    if (shiftFilter) query = query.eq('shift_id', shiftFilter)
    if (issueFilter) query = query.eq('issue_type_id', issueFilter)
    if (statusFilter) query = query.eq('status_id', statusFilter)
    if (responderFilter) query = query.eq('first_responder_id', responderFilter)

    const { data, error } = await query
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

  function localPatchTicket(ticketId, patch) {
    setTickets((rows) => rows.map((row) => row.ticket_id === ticketId ? { ...row, ...patch } : row))
  }

  function optimisticContextPatch(patch) {
    const next = { ...patch }
    if ('site_id' in patch) next.site_code = masters.sites.find((x) => x.site_id === patch.site_id)?.site_code || null
    if ('shift_id' in patch) next.shift_name = masters.shifts.find((x) => x.shift_id === patch.shift_id)?.shift_name || null
    if ('issue_type_id' in patch) next.issue_name = masters.issueTypes.find((x) => x.issue_type_id === patch.issue_type_id)?.issue_name || null
    if ('first_responder_id' in patch) next.first_responder_name = masters.people.find((x) => x.person_id === patch.first_responder_id)?.display_name || null
    return next
  }

  async function saveTicketContext(row, patch) {
    if (!operatorId) return notify('Pilih operator IoT Ops dulu.', 'error')
    const before = { ...row }
    const optimistic = { ...row, ...optimisticContextPatch(patch), _saving: true }
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? optimistic : item))
    const { data, error } = await supabase.rpc('update_ticket_context', { p_ticket_id: row.ticket_id, p_operator_id: operatorId, p_patch: patch })
    if (error) {
      setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? before : item))
      return notify(error.message, 'error')
    }
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? { ...data, _saving: false } : item))
  }

  async function saveTicketAction(row, patch = {}, closeTicket = false) {
    if (!operatorId) return notify('Pilih operator IoT Ops dulu.', 'error')
    const before = { ...row }
    const actionName = 'action_type_id' in patch ? masters.actionTypes.find((x) => x.action_type_id === patch.action_type_id)?.action_name || null : row.action_name
    const optimistic = {
      ...row,
      ...patch,
      ...('action_type_id' in patch ? { action_name: actionName } : {}),
      ...(closeTicket ? { status_id: 'STATUS-SOLVED', status_name: 'Closed', is_completed: true, closed_at: new Date().toISOString() } : {}),
      _saving: true,
    }
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? optimistic : item))

    const { data, error } = await supabase.rpc('save_ticket_action', {
      p_ticket_id: row.ticket_id,
      p_operator_id: operatorId,
      p_action_type_id: patch.action_type_id !== undefined ? patch.action_type_id : (row.action_type_id || null),
      p_corrective_action: patch.corrective_action_blocker !== undefined ? patch.corrective_action_blocker : (row.corrective_action_blocker || null),
      p_solve: closeTicket,
    })

    if (error) {
      setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? before : item))
      return notify(error.message, 'error')
    }
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? { ...data, status_name: data?.status_id === 'STATUS-SOLVED' ? 'Closed' : data?.status_name, _saving: false } : item))
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
    setTickets((rows) => rows.map((item) => item.ticket_id === row.ticket_id ? { ...data, status_name: 'Open' } : item))
  }

  async function bulkApply(actionType = null, closeTickets = false) {
    const ids = [...selected]
    if (!ids.length) return notify('Pilih ticket dulu.', 'error')
    if (!operatorId) return notify('Pilih operator IoT Ops dulu.', 'error')
    const snapshot = new Map(tickets.filter((x) => selected.has(x.ticket_id)).map((x) => [x.ticket_id, x]))
    setTickets((rows) => rows.map((row) => selected.has(row.ticket_id) ? {
      ...row,
      ...(actionType ? { action_type_id: actionType.action_type_id, action_name: actionType.action_name } : {}),
      ...(closeTickets ? { status_id: 'STATUS-SOLVED', status_name: 'Closed', is_completed: true, closed_at: new Date().toISOString() } : {}),
      _saving: true,
    } : row))

    const { data, error } = await supabase.rpc('bulk_apply_ticket_action', {
      p_ticket_ids: ids,
      p_operator_id: operatorId,
      p_action_type_id: actionType?.action_type_id || null,
      p_corrective_action: null,
      p_solve: closeTickets,
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
    const rowsForView = createdRows.filter((row) => row.ticket_date >= dateFrom && row.ticket_date <= dateTo)
    if (rowsForView.length) setTickets((rows) => [...rowsForView, ...rows])
  }

  function setRange(kind) {
    const base = jakartaDate()
    if (kind === 'today') { setDateFrom(base); setDateTo(base); return }
    if (kind === 'yesterday') { const value = shiftIsoDate(base, -1); setDateFrom(value); setDateTo(value); return }
    const days = kind === '7d' ? 6 : 29
    setDateFrom(shiftIsoDate(base, -days))
    setDateTo(base)
  }

  const filteredTickets = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return tickets
    return tickets.filter((row) => [row.ticket_number, row.unit_no, row.issue_description, row.issue_name, row.first_responder_name, row.action_name, row.corrective_action_blocker, row.site_code].some((value) => String(value || '').toLowerCase().includes(needle)))
  }, [tickets, search])

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((x) => x.status_id === 'STATUS-OPEN').length,
    closed: tickets.filter((x) => x.status_id === 'STATUS-SOLVED').length,
  }), [tickets])

  const quickActions = ['FU IT Site', 'Pengecekan Data', 'Validasi ulang', 'Requested Action']
    .map((name) => masters.actionTypes.find((item) => item.action_name?.toLowerCase() === name.toLowerCase()))
    .filter(Boolean)

  const accountName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Google user'
  const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark small"><Activity size={20} /></div><div><strong>IoT Ops</strong><span>Action Workspace</span></div></div>
        <nav>
          <button className={`nav-item ${activePage === 'ticketing' ? 'active' : ''}`} onClick={() => setActivePage('ticketing')}><ListChecks size={18} /> Ticketing</button>
          <button className="nav-item" disabled><LayoutDashboard size={18} /> Dashboard <span className="soon">next</span></button>
          <button className={`nav-item ${activePage === 'master' ? 'active' : ''}`} onClick={() => setActivePage('master')}><Settings2 size={18} /> Master Data</button>
          <button className="nav-item" disabled><Database size={18} /> Archive <span className="soon">next</span></button>
        </nav>
        <div className="account-footer">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <div className="account-avatar">{accountName.slice(0, 1).toUpperCase()}</div>}
          <div className="account-copy"><strong>{accountName}</strong><span>{session.user.email}</span></div>
          <button className="account-logout" title="Logout" onClick={() => supabase.auth.signOut()}><LogOut size={15} /></button>
        </div>
      </aside>

      <main className={`workspace ${activePage === 'master' ? 'master-workspace' : ''}`}>
        {activePage === 'master' ? (
          <MasterData notify={notify} onChanged={loadMasters} />
        ) : (
          <>
            <header className="topbar">
              <div><div className="eyebrow">Operational workspace</div><h1>Ticket Action</h1></div>
              <div className="topbar-actions">
                <label className="operator-picker"><Users size={16} /><select value={operatorId} onChange={(e) => chooseOperator(e.target.value)}><option value="">Select operator</option>{masters.people.map((item) => <option key={item.person_id} value={item.person_id}>{item.display_name}</option>)}</select></label>
                <button className="button primary" onClick={() => setShowNewTicket(true)}><Plus size={17} /> New Ticket</button>
              </div>
            </header>

            {!operatorId && <div className="notice"><Sparkles size={17} /><div><strong>Pilih operator sebelum action.</strong><span>Google login memberi akses; operator menentukan siapa yang tercatat melakukan update.</span></div></div>}

            <section className="stat-grid">
              <div className="stat-card"><span>Tickets in range</span><strong>{stats.total}</strong></div>
              <div className="stat-card"><span>Open</span><strong>{stats.open}</strong></div>
              <div className="stat-card"><span>Closed</span><strong>{stats.closed}</strong></div>
              <div className="stat-card accent"><span>Selected</span><strong>{selected.size}</strong></div>
            </section>

            <section className="controls-card controls-v2">
              <div className="range-row">
                <div className="date-range"><CalendarDays size={16} /><label><span>From</span><input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} /></label><span className="range-arrow">→</span><label><span>To</span><input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} /></label></div>
                <div className="range-shortcuts"><button onClick={() => setRange('today')}>Today</button><button onClick={() => setRange('yesterday')}>Yesterday</button><button onClick={() => setRange('7d')}>7 Days</button><button onClick={() => setRange('30d')}>30 Days</button></div>
                <label className="search-box"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket, unit, description, responder…" /></label>
              </div>
              <div className="filter-row filter-row-v2">
                <SearchableSelect value={siteFilter} onChange={setSiteFilter} options={masters.sites} getValue={(x) => x.site_id} getLabel={(x) => x.site_code} placeholder="All sites" className="filter-lookup" />
                <SearchableSelect value={shiftFilter} onChange={setShiftFilter} options={masters.shifts} getValue={(x) => x.shift_id} getLabel={(x) => x.shift_name} placeholder="All shifts" className="filter-lookup" />
                <SearchableSelect value={issueFilter} onChange={setIssueFilter} options={masters.issueTypes} getValue={(x) => x.issue_type_id} getLabel={(x) => x.issue_name} placeholder="All issues" className="filter-lookup wide-filter" />
                <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={masters.statuses} getValue={(x) => x.status_id} getLabel={(x) => x.status_name} placeholder="All status" className="filter-lookup" />
                <SearchableSelect value={responderFilter} onChange={setResponderFilter} options={masters.people} getValue={(x) => x.person_id} getLabel={(x) => x.display_name} placeholder="All responders" className="filter-lookup wide-filter" />
              </div>

              <div className="quick-row">
                <span className="quick-label">Quick action</span>
                {quickActions.map((action) => <button key={action.action_type_id} className="quick-button" onClick={() => bulkApply(action, false)} disabled={!selected.size}>{action.action_name}</button>)}
                <div className="quick-spacer" />
                <button className="button solve-bulk compact" onClick={() => bulkApply(null, true)} disabled={!selected.size}><Check size={15} /> Close selected</button>
              </div>
            </section>

            <section className="content-card">
              <div className="content-heading content-heading-v2">
                <div className="view-tools">
                  <div className="segmented"><button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}><Table2 size={15} /> Table</button><button className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')}><Rows3 size={15} /> Grouped</button></div>
                  {viewMode === 'grouped' && <SearchableSelect value={groupBy} onChange={setGroupBy} options={GROUP_OPTIONS} placeholder="Group by" clearable={false} className="group-by-lookup" />}
                </div>
                <button className="text-button refresh-button" onClick={loadTickets}><RefreshCw size={14} /> Refresh</button>
              </div>

              {loading ? <div className="table-loading"><Loader2 className="spin" /><span>Loading work queue…</span></div> : filteredTickets.length ? (
                viewMode === 'table' ? <TicketTable
                  tickets={filteredTickets}
                  masters={masters}
                  suggestions={suggestions}
                  selected={selected}
                  onToggle={(id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })}
                  onToggleAll={(checked, rows = filteredTickets) => setSelected((current) => {
                    const next = new Set(current)
                    for (const row of rows) checked ? next.add(row.ticket_id) : next.delete(row.ticket_id)
                    return next
                  })}
                  onLocalPatch={localPatchTicket}
                  onSaveAction={saveTicketAction}
                  onSaveContext={saveTicketContext}
                  onSolve={(row) => saveTicketAction(row, {}, true)}
                  onReopen={reopenTicket}
                /> : <GroupedTickets
                  tickets={filteredTickets}
                  groupBy={groupBy}
                  actionTypes={masters.actionTypes}
                  correctiveSuggestions={suggestions.correctiveActions}
                  selected={selected}
                  onToggle={(id) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })}
                  onSave={saveTicketAction}
                  onSolve={(row) => saveTicketAction(row, {}, true)}
                  onReopen={reopenTicket}
                  onLocalPatch={localPatchTicket}
                />
              ) : (
                <div className="empty-state"><div className="empty-icon"><CalendarDays size={25} /></div><h3>No tickets in this range</h3><p>Ubah date range atau filter untuk melihat data lain.</p>{latestDate && <button className="button secondary" onClick={() => { setDateFrom(latestDate); setDateTo(latestDate) }}>View latest data · {latestDate}</button>}</div>
              )}
              {!loading && filteredTickets.length > 0 && <div className="result-footer">Showing {filteredTickets.length} tickets{tickets.length >= 3000 ? ' · range capped at 3,000 rows' : ''}</div>}
            </section>
          </>
        )}
      </main>

      {showNewTicket && <NewTicketModal masters={masters} suggestions={suggestions} operatorId={operatorId} onClose={() => setShowNewTicket(false)} onCreated={addCreated} notify={notify} />}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  )
}

function shiftIsoDate(value, deltaDays) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}
