import { Search } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import PortalPopover, { announcePopoverOpen } from './PortalPopover'

export default function HybridLookup({ value = '', onChange, suggestions = [], placeholder = 'Type or select…', disabled = false, onCommit, className = '' }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const anchorRef = useRef(null)
  const focusValueRef = useRef(value || '')
  const popoverId = useId()

  const filtered = useMemo(() => {
    const needle = String(search || '').trim().toLowerCase()
    const list = [...new Set(suggestions.filter(Boolean).map((item) => String(item)))]
    if (!needle) return list.slice(0, 80)
    return list.filter((item) => item.toLowerCase().includes(needle) && item !== String(value || '')).slice(0, 80)
  }, [suggestions, search, value])

  function commit(next) {
    if (String(next || '') === String(focusValueRef.current || '')) return
    focusValueRef.current = next || ''
    onCommit?.(next || '')
  }

  function openPopover(seed = value) {
    setSearch(String(seed || ''))
    announcePopoverOpen(popoverId)
    setOpen(true)
  }

  function closePopover() {
    setOpen(false)
    setSearch('')
  }

  function choose(next) {
    onChange(next)
    commit(next)
    closePopover()
  }

  function handleValueChange(event) {
    const next = event.target.value
    onChange(next)
    setSearch(next)
    announcePopoverOpen(popoverId)
    setOpen(true)
  }

  return (
    <div ref={anchorRef} className={`hybrid-lookup ${className}`}>
      <div className="hybrid-input-wrap">
        <Search size={13} />
        <input
          value={value || ''}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => { focusValueRef.current = value || ''; openPopover(value) }}
          onChange={handleValueChange}
          onBlur={() => commit(value || '')}
        />
      </div>
      <PortalPopover id={popoverId} anchorRef={anchorRef} open={open && !disabled && suggestions.length > 0} onClose={closePopover} minWidth={280} maxHeight={320} className="hybrid-portal">
        <div className="hybrid-popover">
          <div className="hybrid-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search options…" /></div>
          <div className="hybrid-list">
            {filtered.map((item) => <button type="button" key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>{item}</button>)}
            {!filtered.length && <div className="hybrid-empty">No matching options</div>}
          </div>
        </div>
      </PortalPopover>
    </div>
  )
}
