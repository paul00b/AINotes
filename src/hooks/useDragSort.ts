import { useCallback, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

export type DragDirection = 'vertical' | 'grid'

interface DragState {
  id: string
  startX: number
  startY: number
  rects: Map<string, DOMRect>
  order: string[]
  currentOrder: string[]
  moved: boolean
}

export interface DragSortApi {
  draggingId: string | null
  containerRef: RefObject<HTMLDivElement | null>
  getItemStyle: (id: string) => CSSProperties
  bindHandle: (id: string) => {
    onPointerDown: (e: ReactPointerEvent) => void
    style: CSSProperties
  }
  bindLongPress: (id: string) => {
    onPointerDown: (e: ReactPointerEvent) => void
    onClickCapture: (e: ReactMouseEvent) => void
    style: CSSProperties
  }
}

const DRAG_THRESHOLD = 4
const LONG_PRESS_MS = 350
const LONG_PRESS_MOVE_LIMIT = 8

function preventScroll(e: TouchEvent) {
  e.preventDefault()
}

export function useDragSort<T extends { id: string }>(
  items: T[],
  onReorder: (newItems: T[]) => void,
  direction: DragDirection = 'vertical',
): DragSortApi {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const stateRef = useRef<DragState | null>(null)
  const itemsRef = useRef(items)
  itemsRef.current = items
  const suppressClickRef = useRef(false)

  const startDrag = useCallback((id: string, startX: number, startY: number, initialMoved: boolean) => {
    const container = containerRef.current
    if (!container) return
    const rects = new Map<string, DOMRect>()
    for (const child of Array.from(container.children) as HTMLElement[]) {
      const cid = child.dataset.dragId
      if (cid) rects.set(cid, child.getBoundingClientRect())
    }
    if (!rects.has(id)) return

    const order = itemsRef.current.map((i) => i.id)
    stateRef.current = {
      id,
      startX,
      startY,
      rects,
      order,
      currentOrder: [...order],
      moved: initialMoved,
    }

    if (initialMoved) {
      setDraggingId(id)
      setDragDelta({ x: 0, y: 0 })
      document.addEventListener('touchmove', preventScroll, { passive: false })
    }

    const handleMove = (ev: PointerEvent) => {
      const s = stateRef.current
      if (!s) return
      const dx = ev.clientX - s.startX
      const dy = ev.clientY - s.startY

      if (!s.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
        s.moved = true
        setDraggingId(s.id)
        document.addEventListener('touchmove', preventScroll, { passive: false })
      }

      setDragDelta({ x: dx, y: dy })

      const draggedRect = s.rects.get(s.id)!
      const px = draggedRect.left + draggedRect.width / 2 + dx
      const py = draggedRect.top + draggedRect.height / 2 + dy

      const remaining = s.order.filter((oid) => oid !== s.id)
      if (remaining.length === 0) return

      let closest = 0
      let minDist = Infinity
      remaining.forEach((oid, idx) => {
        const r = s.rects.get(oid)!
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dist = Math.hypot(cx - px, cy - py)
        if (dist < minDist) {
          minDist = dist
          closest = idx
        }
      })
      const cr = s.rects.get(remaining[closest])!
      let insertIdx: number
      if (direction === 'grid') {
        if (py < cr.top) insertIdx = closest
        else if (py > cr.bottom) insertIdx = closest + 1
        else insertIdx = closest + (px > cr.left + cr.width / 2 ? 1 : 0)
      } else {
        insertIdx = closest + (py > cr.top + cr.height / 2 ? 1 : 0)
      }

      const newOrder = [
        ...remaining.slice(0, insertIdx),
        s.id,
        ...remaining.slice(insertIdx),
      ]
      s.currentOrder = newOrder

      const newOffsets: Record<string, { x: number; y: number }> = {}
      newOrder.forEach((oid, newIdx) => {
        if (oid === s.id) return
        const origin = s.rects.get(oid)!
        const target = s.rects.get(s.order[newIdx])!
        newOffsets[oid] = {
          x: target.left - origin.left,
          y: target.top - origin.top,
        }
      })
      setOffsets(newOffsets)
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      document.removeEventListener('touchmove', preventScroll)
      const s = stateRef.current
      if (s && s.moved) {
        const changed = s.currentOrder.some((cid, i) => cid !== s.order[i])
        if (changed) {
          const map = new Map(itemsRef.current.map((it) => [it.id, it]))
          const newItems = s.currentOrder
            .map((cid) => map.get(cid))
            .filter((v): v is T => Boolean(v))
          onReorder(newItems)
        }
      }
      stateRef.current = null
      setDraggingId(null)
      setOffsets({})
      setDragDelta({ x: 0, y: 0 })
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }, [direction, onReorder])

  const bindHandle = useCallback((id: string) => ({
    style: { touchAction: 'none' as const, cursor: 'grab' },
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      startDrag(id, e.clientX, e.clientY, false)
    },
  }), [startDrag])

  const bindLongPress = useCallback((id: string) => ({
    style: { touchAction: 'pan-y' as const },
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return

      const startX = e.clientX
      const startY = e.clientY
      let currentX = startX
      let currentY = startY
      let timer: ReturnType<typeof setTimeout> | null = null

      const cleanupWait = () => {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        window.removeEventListener('pointermove', onMoveWait)
        window.removeEventListener('pointerup', onUpWait)
        window.removeEventListener('pointercancel', onUpWait)
      }

      const onMoveWait = (ev: PointerEvent) => {
        currentX = ev.clientX
        currentY = ev.clientY
        if (Math.hypot(currentX - startX, currentY - startY) > LONG_PRESS_MOVE_LIMIT) {
          cleanupWait()
        }
      }
      const onUpWait = () => {
        cleanupWait()
      }

      window.addEventListener('pointermove', onMoveWait)
      window.addEventListener('pointerup', onUpWait)
      window.addEventListener('pointercancel', onUpWait)

      timer = setTimeout(() => {
        cleanupWait()
        suppressClickRef.current = true
        startDrag(id, currentX, currentY, true)
      }, LONG_PRESS_MS)
    },
    onClickCapture: (e: ReactMouseEvent) => {
      if (suppressClickRef.current) {
        e.preventDefault()
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation?.()
        suppressClickRef.current = false
      }
    },
  }), [startDrag])

  const getItemStyle = useCallback((id: string): CSSProperties => {
    if (draggingId === id) {
      return {
        transform: `translate(${dragDelta.x}px, ${dragDelta.y}px) scale(1.03)`,
        zIndex: 30,
        transition: 'transform 0s, box-shadow 0.2s ease',
        boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25)',
        touchAction: 'none',
        willChange: 'transform',
      }
    }
    const off = offsets[id]
    const tx = off?.x ?? 0
    const ty = off?.y ?? 0
    return {
      transform: `translate(${tx}px, ${ty}px)`,
      transition: 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      willChange: 'transform',
    }
  }, [draggingId, offsets, dragDelta])

  return { draggingId, containerRef, getItemStyle, bindHandle, bindLongPress }
}
