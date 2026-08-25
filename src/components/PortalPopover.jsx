import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const OPEN_EVENT = 'iot-popover-open'

export function announcePopoverOpen(id) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }))
}

export default function PortalPopover({ id, anchorRef, open, onClose, children, minWidth = 240, className = '' }) {
  const layerRef = useRef(null)
  const [style, setStyle] = useState({ visibility: 'hidden' })

  useLayoutEffect(() => {
    if (!open) return undefined

    let frame = 0
    function updatePosition() {
      const anchor = anchorRef.current
      const layer = layerRef.current
      if (!anchor || !layer) return

      const rect = anchor.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const margin = 12
      const width = Math.min(Math.max(rect.width, minWidth), Math.max(220, viewportWidth - margin * 2))
      const measuredHeight = Math.max(80, layer.offsetHeight || 280)
      const spaceBelow = viewportHeight - rect.bottom - margin
      const spaceAbove = rect.top - margin
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow
      const availableHeight = Math.max(140, openAbove ? spaceAbove - 6 : spaceBelow - 6)
      const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - width - margin))
      const visibleHeight = Math.min(measuredHeight, availableHeight)
      const top = openAbove
        ? Math.max(margin, rect.top - visibleHeight - 6)
        : Math.min(viewportHeight - margin - Math.min(measuredHeight, availableHeight), rect.bottom + 6)

      setStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${Math.max(margin, top)}px`,
        width: `${width}px`,
        maxHeight: `${availableHeight}px`,
        visibility: 'visible',
      })
    }

    updatePosition()
    frame = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, anchorRef, minWidth])

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (anchorRef.current?.contains(event.target) || layerRef.current?.contains(event.target)) return
      onClose?.()
    }

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose?.()
    }

    function handleOtherPopover(event) {
      if (event.detail !== id) onClose?.()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener(OPEN_EVENT, handleOtherPopover)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener(OPEN_EVENT, handleOtherPopover)
    }
  }, [open, id, anchorRef, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div ref={layerRef} className={`portal-popover ${className}`} style={style}>
      {children}
    </div>,
    document.body,
  )
}
