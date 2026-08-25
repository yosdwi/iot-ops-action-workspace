import { Check, RotateCcw } from 'lucide-react'
import SearchableSelect from './SearchableSelect'
import HybridLookup from './HybridLookup'
import { displayTime } from '../lib/time'

export default function GroupedTickets({ tickets, groupBy, actionTypes, correctiveSuggestions, selected, onToggle, onSave, onSolve, onReopen, onLocalPatch }) {
  const groups = buildGroups(tickets, groupBy)
  return (
    <div className="grouped-view">
      {groups.map((group) => (
        <section className="ticket-group" key={group.key}>
          <header><div><strong>{group.label}</strong><span>{group.rows.length} tickets</span></div></header>
          <div className="group-card-list">
            {group.rows.map((row) => {
              const closed = row.status_id === 'STATUS-SOLVED' || row.is_completed
              return (
                <article className={`ticket-card-row ${row._saving ? 'row-saving' : ''}`} key={row.ticket_id}>
                  <input type="checkbox" checked={selected.has(row.ticket_id)} onChange={() => onToggle(row.ticket_id)} />
                  <div className="ticket-card-main">
                    <div className="ticket-card-title"><strong>{row.ticket_number}</strong><span className={`status-chip ${closed ? 'solved' : 'open'}`}>{closed ? 'Closed' : 'Open'}</span></div>
                    <div className="ticket-card-meta"><span>{row.ticket_date} · {displayTime(row.start_time)}</span><span>{row.site_code || '—'} · {row.unit_no || '—'}</span><span>{row.first_responder_name || '—'}</span></div>
                    <div className="ticket-card-issue"><strong>{row.issue_name || '—'}</strong><span>{row.issue_description || 'No description'}</span></div>
                  </div>
                  <div className="ticket-card-action">
                    {closed ? <div className="readonly-action"><strong>{row.action_name || 'No action'}</strong><span>{row.corrective_action_blocker || '—'}</span></div> : <>
                      <SearchableSelect value={row.action_type_id || ''} onChange={(value) => onSave(row, { action_type_id: value || null })} options={actionTypes} getValue={(x) => x.action_type_id} getLabel={(x) => x.action_name} placeholder="Action type" clearable className="compact-lookup" />
                      <HybridLookup value={row.corrective_action_blocker || ''} onChange={(value) => onLocalPatch(row.ticket_id, { corrective_action_blocker: value })} onCommit={(value) => onSave({ ...row, corrective_action_blocker: value }, { corrective_action_blocker: value })} suggestions={correctiveSuggestions} placeholder="Corrective / blocker" />
                    </>}
                  </div>
                  <div className="ticket-card-cta">{closed ? <button className="mini-button ghost" onClick={() => onReopen(row)}><RotateCcw size={14} /> Reopen</button> : <button className="mini-button solve" onClick={() => onSolve(row)}><Check size={14} /> Close</button>}</div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function buildGroups(tickets, groupBy) {
  const map = new Map()
  for (const row of tickets) {
    const { key, label } = groupValue(row, groupBy)
    if (!map.has(key)) map.set(key, { key, label, rows: [] })
    map.get(key).rows.push(row)
  }

  return [...map.values()].sort((a, b) => {
    if (groupBy === 'status') {
      if (a.key === 'STATUS-OPEN') return -1
      if (b.key === 'STATUS-OPEN') return 1
    }
    if (groupBy === 'date') return String(b.key).localeCompare(String(a.key))
    return String(a.label).localeCompare(String(b.label), undefined, { numeric: true, sensitivity: 'base' })
  })
}

function groupValue(row, groupBy) {
  if (groupBy === 'ticket') return { key: row.ticket_id || row.ticket_number, label: row.ticket_number || 'No ticket number' }
  if (groupBy === 'unit') return { key: row.unit_id || row.unit_no || 'none', label: row.unit_no || 'No unit' }
  if (groupBy === 'date') return { key: row.ticket_date || 'none', label: row.ticket_date || 'No date' }
  if (groupBy === 'site') return { key: row.site_id || 'none', label: row.site_code || 'No site' }
  if (groupBy === 'shift') return { key: row.shift_id || 'none', label: row.shift_name || 'No shift' }
  if (groupBy === 'issue') return { key: row.issue_type_id || 'none', label: row.issue_name || 'No issue type' }
  if (groupBy === 'description') return { key: row.issue_description || 'none', label: row.issue_description || 'No description' }
  if (groupBy === 'responder') return { key: row.first_responder_id || 'none', label: row.first_responder_name || 'No responder' }
  if (groupBy === 'action') return { key: row.action_type_id || 'none', label: row.action_name || 'No action type' }
  if (groupBy === 'corrective') return { key: row.corrective_action_blocker || 'none', label: row.corrective_action_blocker || 'No corrective action' }
  const closed = row.status_id === 'STATUS-SOLVED' || row.is_completed
  return { key: closed ? 'STATUS-SOLVED' : 'STATUS-OPEN', label: closed ? 'Closed' : 'Open' }
}
