import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function MultiUnitLookup({ values = [], onChange, options = [], siteId }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return options.filter((item) => (!siteId || item.site_id === siteId) && !values.includes(item.unit_no) && (!needle || item.unit_no.toLowerCase().includes(needle))).slice(0, 40)
  }, [options, query, siteId, values])

  function add(value) {
    const clean = String(value || '').trim()
    if (!clean || values.includes(clean)) return
    onChange([...values, clean])
    setQuery('')
  }

  function remove(value) {
    onChange(values.filter((item) => item !== value))
  }

  function parseMany(text) {
    const items = text.split(/[\n,;\t]+/).map((item) => item.trim()).filter(Boolean)
    if (!items.length) return
    onChange([...new Set([...values, ...items])])
  }

  return (
    <div className="multi-lookup">
      <div className="multi-chips">{values.map((value) => <span key={value}>{value}<button type="button" onClick={() => remove(value)}><X size={12} /></button></span>)}</div>
      <div className="multi-input"><Search size={14} /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(query) } }} onPaste={(e) => { const text = e.clipboardData.getData('text'); if (/[\n,;\t]/.test(text)) { e.preventDefault(); parseMany(text) } }} placeholder="Search unit, type new unit, or paste many…" /></div>
      {query && <div className="multi-options">{filtered.map((item) => <button type="button" key={item.unit_id || `${item.site_id}-${item.unit_no}`} onClick={() => add(item.unit_no)}>{item.unit_no}<small>{item.site_id || ''}</small></button>)}<button type="button" className="manual-option" onClick={() => add(query)}>Use “{query.trim()}”</button></div>}
    </div>
  )
}
