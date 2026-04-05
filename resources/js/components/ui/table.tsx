import * as React from "react"

import { cn } from "@/lib/utils"

function isInteractiveDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest(
      "a, button, input, textarea, select, option, label, summary, [role='button'], [role='link'], [contenteditable='true'], [data-no-drag-scroll='true']"
    )
  )
}

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const dragStateRef = React.useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
  const [isScrollable, setIsScrollable] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)

  React.useEffect(() => {
    const node = containerRef.current

    if (!node || typeof ResizeObserver === "undefined") {
      return
    }

    const updateScrollableState = (): void => {
      const hasHorizontalOverflow = node.scrollWidth > node.clientWidth + 1
      const hasVerticalOverflow = node.scrollHeight > node.clientHeight + 1
      setIsScrollable(hasHorizontalOverflow || hasVerticalOverflow)
    }

    updateScrollableState()

    const resizeObserver = new ResizeObserver(() => {
      updateScrollableState()
    })

    resizeObserver.observe(node)

    if (node.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(node.firstElementChild)
    }

    window.addEventListener("resize", updateScrollableState)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateScrollableState)
    }
  }, [])

  const endDrag = React.useCallback((): void => {
    const node = containerRef.current

    if (node && dragStateRef.current.active && node.hasPointerCapture(dragStateRef.current.pointerId)) {
      node.releasePointerCapture(dragStateRef.current.pointerId)
    }

    dragStateRef.current.active = false
    dragStateRef.current.moved = false
    dragStateRef.current.pointerId = -1
    setIsDragging(false)
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const node = containerRef.current

    if (!node || !isScrollable || event.button !== 0 || isInteractiveDragTarget(event.target)) {
      return
    }

    dragStateRef.current.active = true
    dragStateRef.current.moved = false
    dragStateRef.current.pointerId = event.pointerId
    dragStateRef.current.startX = event.clientX
    dragStateRef.current.startY = event.clientY
    dragStateRef.current.scrollLeft = node.scrollLeft
    dragStateRef.current.scrollTop = node.scrollTop

    node.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const node = containerRef.current

    if (!node || !dragStateRef.current.active) {
      return
    }

    const horizontalDelta = event.clientX - dragStateRef.current.startX
    const verticalDelta = event.clientY - dragStateRef.current.startY

    if (!dragStateRef.current.moved && (Math.abs(horizontalDelta) > 2 || Math.abs(verticalDelta) > 2)) {
      dragStateRef.current.moved = true
    }

    node.scrollLeft = dragStateRef.current.scrollLeft - horizontalDelta
    node.scrollTop = dragStateRef.current.scrollTop - verticalDelta

    if (dragStateRef.current.moved) {
      event.preventDefault()
    }
  }

  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      data-drag-scrollable={isScrollable}
      data-dragging={isDragging}
      onPointerCancel={endDrag}
      onPointerDown={handlePointerDown}
      onPointerLeave={endDrag}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      className={cn(
        "drag-scroll-region relative w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
        isScrollable && "cursor-grab",
        isDragging && "cursor-grabbing select-none"
      )}
    >
      <table
        data-slot="table"
        className={cn("min-w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-3 py-2 text-left align-middle text-xs font-medium whitespace-normal sm:px-4 sm:text-sm sm:whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-3 align-middle whitespace-normal break-words sm:px-4 sm:whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
