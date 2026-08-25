import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import PortalPopover, { announcePopoverOpen } from './PortalPopover'

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
  const anchorRef = useRef(null)
  const inputRef = useRef(null)
  const popoverId = useId()

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0)
    else setSearch('')
  }, [open])

  const selected = options.find((item) => String(getValue(item)) === String(value))
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return options.slice(0, 120)
    return options.filter((item) => String(getLabel(item) || '').toLowerCase().includes(needle)).slice(0, 120)
  }, [options, search, getLabel])

  function setPopoverOpen(next) {
    if (next) announcePopoverOpen(popoverId)
    setOpen(next)
  }

  function choose(nextValue) {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className={`lookup ${className}`}>
      <button type="button" className={`lookup-trigger ${open ? 'active' : ''}`} disabled={disabled} onClick={() => setPopoverOpen(!open)}>
        <span className={selected ? '' : 'lookup-placeholder'}>{selected ? getLabel(selected) : placeholder}</span>
        <ChevronDown size={14} />
      </button>
      <PortalPopover id={popoverId} anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} minWidth={240} className="lookup-portal">
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
      </PortalPopover>
    </div>
  )
}
