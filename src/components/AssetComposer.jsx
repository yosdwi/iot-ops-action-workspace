import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import SearchableSelect from './SearchableSelect'
import HybridLookup from './HybridLookup'
import PortalPopover, { announcePopoverOpen } from './PortalPopover'

export default function AssetComposer({
  assets,
  onChange,
  unresolved,
  onUnresolvedChange,
  issueTypes,
  descriptionSuggestions,
  notify,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [resultsOpen, setResultsOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [review, setReview] = useState(false)
  const [activeUnresolved, setActiveUnresolved] = useState('')
  const searchAnchorRef = useRef(null)
  const resultsPopoverId = useId()

  useEffect(() => {
    const needle = query.trim()
    if (!needle) {
      setResults([])
      setResultsOpen(false)
      setSearching(false)
      return
    }
    let alive = true
    const timer = window.setTimeout(async () => {
      setSearching(true)
      const { data, error } = await supabase.rpc('search_assets', { p_search: needle, p_limit: 14 })
      if (!alive) return
      setSearching(false)
      if (error) {
        setResults([])
        setResultsOpen(false)
        return
      }
      const next = data || []
      setResults(next)
      if (next.length) {
        announcePopoverOpen(resultsPopoverId)
        setResultsOpen(true)
      }
    }, 140)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [query, resultsPopoverId])

  const selectedIds = useMemo(() => new Set(assets.map((x) => x.unit_id)), [assets])

  function addAsset(asset, extra = {}) {
    if (!asset?.unit_id || selectedIds.has(asset.unit_id)) {
      setQuery('')
      setResults([])
      setResultsOpen(false)
      return
    }
    onChange([...assets, {
      unit_id: asset.unit_id,
      unit_no: asset.unit_no,
      device_id: asset.device_id || null,
      device_ip: asset.device_ip || null,
      site_id: asset.site_id,
      site_code: asset.site_code,
      issue_type_id: extra.issue_type_id || '',
      issue_description: extra.issue_description || '',
    }])
    if (activeUnresolved) {
      onUnresolvedChange(unresolved.filter((x) => x.query !== activeUnresolved))
      setActiveUnresolved('')
    }
    setQuery('')
    setResults([])
    setResultsOpen(false)
  }

  function removeAsset(unitId) {
    onChange(assets.filter((x) => x.unit_id !== unitId))
  }

  function patchAsset(unitId, patch) {
    onChange(assets.map((x) => x.unit_id === unitId ? { ...x, ...patch } : x))
  }

  async function resolveEntries(entries) {
    if (!entries.length) return
    if (entries.length > 200) return notify('Maksimal 200 asset per batch.', 'error')
    setResolving(true)
    const { data, error } = await supabase.rpc('resolve_assets', { p_queries: entries.map((x) => x.identifier) })
    setResolving(false)
    if (error) return notify(error.message, 'error')

    const resolved = Array.isArray(data) ? data : []
    const nextAssets = [...assets]
    const existing = new Set(nextAssets.map((x) => x.unit_id))
    const nextUnresolved = [...unresolved]
    let added = 0
    let hasOverrides = false

    resolved.forEach((item, index) => {
      const entry = entries[index] || entries.find((_, i) => i + 1 === Number(item.position))
      if (item.matched && item.unit_id) {
        if (!existing.has(item.unit_id)) {
          nextAssets.push({
            unit_id: item.unit_id,
            unit_no: item.unit_no,
            device_id: item.device_id || null,
            device_ip: item.device_ip || null,
            site_id: item.site_id,
            site_code: item.site_code,
            issue_type_id: '',
            issue_description: entry?.description || '',
          })
          existing.add(item.unit_id)
          added += 1
          if (entry?.description) hasOverrides = true
        }
      } else if (entry?.identifier && !nextUnresolved.some((x) => x.query.toLowerCase() === entry.identifier.toLowerCase())) {
        nextUnresolved.push({ query: entry.identifier })
      }
    })

    onChange(nextAssets)
    onUnresolvedChange(nextUnresolved)
    if (hasOverrides) setReview(true)
    if (added) notify(`${added} asset ditambahkan.`, 'success')
  }

  function handlePaste(event) {
    const text = event.clipboardData?.getData('text') || ''
    const entries = parseClipboard(text)
    if (!entries) return
    event.preventDefault()
    setResultsOpen(false)
    resolveEntries(entries)
  }

  function findUnresolved(item) {
    setActiveUnresolved(item.query)
    setQuery(item.query)
  }

  function reopenResults() {
    if (!query.trim() || !results.length) return
    announcePopoverOpen(resultsPopoverId)
    setResultsOpen(true)
  }

  return (
    <section className="asset-composer">
      <div className="asset-composer-head">
        <div><strong>Assets</strong><span>Search by Unit No, Device ID, or Device IP. Paste many values from Sheets/Excel.</span></div>
        <div className="asset-count">{assets.length} selected</div>
      </div>

      <div className="asset-search-area">
        <div ref={searchAnchorRef} className="asset-search-input">
          <Search size={17} />
          <input
            value={query}
            onFocus={reopenResults}
            onChange={(e) => setQuery(e.target.value)}
            onPaste={handlePaste}
            placeholder="Search DT3714, 8186, 192.168.44.83 — or paste a list"
          />
          {(searching || resolving) && <Loader2 size={16} className="spin" />}
          {query && !searching && <button type="button" onClick={() => { setQuery(''); setResults([]); setResultsOpen(false); setActiveUnresolved('') }}><X size={15} /></button>}
        </div>
        <div className="asset-paste-note">Paste newline/comma lists. Spreadsheet paste also supports: <code>identifier[TAB]description</code>.</div>

        <PortalPopover id={resultsPopoverId} anchorRef={searchAnchorRef} open={resultsOpen && !!results.length && !!query.trim()} onClose={() => setResultsOpen(false)} minWidth={420} className="asset-results-portal">
          <div className="asset-results">
            {results.map((item) => (
              <button type="button" key={item.unit_id} onClick={() => addAsset(item)} disabled={selectedIds.has(item.unit_id)}>
                <div className="asset-result-main"><strong>{item.unit_no}</strong><span>{item.site_code || '—'}</span></div>
                <div className="asset-result-meta">
                  <span>Device {item.device_id || '—'}</span>
                  <span>IP {item.device_ip || '—'}</span>
                  <span className="match-chip">matched by {String(item.match_on || 'unit_no').replace('_', ' ')}</span>
                </div>
              </button>
            ))}
          </div>
        </PortalPopover>
      </div>

      {!!unresolved.length && (
        <div className="unresolved-box">
          <div className="unresolved-title"><AlertTriangle size={15} /><strong>{unresolved.length} belum dikenali</strong><span>Resolve atau remove sebelum create.</span></div>
          <div className="unresolved-list">
            {unresolved.map((item) => (
              <div key={item.query}><span>{item.query}</span><div><button type="button" onClick={() => findUnresolved(item)}>Find</button><button type="button" onClick={() => onUnresolvedChange(unresolved.filter((x) => x.query !== item.query))}><X size={13} /></button></div></div>
            ))}
          </div>
        </div>
      )}

      {!!assets.length && (
        <>
          <div className="selected-assets">
            {assets.map((asset) => (
              <div className="selected-asset" key={asset.unit_id}>
                <CheckCircle2 size={15} />
                <div className="selected-asset-copy"><strong>{asset.unit_no}</strong><span>{asset.site_code || '—'} · Device {asset.device_id || '—'} · IP {asset.device_ip || '—'}</span></div>
                {asset.issue_description && <span className="override-badge">row override</span>}
                <button type="button" onClick={() => removeAsset(asset.unit_id)}><X size={14} /></button>
              </div>
            ))}
          </div>

          <button type="button" className="review-toggle" onClick={() => setReview((x) => !x)}>
            {review ? <ChevronUp size={15} /> : <ChevronDown size={15} />} {review ? 'Hide row overrides' : 'Review / override per asset'}
          </button>

          {review && (
            <div className="asset-review-table">
              <div className="asset-review-head"><span>Asset</span><span>Issue override</span><span>Description override</span></div>
              {assets.map((asset) => (
                <div className="asset-review-row" key={asset.unit_id}>
                  <div><strong>{asset.unit_no}</strong><span>{asset.site_code || '—'}</span></div>
                  <SearchableSelect
                    value={asset.issue_type_id || ''}
                    onChange={(value) => patchAsset(asset.unit_id, { issue_type_id: value })}
                    options={issueTypes}
                    getValue={(x) => x.issue_type_id}
                    getLabel={(x) => x.issue_name}
                    placeholder="Use batch issue"
                    className="review-lookup"
                  />
                  <HybridLookup
                    value={asset.issue_description || ''}
                    onChange={(value) => patchAsset(asset.unit_id, { issue_description: value })}
                    suggestions={descriptionSuggestions}
                    placeholder="Use batch description"
                    className="review-description"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function parseClipboard(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const hasBulkDelimiter = raw.includes('\n') || raw.includes('\r') || raw.includes('\t') || raw.includes(',') || raw.includes(';')
  if (!hasBulkDelimiter) return null

  let entries = []
  if (raw.includes('\t')) {
    entries = raw.split(/\r?\n/).map((line) => {
      const cols = line.split('\t').map((x) => x.trim())
      return { identifier: cols[0] || '', description: cols[1] || '' }
    }).filter((x) => x.identifier)
  } else {
    entries = raw.split(/[\r\n,;]+/).map((identifier) => ({ identifier: identifier.trim(), description: '' })).filter((x) => x.identifier)
  }

  if (entries.length && /^(unit\s*no|device\s*id|device\s*ip|ip)$/i.test(entries[0].identifier)) entries.shift()
  return entries.length ? entries : null
}
