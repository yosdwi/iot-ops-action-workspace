import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { jakartaDate, jakartaTime } from '../lib/time'

export default function NewTicketModal({ masters, operatorId, onClose, onCreated, notify }) {
  const [siteId, setSiteId] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [issueTypeId, setIssueTypeId] = useState('')
  const [units, setUnits] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!siteId && masters.sites[0]) setSiteId(masters.sites[0].site_id)
    if (!shiftId && masters.shifts[0]) setShiftId(masters.shifts[0].shift_id)
    if (!issueTypeId && masters.issueTypes[0]) setIssueTypeId(masters.issueTypes[0].issue_type_id)
  }, [masters, siteId, shiftId, issueTypeId])

  async function submit(event) {
    event.preventDefault()
    if (!operatorId) return notify('Pilih operator dulu.', 'error')
    const unitList = units.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean)
    if (!unitList.length) return notify('Isi minimal satu Unit No.', 'error')

    setBusy(true)
    const common = {
      p_site_id: siteId,
      p_shift_id: shiftId,
      p_operator_id: operatorId,
      p_issue_type_id: issueTypeId,
      p_issue_description: description.trim() || null,
      p_ticket_date: jakartaDate(),
      p_start_time: jakartaTime(),
    }

    const result = unitList.length === 1
      ? await supabase.rpc('create_ticket', { ...common, p_unit_no: unitList[0] })
      : await supabase.rpc('bulk_create_tickets', { ...common, p_unit_nos: unitList })

    setBusy(false)
    if (result.error) return notify(result.error.message, 'error')

    const created = unitList.length === 1 ? [result.data] : (result.data?.tickets || [])
    onCreated(created)
    notify(`${created.length} ticket dibuat.`, 'success')
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div><div className="eyebrow">Fast entry</div><h2>New Ticket</h2></div>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </header>

        <form className="form-grid" onSubmit={submit}>
          <label>Site<select value={siteId} onChange={(e) => setSiteId(e.target.value)}>{masters.sites.map((x) => <option key={x.site_id} value={x.site_id}>{x.site_code}</option>)}</select></label>
          <label>Shift<select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>{masters.shifts.map((x) => <option key={x.shift_id} value={x.shift_id}>{x.shift_name}</option>)}</select></label>
          <label className="span-2">Issue Type<select value={issueTypeId} onChange={(e) => setIssueTypeId(e.target.value)}>{masters.issueTypes.map((x) => <option key={x.issue_type_id} value={x.issue_type_id}>{x.issue_name}</option>)}</select></label>
          <label className="span-2">Unit No<textarea rows="5" value={units} onChange={(e) => setUnits(e.target.value)} placeholder={'Satu unit per baris.\nContoh:\nDT3714\nFT318\nPM120'} /></label>
          <label className="span-2">Issue Description<textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat issue" /></label>
          <div className="span-2 modal-hint">Date/time otomatis memakai waktu Jakarta saat submit. Banyak Unit No akan dibuat sebagai bulk ticket.</div>
          <div className="span-2 modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy && <Loader2 className="spin" size={16} />} Create ticket</button></div>
        </form>
      </section>
    </div>
  )
}
