import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  getValue = (item) => item?.value,
  getLabel = (item) => item?.label ?? '',
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  disabled = false,
  clearable = true,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0)
    else setSearch('')
  }, [open])

  const selected = options.find((item) => String(getValue(item)) === String(value))
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return options.slice(0, 120)
    return options.filter((item) => getLabel(item).toLowerCase().includes(needle)).slice(0, 120)
  }, [options, search, getLabel])

  function choose(nextValue) {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`lookup ${className}`}>
      <button type="button" className={`lookup-trigger ${open ? 'active' : ''}`} disabled={disabled} onClick={() => setOpen((x) => !x)}>
        <span className={selected ? '' : 'lookup-placeholder'}>{selected ? getLabel(selected) : placeholder}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="lookup-popover">
          <div className="lookup-search"><Search size={14} /><input ref={inputRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} /></div>
          <div className="lookup-list">
            {clearable && value ? <button type="button" className="lookup-option clear" onClick={() => choose('')}><X size={14} /> Clear selection</button> : null}
            {filtered.map((item) => {
              const itemValue = getValue(item)
              const active = String(itemValue) === String(value)
              return <button type="button" className={`lookup-option ${active ? 'selected' : ''}`} key={String(itemValue)} onClick={() => choose(itemValue)}><span>{getLabel(item)}</span>{active && <Check size={14} />}</button>
            })}
            {!filtered.length && <div className="lookup-empty">No matching options</div>}
          </div>
        </div>
      )}
    </div>
  )
}
