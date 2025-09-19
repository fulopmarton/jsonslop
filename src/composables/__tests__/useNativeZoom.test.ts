import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNativeZoom } from '../useNativeZoom'

describe('useNativeZoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default transform', () => {
    const { transform } = useNativeZoom()

    expect(transform.value).toEqual({
      x: 0,
      y: 0,
      k: 1,
    })
  })

  it('should initialize with custom transform', () => {
    const initialTransform = { x: 100, y: 50, k: 2 }
    const { transform } = useNativeZoom({ initialTransform })

    expect(transform.value).toEqual(initialTransform)
  })

  it('should generate correct transform string', () => {
    const { transform, transformString } = useNativeZoom()

    transform.value = { x: 10, y: 20, k: 1.5 }

    expect(transformString.value).toBe('translate(10, 20) scale(1.5)')
  })

  it('should handle zoom in', () => {
    const { transform, zoomIn } = useNativeZoom()

    zoomIn(2)

    expect(transform.value.k).toBe(2)
  })

  it('should handle zoom out', () => {
    const { transform, zoomOut } = useNativeZoom()

    transform.value.k = 4
    zoomOut(2)

    expect(transform.value.k).toBe(2)
  })

  it('should clamp scale within bounds', () => {
    const { transform, zoomIn, zoomOut } = useNativeZoom({
      bounds: { minScale: 0.5, maxScale: 3 },
    })

    // Test max bound
    zoomIn(10)
    expect(transform.value.k).toBe(3)

    // Test min bound
    zoomOut(20)
    expect(transform.value.k).toBe(0.5)
  })

  it('should handle zoom to fit', () => {
    const { transform, zoomToFit } = useNativeZoom()

    const bounds = { x: 0, y: 0, width: 200, height: 100 }
    const containerWidth = 800
    const containerHeight = 600

    zoomToFit(bounds, containerWidth, containerHeight)

    // Should scale to fit with padding
    expect(transform.value.k).toBeGreaterThan(0)
    expect(transform.value.x).toBeDefined()
    expect(transform.value.y).toBeDefined()
  })

  it('should reset zoom', () => {
    const { transform, resetZoom } = useNativeZoom()

    transform.value = { x: 100, y: 50, k: 2 }
    resetZoom()

    expect(transform.value).toEqual({ x: 0, y: 0, k: 1 })
  })

  it('should call onTransformChange callback', () => {
    const onTransformChange = vi.fn()
    const { zoomIn } = useNativeZoom({ onTransformChange })

    zoomIn(2)

    expect(onTransformChange).toHaveBeenCalledWith({ x: 0, y: 0, k: 2 })
  })

  it('should handle wheel events for zooming', () => {
    const { handleWheel, transform } = useNativeZoom()

    const mockEvent = {
      preventDefault: vi.fn(),
      deltaY: -100, // Zoom in
      clientX: 400,
      clientY: 300,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
    } as any

    handleWheel(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(transform.value.k).toBeGreaterThan(1)
  })

  it('should handle mouse down for panning', () => {
    const { handleMouseDown, isDragging } = useNativeZoom()

    const mockEvent = {
      button: 0,
      clientX: 100,
      clientY: 50,
      preventDefault: vi.fn(),
    } as any

    handleMouseDown(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(isDragging.value).toBe(false) // Not dragging until mouse moves
  })

  it('should handle mouse move for panning', () => {
    const { handleMouseDown, handleMouseMove, transform, isDragging } = useNativeZoom()

    // Start drag
    const mouseDownEvent = {
      button: 0,
      clientX: 100,
      clientY: 50,
      preventDefault: vi.fn(),
    } as any

    handleMouseDown(mouseDownEvent)

    // Move mouse significantly
    const mouseMoveEvent = {
      clientX: 110,
      clientY: 60,
    } as any

    handleMouseMove(mouseMoveEvent)

    expect(isDragging.value).toBe(true)
    expect(transform.value.x).toBe(10)
    expect(transform.value.y).toBe(10)
  })

  it('should handle mouse up to end panning', () => {
    const { handleMouseDown, handleMouseMove, handleMouseUp, isDragging } = useNativeZoom()

    // Start and perform drag
    handleMouseDown({ button: 0, clientX: 100, clientY: 50, preventDefault: vi.fn() } as any)
    handleMouseMove({ clientX: 110, clientY: 60 } as any)

    expect(isDragging.value).toBe(true)

    // End drag
    handleMouseUp({ button: 0 } as any)

    // Should stop dragging after a small delay
    setTimeout(() => {
      expect(isDragging.value).toBe(false)
    }, 20)
  })

  it('should ignore non-left mouse buttons', () => {
    const { handleMouseDown, handleMouseUp, isDragging } = useNativeZoom()

    // Right mouse button
    handleMouseDown({ button: 2, clientX: 100, clientY: 50, preventDefault: vi.fn() } as any)
    expect(isDragging.value).toBe(false)

    // Middle mouse button
    handleMouseUp({ button: 1 } as any)
    expect(isDragging.value).toBe(false)
  })
})
