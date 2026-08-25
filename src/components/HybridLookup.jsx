import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function HybridLookup({ value = '', onChange, suggestions = [], placeholder = 'Type or select…', disabled = false, onCommit, className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const focusValueRef = useRef(value || '')

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

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

  function choose(next) {
    onChange(next)
    commit(next)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`hybrid-lookup ${className}`}>
      <div className="hybrid-input-wrap"><Search size={13} /><input value={value || ''} disabled={disabled} placeholder={placeholder} onFocus={() => { focusValueRef.current = value || ''; setOpen(true) }} onChange={(e) => { onChange(e.target.value); setOpen(true) }} onBlur={() => commit(value || '')} /></div>
      {open && !disabled && filtered.length > 0 && <div className="hybrid-popover">{filtered.map((item) => <button type="button" key={item} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(item)}>{item}</button>)}</div>}
    </div>
  )
}
