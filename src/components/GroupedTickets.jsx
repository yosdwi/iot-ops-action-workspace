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
              const solved = row.status_id === 'STATUS-SOLVED' || row.is_completed
              return (
                <article className={`ticket-card-row ${row._saving ? 'row-saving' : ''}`} key={row.ticket_id}>
                  <input type="checkbox" checked={selected.has(row.ticket_id)} onChange={() => onToggle(row.ticket_id)} />
                  <div className="ticket-card-main">
                    <div className="ticket-card-title"><strong>{row.ticket_number}</strong><span className={`status-chip ${solved ? 'solved' : 'open'}`}>{solved ? 'Closed' : 'Open'}</span></div>
                    <div className="ticket-card-meta"><span>{row.ticket_date} · {displayTime(row.start_time)}</span><span>{row.site_code || '—'} · {row.unit_no || '—'}</span><span>{row.first_responder_name || '—'}</span></div>
                    <div className="ticket-card-issue"><strong>{row.issue_name || '—'}</strong><span>{row.issue_description || 'No description'}</span></div>
                  </div>
                  <div className="ticket-card-action">
                    {solved ? <div className="readonly-action"><strong>{row.action_name || 'No action'}</strong><span>{row.corrective_action_blocker || '—'}</span></div> : <>
                      <SearchableSelect value={row.action_type_id || ''} onChange={(value) => onSave(row, { action_type_id: value || null })} options={actionTypes} getValue={(x) => x.action_type_id} getLabel={(x) => x.action_name} placeholder="Action type" clearable className="compact-lookup" />
                      <HybridLookup value={row.corrective_action_blocker || ''} onChange={(value) => onLocalPatch(row.ticket_id, { corrective_action_blocker: value })} onCommit={(value) => onSave({ ...row, corrective_action_blocker: value }, { corrective_action_blocker: value })} suggestions={correctiveSuggestions} placeholder="Corrective / blocker" />
                    </>}
                  </div>
                  <div className="ticket-card-cta">{solved ? <button className="mini-button ghost" onClick={() => onReopen(row)}><RotateCcw size={14} /> Reopen</button> : <button className="mini-button solve" onClick={() => onSolve(row)}><Check size={14} /> Close</button>}</div>
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
    let key = ''
    let label = ''
    if (groupBy === 'site') { key = row.site_id || 'none'; label = row.site_code || 'No site' }
    else if (groupBy === 'responder') { key = row.first_responder_id || 'none'; label = row.first_responder_name || 'No responder' }
    else if (groupBy === 'issue') { key = row.issue_type_id || 'none'; label = row.issue_name || 'No issue type' }
    else { key = row.status_id || 'none'; label = row.status_id === 'STATUS-SOLVED' || row.is_completed ? 'Closed' : (row.status_name || 'Open') }
    if (!map.has(key)) map.set(key, { key, label, rows: [] })
    map.get(key).rows.push(row)
  }
  return [...map.values()].sort((a, b) => {
    if (groupBy === 'status') {
      if (a.key === 'STATUS-OPEN') return -1
      if (b.key === 'STATUS-OPEN') return 1
    }
    return a.label.localeCompare(b.label)
  })
}
