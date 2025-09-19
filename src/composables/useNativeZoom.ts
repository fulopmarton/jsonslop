/**
 * Native Vue 3 zoom and pan implementation without D3
 * Provides zoom, pan, and transform functionality for SVG elements
 */

import { ref, computed, type Ref } from 'vue'

export interface ZoomTransform {
  x: number
  y: number
  k: number // scale
}

export interface ZoomBounds {
  minScale: number
  maxScale: number
}

export interface UseNativeZoomOptions {
  bounds?: ZoomBounds
  initialTransform?: ZoomTransform
  onTransformChange?: (transform: ZoomTransform) => void
}

export interface UseNativeZoomReturn {
  transform: Ref<ZoomTransform>
  isDragging: Ref<boolean>
  handleWheel: (event: WheelEvent) => void
  handleMouseDown: (event: MouseEvent) => void
  handleMouseMove: (event: MouseEvent) => void
  handleMouseUp: (event: MouseEvent) => void
  zoomIn: (factor?: number) => void
  zoomOut: (factor?: number) => void
  zoomToFit: (
    bounds: { x: number; y: number; width: number; height: number },
    containerWidth: number,
    containerHeight: number,
  ) => void
  resetZoom: () => void
  setTransform: (newTransform: Partial<ZoomTransform>) => void
  transformString: Ref<string>
}

const DEFAULT_BOUNDS: ZoomBounds = {
  minScale: 0.1,
  maxScale: 10,
}

const DEFAULT_TRANSFORM: ZoomTransform = {
  x: 0,
  y: 0,
  k: 1,
}

export function useNativeZoom(options: UseNativeZoomOptions = {}): UseNativeZoomReturn {
  const bounds = { ...DEFAULT_BOUNDS, ...options.bounds }
  const transform = ref<ZoomTransform>({ ...DEFAULT_TRANSFORM, ...options.initialTransform })
  const isDragging = ref(false)

  // Track mouse state for dragging
  let lastMouseX = 0
  let lastMouseY = 0
  let isMouseDown = false

  // Computed transform string for SVG
  const transformString = computed(
    () => `translate(${transform.value.x}, ${transform.value.y}) scale(${transform.value.k})`,
  )

  // Clamp scale within bounds
  const clampScale = (scale: number): number => {
    return Math.max(bounds.minScale, Math.min(bounds.maxScale, scale))
  }

  // Update transform and notify listeners
  const updateTransform = (newTransform: Partial<ZoomTransform>) => {
    const updated = {
      ...transform.value,
      ...newTransform,
      k: clampScale(newTransform.k ?? transform.value.k),
    }

    transform.value = updated
    options.onTransformChange?.(updated)
  }

  // Handle wheel events for zooming
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()

    const rect = (event.currentTarget as Element).getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // Calculate zoom factor
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
    const newScale = clampScale(transform.value.k * zoomFactor)

    // Calculate new translation to zoom towards mouse position
    const scaleRatio = newScale / transform.value.k
    const newX = mouseX - (mouseX - transform.value.x) * scaleRatio
    const newY = mouseY - (mouseY - transform.value.y) * scaleRatio

    updateTransform({
      x: newX,
      y: newY,
      k: newScale,
    })
  }

  // Handle mouse down for panning
  const handleMouseDown = (event: MouseEvent) => {
    // Only handle left mouse button
    if (event.button !== 0) return

    isMouseDown = true
    isDragging.value = false
    lastMouseX = event.clientX
    lastMouseY = event.clientY

    // Prevent text selection during drag
    event.preventDefault()
  }

  // Handle mouse move for panning
  const handleMouseMove = (event: MouseEvent) => {
    if (!isMouseDown) return

    const deltaX = event.clientX - lastMouseX
    const deltaY = event.clientY - lastMouseY

    // Only start dragging if mouse has moved significantly
    if (!isDragging.value && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      isDragging.value = true
    }

    if (isDragging.value) {
      updateTransform({
        x: transform.value.x + deltaX,
        y: transform.value.y + deltaY,
      })
    }

    lastMouseX = event.clientX
    lastMouseY = event.clientY
  }

  // Handle mouse up to end panning
  const handleMouseUp = (event: MouseEvent) => {
    if (event.button !== 0) return

    isMouseDown = false

    // Small delay to prevent click events from firing immediately after drag
    if (isDragging.value) {
      setTimeout(() => {
        isDragging.value = false
      }, 10)
    } else {
      isDragging.value = false
    }
  }

  // Programmatic zoom controls
  const zoomIn = (factor = 1.2) => {
    updateTransform({
      k: clampScale(transform.value.k * factor),
    })
  }

  const zoomOut = (factor = 1.2) => {
    updateTransform({
      k: clampScale(transform.value.k / factor),
    })
  }

  // Zoom to fit bounds within container
  const zoomToFit = (
    contentBounds: { x: number; y: number; width: number; height: number },
    containerWidth: number,
    containerHeight: number,
  ) => {
    if (contentBounds.width === 0 || contentBounds.height === 0) return

    const padding = 50 // Padding around content
    const scaleX = (containerWidth - padding * 2) / contentBounds.width
    const scaleY = (containerHeight - padding * 2) / contentBounds.height
    const scale = clampScale(Math.min(scaleX, scaleY))

    const centerX = contentBounds.x + contentBounds.width / 2
    const centerY = contentBounds.y + contentBounds.height / 2

    const x = containerWidth / 2 - centerX * scale
    const y = containerHeight / 2 - centerY * scale

    updateTransform({ x, y, k: scale })
  }

  // Reset zoom to default
  const resetZoom = () => {
    updateTransform(DEFAULT_TRANSFORM)
  }

  // Set transform directly
  const setTransform = (newTransform: Partial<ZoomTransform>) => {
    updateTransform(newTransform)
  }

  return {
    transform,
    isDragging,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    zoomIn,
    zoomOut,
    zoomToFit,
    resetZoom,
    setTransform,
    transformString,
  }
}
