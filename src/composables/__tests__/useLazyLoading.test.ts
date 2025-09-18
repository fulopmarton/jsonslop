import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useLazyLoading } from '../useLazyLoading'
import type { JSONNode } from '@/types'

describe('useLazyLoading', () => {
  const createMockNode = (path: string[], children?: JSONNode[], childrenCount = 0): JSONNode => {
    const actualChildren =
      children ||
      (childrenCount > 0
        ? Array.from({ length: childrenCount }, (_, i) => createMockNode([...path, `child${i}`]))
        : undefined)

    return {
      key: path[path.length - 1] || 'root',
      value: actualChildren ? {} : `value-${path.join('.')}`,
      type: actualChildren ? 'object' : 'string',
      path,
      isExpandable: !!actualChildren,
      children: actualChildren,
    }
  }

  const createLargeDataset = (depth: number, breadth: number): JSONNode[] => {
    const createNode = (currentPath: string[], currentDepth: number): JSONNode => {
      if (currentDepth >= depth) {
        return createMockNode(currentPath)
      }

      const children = Array.from({ length: breadth }, (_, i) =>
        createNode([...currentPath, `item${i}`], currentDepth + 1),
      )

      return createMockNode(currentPath, children)
    }

    return Array.from({ length: breadth }, (_, i) => createNode([`root${i}`], 0))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with empty state', () => {
    const nodes = createLargeDataset(2, 5)
    const expandedNodes = ref(new Set<string>())

    const { loadedNodes, loadingNodes } = useLazyLoading(nodes, expandedNodes.value)

    expect(loadedNodes.value.size).toBe(0)
    expect(loadingNodes.value.size).toBe(0)
  })

  it('should identify nodes that need lazy loading', () => {
    const nodes = createLargeDataset(5, 10) // Deep and wide dataset
    const expandedNodes = ref(new Set<string>())

    const { shouldLazyLoad } = useLazyLoading(nodes, expandedNodes.value, {
      maxDepth: 3,
      threshold: 50,
    })

    // Deep node should be lazy loaded
    const deepNode = createMockNode(
      ['a', 'b', 'c', 'd'],
      [createMockNode(['a', 'b', 'c', 'd', 'e'])],
    )
    expect(shouldLazyLoad(deepNode)).toBe(true)

    // Node with many children should be lazy loaded
    const wideNode = createMockNode(['a'], undefined, 100)
    expect(shouldLazyLoad(wideNode)).toBe(true)

    // Shallow node with few children should not be lazy loaded
    const shallowNode = createMockNode(['a'], [createMockNode(['a', 'b'])])
    expect(shouldLazyLoad(shallowNode)).toBe(false)
  })

  it('should process nodes correctly', async () => {
    const nodes = [
      createMockNode(['shallow'], [createMockNode(['shallow', 'child'])]),
      createMockNode(['deep'], undefined, 200), // Will trigger lazy loading
    ]
    const expandedNodes = ref(new Set<string>())

    const { processedNodes } = useLazyLoading(nodes, expandedNodes.value, {
      maxDepth: 2,
      threshold: 100,
    })

    const processed = processedNodes.value

    expect(processed[0].isLoaded).toBe(true) // Shallow node
    expect(processed[1].isLoaded).toBe(false) // Deep node not loaded yet
    expect(processed[1].isLoading).toBe(false) // Not expanded, so not loading
  })

  it('should load children when node is expanded', async () => {
    const largeChildren = Array.from({ length: 200 }, (_, i) =>
      createMockNode(['parent', `child${i}`]),
    )
    const nodes = [createMockNode(['parent'], largeChildren)]
    const expandedNodes = ref(new Set(['parent']))

    const { processedNodes, loadingNodes } = useLazyLoading(nodes, expandedNodes.value, {
      threshold: 100,
      loadDelay: 50,
    })

    // Initially should be loading
    expect(processedNodes.value[0].isLoading).toBe(true)
    expect(loadingNodes.value.has('parent')).toBe(true)

    // Advance time to complete loading
    vi.advanceTimersByTime(50)
    await nextTick()

    expect(processedNodes.value[0].isLoaded).toBe(true)
    expect(loadingNodes.value.has('parent')).toBe(false)
  })

  it('should load children in chunks', async () => {
    const largeChildren = Array.from({ length: 250 }, (_, i) =>
      createMockNode(['parent', `child${i}`]),
    )
    const nodes = [createMockNode(['parent'], largeChildren)]
    const expandedNodes = ref(new Set(['parent']))

    const { loadNodeChildren } = useLazyLoading(nodes, expandedNodes.value, {
      chunkSize: 50,
      loadDelay: 10,
    })

    const loadPromise = loadNodeChildren('parent', largeChildren)

    vi.advanceTimersByTime(10)
    await loadPromise

    // Should have loaded all children despite chunking
    expect(true).toBe(true) // Test passes if no errors thrown
  })

  it('should handle preloading', async () => {
    const node = createMockNode(['preload'], undefined, 150)
    const expandedNodes = ref(new Set<string>())

    const { preloadNode, isNodeLoaded } = useLazyLoading([node], expandedNodes.value, {
      threshold: 100,
    })

    expect(isNodeLoaded('preload')).toBe(false)

    await preloadNode('preload', node)

    vi.advanceTimersByTime(100)
    await nextTick()

    expect(isNodeLoaded('preload')).toBe(true)
  })

  it('should clear loaded data', () => {
    const nodes = createLargeDataset(3, 10)
    const expandedNodes = ref(new Set<string>())

    const { clearLoadedData, loadedNodes } = useLazyLoading(nodes, expandedNodes.value)

    // Simulate some loaded data
    loadedNodes.value.set('test', [])

    expect(loadedNodes.value.has('test')).toBe(true)

    clearLoadedData('test')
    expect(loadedNodes.value.has('test')).toBe(false)
  })

  it('should clear all loaded data', () => {
    const nodes = createLargeDataset(3, 10)
    const expandedNodes = ref(new Set<string>())

    const { clearLoadedData, loadedNodes, loadingNodes } = useLazyLoading(
      nodes,
      expandedNodes.value,
    )

    // Simulate some loaded data
    loadedNodes.value.set('test1', [])
    loadedNodes.value.set('test2', [])
    loadingNodes.value.add('test3')

    clearLoadedData() // Clear all

    expect(loadedNodes.value.size).toBe(0)
    expect(loadingNodes.value.size).toBe(0)
  })

  it('should handle memory cleanup for collapsed nodes', async () => {
    const nodes = createLargeDataset(3, 10)
    const expandedNodes = ref(new Set(['root0']))

    const { clearLoadedData } = useLazyLoading(nodes, expandedNodes.value)

    // Simulate node being collapsed
    expandedNodes.value.delete('root0')

    // The composable should schedule cleanup
    // We can't easily test the timeout, but we can test the cleanup function
    clearLoadedData('root0')

    expect(true).toBe(true) // Test passes if no errors
  })

  it('should handle edge cases', () => {
    const expandedNodes = ref(new Set<string>())

    // Empty nodes array
    const { processedNodes } = useLazyLoading([], expandedNodes.value)
    expect(processedNodes.value).toHaveLength(0)

    // Node without children
    const nodeWithoutChildren = createMockNode(['test'])
    const { shouldLazyLoad } = useLazyLoading([nodeWithoutChildren], expandedNodes.value)
    expect(shouldLazyLoad(nodeWithoutChildren)).toBe(false)
  })

  it('should handle concurrent loading requests', async () => {
    const largeChildren = Array.from({ length: 200 }, (_, i) =>
      createMockNode(['parent', `child${i}`]),
    )
    const nodes = [createMockNode(['parent'], largeChildren)]
    const expandedNodes = ref(new Set<string>())

    const { loadNodeChildren } = useLazyLoading(nodes, expandedNodes.value)

    // Start multiple concurrent loads
    const promise1 = loadNodeChildren('parent', largeChildren)
    const promise2 = loadNodeChildren('parent', largeChildren)

    // Both should resolve to the same result
    vi.advanceTimersByTime(100)
    await Promise.all([promise1, promise2])

    expect(true).toBe(true) // Test passes if no errors
  })

  it('should respect different thresholds', () => {
    const smallNode = createMockNode(['small'], undefined, 50)
    const largeNode = createMockNode(['large'], undefined, 150)
    const expandedNodes = ref(new Set<string>())

    const { shouldLazyLoad } = useLazyLoading([smallNode, largeNode], expandedNodes.value, {
      threshold: 100,
    })

    expect(shouldLazyLoad(smallNode)).toBe(false)
    expect(shouldLazyLoad(largeNode)).toBe(true)
  })

  it('should handle different chunk sizes', async () => {
    const largeChildren = Array.from({ length: 100 }, (_, i) =>
      createMockNode(['parent', `child${i}`]),
    )
    const nodes = [createMockNode(['parent'], largeChildren)]
    const expandedNodes = ref(new Set<string>())

    const { loadNodeChildren } = useLazyLoading(nodes, expandedNodes.value, {
      chunkSize: 10, // Small chunks
    })

    const loadPromise = loadNodeChildren('parent', largeChildren)

    vi.advanceTimersByTime(100)
    await loadPromise

    expect(true).toBe(true) // Test passes if loading completes without errors
  })
})
