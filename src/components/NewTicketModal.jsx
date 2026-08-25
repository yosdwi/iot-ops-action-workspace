import { Loader2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { jakartaDate, jakartaDateTimeLabel, jakartaTime } from '../lib/time'
import SearchableSelect from './SearchableSelect'
import HybridLookup from './HybridLookup'
import MultiUnitLookup from './MultiUnitLookup'

export default function NewTicketModal({ masters, suggestions, operatorId, onClose, onCreated, notify }) {
  const [siteId, setSiteId] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [responderId, setResponderId] = useState(operatorId || '')
  const [issueTypeId, setIssueTypeId] = useState('')
  const [units, setUnits] = useState([])
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!siteId && masters.sites[0]) setSiteId(masters.sites[0].site_id)
    if (!shiftId && masters.shifts[0]) setShiftId(masters.shifts[0].shift_id)
    if (!issueTypeId && masters.issueTypes[0]) setIssueTypeId(masters.issueTypes[0].issue_type_id)
    if (!responderId && operatorId) setResponderId(operatorId)
  }, [masters, siteId, shiftId, issueTypeId, responderId, operatorId])

  const siteUnits = useMemo(() => masters.units.filter((item) => !siteId || item.site_id === siteId), [masters.units, siteId])

  async function submit(event) {
    event.preventDefault()
    if (!operatorId) return notify('Pilih operator dulu.', 'error')
    if (!responderId) return notify('Pilih First Responder.', 'error')
    if (!siteId || !shiftId || !issueTypeId) return notify('Site, Shift, dan Issue Type wajib dipilih.', 'error')
    if (!units.length) return notify('Isi minimal satu Unit No.', 'error')

    setBusy(true)
    const common = {
      p_site_id: siteId,
      p_shift_id: shiftId,
      p_operator_id: operatorId,
      p_first_responder_id: responderId,
      p_issue_type_id: issueTypeId,
      p_issue_description: description.trim() || null,
      p_ticket_date: jakartaDate(),
      p_start_time: jakartaTime(),
    }

    const result = units.length === 1
      ? await supabase.rpc('create_ticket_v2', { ...common, p_unit_no: units[0] })
      : await supabase.rpc('bulk_create_tickets_v2', { ...common, p_unit_nos: units })

    setBusy(false)
    if (result.error) return notify(result.error.message, 'error')

    const created = units.length === 1 ? [result.data] : (result.data?.tickets || [])
    onCreated(created)
    notify(`${created.length} ticket dibuat.`, 'success')
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card modal-card-v2" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div><div className="eyebrow">Fast entry</div><h2>New Ticket</h2><div className="modal-live-time">{jakartaDateTimeLabel(now)} WIB</div></div>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </header>

        <form className="form-grid form-grid-v2" onSubmit={submit}>
          <label>Site<SearchableSelect value={siteId} onChange={(value) => { setSiteId(value); setUnits([]) }} options={masters.sites} getValue={(x) => x.site_id} getLabel={(x) => x.site_code} placeholder="Search site" clearable={false} /></label>
          <label>Shift<SearchableSelect value={shiftId} onChange={setShiftId} options={masters.shifts} getValue={(x) => x.shift_id} getLabel={(x) => x.shift_name} placeholder="Search shift" clearable={false} /></label>
          <label>First Responder<SearchableSelect value={responderId} onChange={setResponderId} options={masters.people} getValue={(x) => x.person_id} getLabel={(x) => x.display_name} placeholder="Search responder" clearable={false} /></label>
          <label>Issue Type<SearchableSelect value={issueTypeId} onChange={setIssueTypeId} options={masters.issueTypes} getValue={(x) => x.issue_type_id} getLabel={(x) => x.issue_name} placeholder="Search issue type" clearable={false} /></label>
          <label className="span-2">Unit No<MultiUnitLookup values={units} onChange={setUnits} options={siteUnits} siteId={siteId} /></label>
          <label className="span-2">Issue Description<HybridLookup value={description} onChange={setDescription} suggestions={suggestions.issueDescriptions} placeholder="Search existing description or type a new one…" /></label>
          <div className="span-2 modal-hint"><strong>{units.length || 0} unit selected.</strong> Satu unit = satu ticket. Kamu bisa search, pilih satu-satu, ketik unit baru, atau paste banyak unit sekaligus.</div>
          <div className="span-2 modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy && <Loader2 className="spin" size={16} />} Create {units.length > 1 ? `${units.length} tickets` : 'ticket'}</button></div>
        </form>
      </section>
    </div>
  )
}
