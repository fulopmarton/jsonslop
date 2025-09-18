import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useVirtualScrolling } from '../useVirtualScrolling'

describe('useVirtualScrolling', () => {
  const mockItems = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: `Value ${i}`,
  }))

  const defaultOptions = {
    itemHeight: 32,
    containerHeight: 400,
    overscan: 5,
    threshold: 100,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct default values', () => {
    const { scrollTop, isVirtualized, totalHeight } = useVirtualScrolling(mockItems, defaultOptions)

    expect(scrollTop.value).toBe(0)
    expect(isVirtualized.value).toBe(true) // 1000 items > 100 threshold
    expect(totalHeight.value).toBe(32000) // 1000 * 32
  })

  it('should not virtualize small datasets', () => {
    const smallItems = mockItems.slice(0, 50)
    const { isVirtualized, visibleItems } = useVirtualScrolling(smallItems, defaultOptions)

    expect(isVirtualized.value).toBe(false) // 50 items < 100 threshold
    expect(visibleItems.value).toHaveLength(50)
  })

  it('should calculate visible range correctly', () => {
    const { visibleRange, scrollTop } = useVirtualScrolling(mockItems, defaultOptions)

    // At scroll position 0
    expect(visibleRange.value.start).toBe(0)
    expect(visibleRange.value.end).toBeLessThanOrEqual(mockItems.length)

    // Simulate scrolling
    scrollTop.value = 320 // 10 items down
    expect(visibleRange.value.start).toBeGreaterThanOrEqual(0)
    expect(visibleRange.value.end).toBeLessThanOrEqual(mockItems.length)
  })

  it('should include overscan in visible items', () => {
    const { visibleItems, visibleRange } = useVirtualScrolling(mockItems, defaultOptions)

    const expectedVisibleCount = Math.min(
      mockItems.length,
      Math.ceil(defaultOptions.containerHeight / defaultOptions.itemHeight) +
        defaultOptions.overscan * 2,
    )

    expect(visibleItems.value.length).toBeLessThanOrEqual(expectedVisibleCount)
  })

  it('should calculate offset correctly', () => {
    const { offsetY, scrollTop } = useVirtualScrolling(mockItems, defaultOptions)

    scrollTop.value = 320 // 10 items down
    const expectedStart = Math.max(0, Math.floor(320 / 32) - 5) // overscan
    expect(offsetY.value).toBe(expectedStart * 32)
  })

  it('should handle scroll to item', async () => {
    const mockScrollTo = vi.fn()
    const mockContainer = {
      scrollTo: mockScrollTo,
    } as any

    const { containerRef, scrollToItem } = useVirtualScrolling(mockItems, defaultOptions)
    containerRef.value = mockContainer

    await scrollToItem(50)

    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 1600, // 50 * 32
      behavior: 'smooth',
    })
  })

  it('should handle scroll to top', async () => {
    const mockScrollTo = vi.fn()
    const mockContainer = {
      scrollTo: mockScrollTo,
    } as any

    const { containerRef, scrollToTop } = useVirtualScrolling(mockItems, defaultOptions)
    containerRef.value = mockContainer

    await scrollToTop()

    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    })
  })

  it('should get item at scroll position', () => {
    const { getItemAtScrollTop } = useVirtualScrolling(mockItems, defaultOptions)

    expect(getItemAtScrollTop(0)).toBe(0)
    expect(getItemAtScrollTop(320)).toBe(10) // 320 / 32
    expect(getItemAtScrollTop(1600)).toBe(50) // 1600 / 32
  })

  it('should check if item is visible', () => {
    const { isItemVisible, scrollTop } = useVirtualScrolling(mockItems, defaultOptions)

    scrollTop.value = 320 // Around item 10

    expect(isItemVisible(0)).toBe(false) // Too far up
    expect(isItemVisible(10)).toBe(true) // Should be visible
    expect(isItemVisible(500)).toBe(false) // Too far down
  })

  it('should handle scroll events', () => {
    const { handleScroll, scrollTop } = useVirtualScrolling(mockItems, defaultOptions)

    const mockEvent = {
      target: { scrollTop: 640 },
    } as any

    handleScroll(mockEvent)
    expect(scrollTop.value).toBe(640)
  })

  it('should handle edge cases', () => {
    // Empty items array
    const { visibleItems, totalHeight } = useVirtualScrolling([], defaultOptions)
    expect(visibleItems.value).toHaveLength(0)
    expect(totalHeight.value).toBe(0)

    // Single item
    const singleItem = [mockItems[0]]
    const { isVirtualized: singleVirtualized } = useVirtualScrolling(singleItem, defaultOptions)
    expect(singleVirtualized.value).toBe(false)
  })

  it('should handle different item heights', () => {
    const customOptions = { ...defaultOptions, itemHeight: 50 }
    const { totalHeight, getItemAtScrollTop } = useVirtualScrolling(mockItems, customOptions)

    expect(totalHeight.value).toBe(50000) // 1000 * 50
    expect(getItemAtScrollTop(500)).toBe(10) // 500 / 50
  })

  it('should handle different container heights', () => {
    const customOptions = { ...defaultOptions, containerHeight: 800 }
    const { visibleRange } = useVirtualScrolling(mockItems, customOptions)

    // Should show more items with larger container
    const itemsInView = Math.ceil(800 / 32)
    expect(visibleRange.value.end - visibleRange.value.start).toBeGreaterThan(itemsInView)
  })
})
