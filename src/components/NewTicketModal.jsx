import { Loader2, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import SearchableSelect from './SearchableSelect'
import HybridLookup from './HybridLookup'
import AssetComposer from './AssetComposer'

export default function NewTicketModal({ masters, suggestions, operatorId, onClose, onCreated, notify }) {
  const [shiftId, setShiftId] = useState(() => localStorage.getItem('iot-ops-last-shift') || '')
  const [responderId, setResponderId] = useState(operatorId || '')
  const [issueTypeId, setIssueTypeId] = useState('')
  const [description, setDescription] = useState('')
  const [assets, setAssets] = useState([])
  const [unresolved, setUnresolved] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [])

  useEffect(() => {
    if (!responderId && operatorId) setResponderId(operatorId)
  }, [responderId, operatorId])

  function chooseShift(value) {
    setShiftId(value)
    if (value) localStorage.setItem('iot-ops-last-shift', value)
    else localStorage.removeItem('iot-ops-last-shift')
  }

  function applyPreset(preset) {
    setIssueTypeId(preset.issue_type_id)
    setDescription(preset.issue_description || '')
  }

  async function submit(event) {
    event.preventDefault()
    if (!operatorId) return notify('Pilih operator IoT Ops dulu.', 'error')
    if (!shiftId) return notify('Pilih Shift.', 'error')
    if (!responderId) return notify('Pilih First Responder.', 'error')
    if (!issueTypeId) return notify('Pilih Issue Type.', 'error')
    if (!assets.length) return notify('Tambahkan minimal satu asset.', 'error')
    if (unresolved.length) return notify(`Masih ada ${unresolved.length} asset yang belum dikenali. Resolve atau remove dulu.`, 'error')

    setBusy(true)
    const { data, error } = await supabase.rpc('create_ticket_batch_v3', {
      p_operator_id: operatorId,
      p_defaults: {
        shift_id: shiftId,
        first_responder_id: responderId,
        issue_type_id: issueTypeId,
        issue_description: description.trim() || null,
      },
      p_rows: assets.map((asset) => ({
        unit_id: asset.unit_id,
        ...(asset.issue_type_id ? { issue_type_id: asset.issue_type_id } : {}),
        ...(asset.issue_description?.trim() ? { issue_description: asset.issue_description.trim() } : {}),
      })),
    })
    setBusy(false)
    if (error) return notify(error.message, 'error')

    const created = data?.tickets || []
    onCreated(created)
    notify(`${data?.created_count || created.length} ticket dibuat.`, 'success')
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-card composer-modal">
        <header className="modal-header composer-header">
          <h2>Quick Ticket Composer</h2>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </header>

        <form onSubmit={submit}>
          <div className="composer-body">
            <section className="composer-context">
              <div className="composer-section-title"><strong>Batch context</strong></div>
              <div className="composer-context-grid">
                <label>Shift<SearchableSelect value={shiftId} onChange={chooseShift} options={masters.shifts} getValue={(x) => x.shift_id} getLabel={(x) => x.shift_name} placeholder="Search shift" clearable={false} /></label>
                <label>First Responder<SearchableSelect value={responderId} onChange={setResponderId} options={masters.people} getValue={(x) => x.person_id} getLabel={(x) => x.display_name} placeholder="Search responder" clearable={false} /></label>
                <label>Issue Type<SearchableSelect value={issueTypeId} onChange={setIssueTypeId} options={masters.issueTypes} getValue={(x) => x.issue_type_id} getLabel={(x) => x.issue_name} placeholder="Search issue type" clearable={false} /></label>
                <label className="composer-description">Issue Description<HybridLookup value={description} onChange={setDescription} suggestions={suggestions.issueDescriptions} placeholder="Search description or type a new one…" /></label>
              </div>

              {!!masters.presets.length && (
                <div className="composer-presets">
                  <div className="preset-label"><Sparkles size={14} /> Common presets</div>
                  <div className="preset-list">
                    {masters.presets.map((preset) => (
                      <button type="button" key={preset.preset_id} onClick={() => applyPreset(preset)} title={preset.issue_description || preset.issue_name}>
                        <strong>{preset.preset_name}</strong>
                        <span>{preset.issue_name}{preset.issue_description ? ` · ${preset.issue_description}` : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <AssetComposer
              assets={assets}
              onChange={setAssets}
              unresolved={unresolved}
              onUnresolvedChange={setUnresolved}
              issueTypes={masters.issueTypes}
              descriptionSuggestions={suggestions.issueDescriptions}
              notify={notify}
            />
          </div>

          <footer className="composer-footer">
            <div className="composer-footer-actions">
              <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
              <button className="button primary composer-create" disabled={busy || !assets.length || !!unresolved.length}>
                {busy && <Loader2 className="spin" size={16} />} Create {assets.length || ''} ticket{assets.length === 1 ? '' : 's'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}
