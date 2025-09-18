import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

export interface VirtualScrollingOptions {
  itemHeight: number
  containerHeight?: number
  overscan?: number
  threshold?: number
}

export interface VirtualScrollingItem {
  index: number
  top: number
  height: number
}

export function useVirtualScrolling<T>(items: T[], options: VirtualScrollingOptions) {
  const { itemHeight, containerHeight = 400, overscan = 5, threshold = 1000 } = options

  // Refs
  const containerRef = ref<HTMLElement>()
  const scrollTop = ref(0)
  const isVirtualized = computed(() => items.length > threshold)

  // Computed properties for virtual scrolling
  const totalHeight = computed(() => items.length * itemHeight)

  const visibleRange = computed(() => {
    if (!isVirtualized.value) {
      return { start: 0, end: items.length }
    }

    const start = Math.floor(scrollTop.value / itemHeight)
    const end = Math.min(items.length, Math.ceil((scrollTop.value + containerHeight) / itemHeight))

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
    }
  })

  const visibleItems = computed(() => {
    if (!isVirtualized.value) {
      return items.map((item, index) => ({
        item,
        index,
        top: index * itemHeight,
        height: itemHeight,
      }))
    }

    const { start, end } = visibleRange.value
    return items.slice(start, end).map((item, i) => ({
      item,
      index: start + i,
      top: (start + i) * itemHeight,
      height: itemHeight,
    }))
  })

  const offsetY = computed(() => {
    if (!isVirtualized.value) return 0
    return visibleRange.value.start * itemHeight
  })

  // Scroll handling
  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  // Scroll to specific item
  const scrollToItem = async (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.value) return

    const targetScrollTop = index * itemHeight

    await nextTick()
    containerRef.value.scrollTo({
      top: targetScrollTop,
      behavior,
    })
  }

  // Scroll to top
  const scrollToTop = async (behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.value) return

    await nextTick()
    containerRef.value.scrollTo({
      top: 0,
      behavior,
    })
  }

  // Get item at scroll position
  const getItemAtScrollTop = (scrollPosition: number): number => {
    return Math.floor(scrollPosition / itemHeight)
  }

  // Check if item is visible
  const isItemVisible = (index: number): boolean => {
    const { start, end } = visibleRange.value
    return index >= start && index < end
  }

  // Lifecycle
  onMounted(() => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
    }
  })

  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    // Refs
    containerRef,
    scrollTop,

    // Computed
    isVirtualized,
    totalHeight,
    visibleRange,
    visibleItems,
    offsetY,

    // Methods
    scrollToItem,
    scrollToTop,
    getItemAtScrollTop,
    isItemVisible,
    handleScroll,
  }
}
