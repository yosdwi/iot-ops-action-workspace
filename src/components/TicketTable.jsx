import { Check, RotateCcw } from 'lucide-react'
import { displayTime } from '../lib/time'

export default function TicketTable({ tickets, actionTypes, selected, onToggle, onToggleAll, onLocalCorrective, onSave, onSolve, onReopen }) {
  const allSelected = tickets.length > 0 && tickets.every((row) => selected.has(row.ticket_id))

  return (
    <div className="table-shell">
      <table className="ticket-table">
        <thead>
          <tr>
            <th className="checkbox-cell"><input type="checkbox" checked={allSelected} onChange={(e) => onToggleAll(e.target.checked)} /></th>
            <th>Time / Ticket</th><th>Unit</th><th>Site</th><th>Issue</th><th>Description</th><th>Responder</th><th>Action Type</th><th>Corrective Action</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((row) => {
            const solved = row.status_id === 'STATUS-SOLVED' || row.is_completed
            return (
              <tr key={row.ticket_id} className={row._saving ? 'row-saving' : ''}>
                <td data-label="Select" className="checkbox-cell"><input type="checkbox" checked={selected.has(row.ticket_id)} onChange={() => onToggle(row.ticket_id)} /></td>
                <td data-label="Ticket"><div className="strong">{displayTime(row.start_time)}</div><div className="mono muted">{row.ticket_number}</div></td>
                <td data-label="Unit"><span className="unit-chip">{row.unit_no || '—'}</span></td>
                <td data-label="Site">{row.site_code || '—'}</td>
                <td data-label="Issue"><div className="strong compact-text">{row.issue_name || '—'}</div></td>
                <td data-label="Description"><div className="description-cell" title={row.issue_description || ''}>{row.issue_description || '—'}</div></td>
                <td data-label="Responder">{row.first_responder_name || '—'}</td>
                <td data-label="Action Type">
                  <select className="inline-select" value={row.action_type_id || ''} onChange={(e) => onSave(row, { action_type_id: e.target.value || null })} disabled={row._saving}>
                    <option value="">Select action</option>
                    {actionTypes.map((item) => <option key={item.action_type_id} value={item.action_type_id}>{item.action_name}</option>)}
                  </select>
                </td>
                <td data-label="Corrective Action">
                  <input className="inline-input" value={row.corrective_action_blocker || ''} placeholder="Type action / blocker" onChange={(e) => onLocalCorrective(row.ticket_id, e.target.value)} onBlur={() => onSave(row, { corrective_action_blocker: row.corrective_action_blocker || '' })} disabled={row._saving} />
                </td>
                <td data-label="Status"><span className={`status-chip ${solved ? 'solved' : 'open'}`}>{solved ? 'Solved' : 'Open'}</span>{row._saving && <div className="saving-label">Saving…</div>}</td>
                <td data-label="Action" className="row-action-cell">
                  {solved ? <button className="mini-button ghost" onClick={() => onReopen(row)} disabled={row._saving}><RotateCcw size={14} /> Reopen</button> : <button className="mini-button solve" onClick={() => onSolve(row)} disabled={row._saving}><Check size={14} /> Solve</button>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
