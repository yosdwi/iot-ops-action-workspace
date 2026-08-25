import { Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import SearchableSelect from './SearchableSelect'
import HybridLookup from './HybridLookup'
import { displayTime } from '../lib/time'

const PAGE_SIZES = [25, 50, 100]

export default function TicketTable({
  tickets,
  masters,
  suggestions,
  selected,
  onToggle,
  onToggleAll,
  onLocalPatch,
  onSaveAction,
  onSaveContext,
  onSolve,
  onReopen,
}) {
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize))

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return tickets.slice(start, start + pageSize)
  }, [tickets, page, pageSize])

  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(row.ticket_id))
  const rangeStart = tickets.length ? (page - 1) * pageSize + 1 : 0
  const rangeEnd = Math.min(page * pageSize, tickets.length)

  function changePageSize(value) {
    setPageSize(Number(value))
    setPage(1)
  }

  return (
    <div className="table-panel">
      <div className="table-shell">
        <table className="ticket-table ticket-table-v2">
          <thead>
            <tr>
              <th className="checkbox-cell"><input type="checkbox" checked={allSelected} onChange={(e) => onToggleAll(e.target.checked, pageRows)} /></th>
              <th>Date / Ticket</th><th>Unit</th><th>Site</th><th>Shift</th><th>Issue</th><th>Description</th><th>Responder</th><th>Action Type</th><th>Corrective Action</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const solved = row.status_id === 'STATUS-SOLVED' || row.is_completed
              const unitsForSite = masters.units.filter((item) => !row.site_id || item.site_id === row.site_id).map((item) => item.unit_no)
              const activityEnd = row.activity_end_at ? displayJakartaClock(row.activity_end_at) : ''
              return (
                <tr key={row.ticket_id} className={row._saving ? 'row-saving' : ''}>
                  <td data-label="Select" className="checkbox-cell"><input type="checkbox" checked={selected.has(row.ticket_id)} onChange={() => onToggle(row.ticket_id)} /></td>
                  <td data-label="Ticket"><div className="strong">{row.ticket_date} · {displayTime(row.start_time)}{activityEnd ? ` → ${activityEnd}` : ''}</div><div className="mono muted">{row.ticket_number}</div></td>
                  <td data-label="Unit">
                    {solved ? <span className="unit-chip">{row.unit_no || '—'}</span> : <HybridLookup value={row.unit_no || ''} suggestions={unitsForSite} placeholder="Unit" onChange={(value) => onLocalPatch(row.ticket_id, { unit_no: value })} onCommit={(value) => onSaveContext({ ...row, unit_no: value }, { unit_no: value })} className="table-hybrid unit-lookup" />}
                  </td>
                  <td data-label="Site">
                    {solved ? row.site_code || '—' : <SearchableSelect value={row.site_id || ''} onChange={(value) => onSaveContext(row, { site_id: value || null })} options={masters.sites} getValue={(x) => x.site_id} getLabel={(x) => x.site_code} placeholder="Site" clearable={false} className="table-lookup" />}
                  </td>
                  <td data-label="Shift">
                    {solved ? row.shift_name || '—' : <SearchableSelect value={row.shift_id || ''} onChange={(value) => onSaveContext(row, { shift_id: value || null })} options={masters.shifts} getValue={(x) => x.shift_id} getLabel={(x) => x.shift_name} placeholder="Shift" clearable={false} className="table-lookup" />}
                  </td>
                  <td data-label="Issue">
                    {solved ? <div className="strong compact-text">{row.issue_name || '—'}</div> : <SearchableSelect value={row.issue_type_id || ''} onChange={(value) => onSaveContext(row, { issue_type_id: value || null })} options={masters.issueTypes} getValue={(x) => x.issue_type_id} getLabel={(x) => x.issue_name} placeholder="Issue" clearable={false} className="table-lookup issue-lookup" />}
                  </td>
                  <td data-label="Description">
                    {solved ? <div className="description-cell" title={row.issue_description || ''}>{row.issue_description || '—'}</div> : <HybridLookup value={row.issue_description || ''} suggestions={suggestions.issueDescriptions} placeholder="Description" onChange={(value) => onLocalPatch(row.ticket_id, { issue_description: value })} onCommit={(value) => onSaveContext({ ...row, issue_description: value }, { issue_description: value })} className="table-hybrid description-lookup" />}
                  </td>
                  <td data-label="Responder">
                    {solved ? row.first_responder_name || '—' : <SearchableSelect value={row.first_responder_id || ''} onChange={(value) => onSaveContext(row, { first_responder_id: value || null })} options={masters.people} getValue={(x) => x.person_id} getLabel={(x) => x.display_name} placeholder="Responder" clearable={false} className="table-lookup responder-lookup" />}
                  </td>
                  <td data-label="Action Type">
                    {solved ? <span>{row.action_name || '—'}</span> : <SearchableSelect value={row.action_type_id || ''} onChange={(value) => onSaveAction(row, { action_type_id: value || null })} options={masters.actionTypes} getValue={(x) => x.action_type_id} getLabel={(x) => x.action_name} placeholder="Action type" clearable className="table-lookup action-lookup" />}
                  </td>
                  <td data-label="Corrective Action">
                    {solved ? <div className="description-cell" title={row.corrective_action_blocker || ''}>{row.corrective_action_blocker || '—'}</div> : <HybridLookup value={row.corrective_action_blocker || ''} suggestions={suggestions.correctiveActions} placeholder="Corrective / blocker" onChange={(value) => onLocalPatch(row.ticket_id, { corrective_action_blocker: value })} onCommit={(value) => onSaveAction({ ...row, corrective_action_blocker: value }, { corrective_action_blocker: value })} className="table-hybrid corrective-lookup" />}
                  </td>
                  <td data-label="Status"><span className={`status-chip ${solved ? 'solved' : 'open'}`}>{solved ? 'Closed' : 'Open'}</span>{row._saving && <div className="saving-label">Saving…</div>}</td>
                  <td data-label="Action" className="row-action-cell">
                    {solved ? <button className="mini-button ghost" onClick={() => onReopen(row)} disabled={row._saving}><RotateCcw size={14} /> Reopen</button> : <button className="mini-button solve" onClick={() => onSolve(row)} disabled={row._saving}><Check size={14} /> Close</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <footer className="table-pagination">
        <div className="pagination-range">{rangeStart}–{rangeEnd} of {tickets.length}</div>
        <div className="pagination-controls">
          <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={15} /></button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight size={15} /></button>
        </div>
        <label className="page-size-control"><span>Rows</span><select value={pageSize} onChange={(e) => changePageSize(e.target.value)}>{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      </footer>
    </div>
  )
}

function displayJakartaClock(value) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}
