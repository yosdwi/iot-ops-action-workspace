import { Clock3, Loader2, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { jakartaDate } from '../lib/time'
import SearchableSelect from './SearchableSelect'
import HybridLookup from './HybridLookup'
import AssetComposer from './AssetComposer'

const MINUTE = 60 * 1000

export default function NewTicketModal({ masters, suggestions, operatorId, onClose, onCreated, notify }) {
  const [shiftId, setShiftId] = useState(() => localStorage.getItem('iot-ops-last-shift') || '')
  const [responderId, setResponderId] = useState(operatorId || '')
  const [issueTypeId, setIssueTypeId] = useState('')
  const [description, setDescription] = useState('')
  const [assets, setAssets] = useState([])
  const [unresolved, setUnresolved] = useState([])
  const [busy, setBusy] = useState(false)
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [minGap, setMinGap] = useState(1)
  const [maxGap, setMaxGap] = useState(5)
  const [minDuration, setMinDuration] = useState(2)
  const [maxDuration, setMaxDuration] = useState(10)
  const [generatedTimes, setGeneratedTimes] = useState({})

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

  useEffect(() => {
    if (!shiftId || windowStart || windowEnd) return
    setWindowFromShift(shiftId)
  }, [shiftId, masters.shifts])

  function chooseShift(value) {
    setShiftId(value)
    if (value) localStorage.setItem('iot-ops-last-shift', value)
    else localStorage.removeItem('iot-ops-last-shift')
    setGeneratedTimes({})
    if (value) setWindowFromShift(value)
  }

  function setWindowFromShift(value) {
    const shift = masters.shifts.find((item) => item.shift_id === value)
    if (!shift?.start_time || !shift?.end_time) return
    const date = jakartaDate()
    const startValue = `${date}T${String(shift.start_time).slice(0, 5)}`
    let startMs = parseJakartaInput(startValue)
    let endMs = parseJakartaInput(`${date}T${String(shift.end_time).slice(0, 5)}`)
    if (endMs <= startMs) endMs += 24 * 60 * MINUTE
    setWindowStart(formatJakartaInput(startMs))
    setWindowEnd(formatJakartaInput(endMs))
  }

  function applyPreset(preset) {
    setIssueTypeId(preset.issue_type_id)
    setDescription(preset.issue_description || '')
  }

  function handleAssetsChange(nextAssets) {
    const currentIds = assets.map((item) => String(item.unit_id)).join('|')
    const nextIds = nextAssets.map((item) => String(item.unit_id)).join('|')
    if (currentIds !== nextIds) setGeneratedTimes({})
    setAssets(nextAssets)
  }

  function updateTimeRule(setter, value) {
    setter(value)
    setGeneratedTimes({})
  }

  function generateTimes() {
    if (!assets.length) return notify('Tambahkan asset dulu.', 'error')
    const startMs = parseJakartaInput(windowStart)
    const endMs = parseJakartaInput(windowEnd)
    const gapMin = Number(minGap)
    const gapMax = Number(maxGap)
    const durationMin = Number(minDuration)
    const durationMax = Number(maxDuration)

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return notify('Isi Window Start dan Window End dengan benar.', 'error')
    if (![gapMin, gapMax, durationMin, durationMax].every((value) => Number.isFinite(value) && value >= 0)) return notify('Gap dan duration harus berupa angka positif.', 'error')
    if (gapMin > gapMax) return notify('Min Gap tidak boleh lebih besar dari Max Gap.', 'error')
    if (durationMin <= 0 || durationMin > durationMax) return notify('Min Duration harus lebih dari 0 dan tidak lebih besar dari Max Duration.', 'error')

    const requiredMin = assets.length * durationMin + Math.max(0, assets.length - 1) * gapMin
    const availableMinutes = Math.floor((endMs - startMs) / MINUTE)
    if (requiredMin > availableMinutes) return notify(`Window terlalu sempit. Minimal butuh ${requiredMin} menit untuk ${assets.length} ticket.`, 'error')

    let cursor = startMs
    const slack = Math.max(0, availableMinutes - requiredMin)
    cursor += randomInt(0, Math.min(gapMax, slack)) * MINUTE

    const nextTimes = {}
    for (let index = 0; index < assets.length; index += 1) {
      const remainingRows = assets.length - index - 1
      const minimumAfterDuration = remainingRows * durationMin + remainingRows * gapMin
      const maxDurationAllowed = Math.floor((endMs - cursor) / MINUTE) - minimumAfterDuration
      const duration = randomInt(durationMin, Math.min(durationMax, maxDurationAllowed))
      const activityEnd = cursor + duration * MINUTE

      nextTimes[assets[index].unit_id] = {
        start: new Date(cursor).toISOString(),
        end: new Date(activityEnd).toISOString(),
      }

      if (remainingRows > 0) {
        const minimumAfterGap = remainingRows * durationMin + Math.max(0, remainingRows - 1) * gapMin
        const maxGapAllowed = Math.floor((endMs - activityEnd) / MINUTE) - minimumAfterGap
        const gap = randomInt(gapMin, Math.min(gapMax, maxGapAllowed))
        cursor = activityEnd + gap * MINUTE
      }
    }

    setGeneratedTimes(nextTimes)
  }

  async function submit(event) {
    event.preventDefault()
    if (!operatorId) return notify('Pilih operator IoT Ops dulu.', 'error')
    if (!shiftId) return notify('Pilih Shift.', 'error')
    if (!responderId) return notify('Pilih First Responder.', 'error')
    if (!issueTypeId) return notify('Pilih Issue Type.', 'error')
    if (!assets.length) return notify('Tambahkan minimal satu asset.', 'error')
    if (unresolved.length) return notify(`Masih ada ${unresolved.length} asset yang belum dikenali. Resolve atau remove dulu.`, 'error')

    const generatedCount = Object.keys(generatedTimes).length
    if (generatedCount && generatedCount !== assets.length) return notify('Asset berubah setelah generate time. Generate ulang dulu.', 'error')

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
        ...(generatedTimes[asset.unit_id] ? {
          activity_start_at: generatedTimes[asset.unit_id].start,
          activity_end_at: generatedTimes[asset.unit_id].end,
        } : {}),
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
              onChange={handleAssetsChange}
              unresolved={unresolved}
              onUnresolvedChange={setUnresolved}
              issueTypes={masters.issueTypes}
              descriptionSuggestions={suggestions.issueDescriptions}
              notify={notify}
            />

            <section className="activity-time-section">
              <div className="activity-time-head"><strong><Clock3 size={15} /> Activity Time</strong><button type="button" className="button secondary compact" onClick={generateTimes}>{Object.keys(generatedTimes).length ? 'Regenerate' : 'Generate Times'}</button></div>
              <div className="time-rule-grid">
                <label>Window Start<input type="datetime-local" value={windowStart} onChange={(event) => updateTimeRule(setWindowStart, event.target.value)} /></label>
                <label>Window End<input type="datetime-local" value={windowEnd} onChange={(event) => updateTimeRule(setWindowEnd, event.target.value)} /></label>
                <label>Min Gap (min)<input type="number" min="0" value={minGap} onChange={(event) => updateTimeRule(setMinGap, event.target.value)} /></label>
                <label>Max Gap (min)<input type="number" min="0" value={maxGap} onChange={(event) => updateTimeRule(setMaxGap, event.target.value)} /></label>
                <label>Min Duration (min)<input type="number" min="1" value={minDuration} onChange={(event) => updateTimeRule(setMinDuration, event.target.value)} /></label>
                <label>Max Duration (min)<input type="number" min="1" value={maxDuration} onChange={(event) => updateTimeRule(setMaxDuration, event.target.value)} /></label>
              </div>

              {!!Object.keys(generatedTimes).length && (
                <div className="generated-time-list">
                  <div className="generated-time-row generated-time-header"><span>Asset</span><span>Start</span><span>End</span></div>
                  {assets.map((asset) => {
                    const time = generatedTimes[asset.unit_id]
                    if (!time) return null
                    return <div className="generated-time-row" key={asset.unit_id}><strong>{asset.unit_no}</strong><span>{formatJakartaDateTime(time.start)}</span><span>{formatJakartaDateTime(time.end)}</span></div>
                  })}
                </div>
              )}
            </section>
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

function parseJakartaInput(value) {
  if (!value) return Number.NaN
  return Date.parse(`${value}:00+07:00`)
}

function formatJakartaInput(ms) {
  return new Date(ms + 7 * 60 * MINUTE).toISOString().slice(0, 16)
}

function formatJakartaDateTime(value) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

function randomInt(min, max) {
  const safeMin = Math.ceil(Number(min))
  const safeMax = Math.floor(Number(max))
  if (safeMax <= safeMin) return safeMin
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin
}
