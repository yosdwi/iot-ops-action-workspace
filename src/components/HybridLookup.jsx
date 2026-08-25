import { Search } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import PortalPopover, { announcePopoverOpen } from './PortalPopover'

export default function HybridLookup({ value = '', onChange, suggestions = [], placeholder = 'Type or select…', disabled = false, onCommit, className = '' }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const focusValueRef = useRef(value || '')
  const popoverId = useId()

  const filtered = useMemo(() => {
    const needle = String(value || '').trim().toLowerCase()
    const list = suggestions.filter(Boolean)
    if (!needle) return list.slice(0, 40)
    return list.filter((item) => String(item).toLowerCase().includes(needle) && String(item) !== String(value)).slice(0, 40)
  }, [suggestions, value])

  function commit(next) {
    if (String(next || '') === String(focusValueRef.current || '')) return
    focusValueRef.current = next || ''
    onCommit?.(next || '')
  }

  function openPopover() {
    announcePopoverOpen(popoverId)
    setOpen(true)
  }

  function choose(next) {
    onChange(next)
    commit(next)
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className={`hybrid-lookup ${className}`}>
      <div className="hybrid-input-wrap"><Search size={13} /><input value={value || ''} disabled={disabled} placeholder={placeholder} onFocus={() => { focusValueRef.current = value || ''; openPopover() }} onChange={(e) => { onChange(e.target.value); openPopover() }} onBlur={() => commit(value || '')} /></div>
      <PortalPopover id={popoverId} anchorRef={anchorRef} open={open && !disabled && filtered.length > 0} onClose={() => setOpen(false)} minWidth={280} className="hybrid-portal">
        <div className="hybrid-popover">{filtered.map((item) => <button type="button" key={item} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item)}>{item}</button>)}</div>
      </PortalPopover>
    </div>
  )
}
