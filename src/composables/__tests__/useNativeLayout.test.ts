import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNativeLayout } from '../useNativeLayout'
import type { GraphNode, GraphLink } from '@/types'

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16)
  return 1
})
global.cancelAnimationFrame = vi.fn()

describe('useNativeLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createMockNodes = (): GraphNode[] => [
    {
      id: 'node1',
      key: 'root',
      value: {},
      type: 'object',
      path: [],
      children: ['node2', 'node3'],
      depth: 0,
      size: 20,
      width: 160,
      height: 80,
      isExpanded: true,
      hasChildren: true,
      properties: [],
    },
    {
      id: 'node2',
      key: 'child1',
      value: 'test',
      type: 'string',
      path: ['child1'],
      children: [],
      parent: 'node1',
      depth: 1,
      size: 15,
      width: 140,
      height: 60,
      isExpanded: true,
      hasChildren: false,
      properties: [],
    },
    {
      id: 'node3',
      key: 'child2',
      value: 42,
      type: 'number',
      path: ['child2'],
      children: [],
      parent: 'node1',
      depth: 1,
      size: 15,
      width: 140,
      height: 60,
      isExpanded: true,
      hasChildren: false,
      properties: [],
    },
  ]

  const createMockLinks = (): GraphLink[] => [
    {
      source: 'node1',
      target: 'node2',
      type: 'parent-child',
    },
    {
      source: 'node1',
      target: 'node3',
      type: 'parent-child',
    },
  ]

  it('should initialize with default options', () => {
    const layout = useNativeLayout()

    expect(layout.nodes.value).toEqual([])
    expect(layout.links.value).toEqual([])
    expect(layout.isRunning.value).toBe(false)
    expect(layout.stats.value.iterations).toBe(0)
  })

  it('should initialize with custom options', () => {
    const options = {
      width: 1000,
      height: 800,
      nodeSpacing: 100,
      levelSpacing: 200,
    }

    const layout = useNativeLayout(options)

    // Options should be applied (we can't directly test them, but they affect behavior)
    expect(layout.nodes.value).toEqual([])
  })

  it('should initialize layout with nodes and links', () => {
    const layout = useNativeLayout({ layoutType: 'hierarchical' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)

    expect(layout.nodes.value).toHaveLength(3)
    expect(layout.links.value).toEqual(links)
    expect(layout.stats.value.iterations).toBe(0)
    expect(layout.stats.value.alpha).toBe(0) // Hierarchical layout is immediately converged
    expect(layout.stats.value.isConverged).toBe(true)
  })

  it('should initialize force layout with nodes and links', () => {
    const layout = useNativeLayout({ layoutType: 'force' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)

    expect(layout.nodes.value).toHaveLength(3)
    expect(layout.links.value).toEqual(links)
    expect(layout.stats.value.iterations).toBe(0)
    expect(layout.stats.value.alpha).toBe(1) // Force layout starts with alpha = 1
    expect(layout.stats.value.isConverged).toBe(false)
  })

  it('should position nodes hierarchically', () => {
    const layout = useNativeLayout({
      width: 800,
      height: 600,
      levelSpacing: 200,
      layoutType: 'hierarchical',
    })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)

    // Root node should be at depth 0
    const rootNode = layout.nodes.value.find((n) => n.id === 'node1')
    expect(rootNode?.x).toBe(50) // padding.left
    expect(rootNode?.y).toBeDefined()

    // Child nodes should be at depth 1
    const childNode = layout.nodes.value.find((n) => n.id === 'node2')
    expect(childNode?.x).toBe(250) // padding.left + levelSpacing (50 + 200)
    expect(childNode?.y).toBeDefined()
  })

  it('should start and stop layout animation for force layout', () => {
    const layout = useNativeLayout({ layoutType: 'force' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)

    expect(layout.isRunning.value).toBe(false)

    layout.start()
    expect(layout.isRunning.value).toBe(true)

    layout.stop()
    expect(layout.isRunning.value).toBe(false)
  })

  it('should not animate for hierarchical layout', () => {
    const layout = useNativeLayout({ layoutType: 'hierarchical' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)

    expect(layout.isRunning.value).toBe(false)
    expect(layout.stats.value.isConverged).toBe(true)

    layout.start()
    expect(layout.isRunning.value).toBe(false) // Should remain false for hierarchical
  })

  it('should call tick callbacks during force animation', async () => {
    const layout = useNativeLayout({ iterations: 5, layoutType: 'force' })
    const tickCallback = vi.fn()
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.onTick(tickCallback)
    layout.initialize(nodes, links)
    layout.start()

    // Fast forward through animation frames
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(16)
      await vi.runAllTimersAsync()
    }

    expect(tickCallback).toHaveBeenCalled()
  })

  it('should call end callbacks when force animation completes', async () => {
    const layout = useNativeLayout({ iterations: 2, layoutType: 'force' })
    const endCallback = vi.fn()
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.onEnd(endCallback)
    layout.initialize(nodes, links)
    layout.start()

    // Fast forward through animation frames until completion
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(16)
      await vi.runAllTimersAsync()
    }

    expect(endCallback).toHaveBeenCalled()
  })

  it('should call end callbacks immediately for hierarchical layout', () => {
    const layout = useNativeLayout({ layoutType: 'hierarchical' })
    const endCallback = vi.fn()
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.onEnd(endCallback)
    layout.initialize(nodes, links)
    layout.start()

    expect(endCallback).toHaveBeenCalled()
  })

  it('should update layout options', () => {
    const layout = useNativeLayout()

    layout.updateOptions({
      width: 1200,
      height: 900,
      nodeSpacing: 120,
    })

    // Options should be updated (we can't directly test them, but they affect behavior)
    expect(layout.nodes.value).toEqual([])
  })

  it('should handle empty node list', () => {
    const layout = useNativeLayout()

    layout.initialize([], [])

    expect(layout.nodes.value).toEqual([])
    expect(layout.links.value).toEqual([])
  })

  it('should update node positions during force simulation', async () => {
    const layout = useNativeLayout({ iterations: 3, layoutType: 'force' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)

    // Store initial positions
    const initialPositions = layout.nodes.value.map((n) => ({ x: n.x, y: n.y }))

    layout.start()

    // Fast forward through a few animation frames
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(16)
      await vi.runAllTimersAsync()
    }

    // Positions should have changed (due to forces)
    const finalPositions = layout.nodes.value.map((n) => ({ x: n.x, y: n.y }))

    // At least some positions should be different
    const positionsChanged = finalPositions.some(
      (pos, i) => pos.x !== initialPositions[i].x || pos.y !== initialPositions[i].y,
    )

    expect(positionsChanged).toBe(true)
  })

  it('should maintain fixed positions for hierarchical layout', () => {
    const layout = useNativeLayout({ layoutType: 'hierarchical' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)

    // Store initial positions
    const initialPositions = layout.nodes.value.map((n) => ({ x: n.x, y: n.y }))

    layout.start()

    // Positions should remain the same for hierarchical layout
    const finalPositions = layout.nodes.value.map((n) => ({ x: n.x, y: n.y }))

    expect(finalPositions).toEqual(initialPositions)
  })

  it('should update stats during force simulation', async () => {
    const layout = useNativeLayout({ iterations: 3, layoutType: 'force' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)
    layout.start()

    // Fast forward through animation frames
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(16)
      await vi.runAllTimersAsync()
    }

    expect(layout.stats.value.iterations).toBeGreaterThan(0)
    expect(layout.stats.value.alpha).toBeLessThan(1)
    expect(layout.stats.value.lastTickTime).toBeGreaterThan(0)
  })

  it('should have converged stats for hierarchical layout', () => {
    const layout = useNativeLayout({ layoutType: 'hierarchical' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)

    expect(layout.stats.value.iterations).toBe(0)
    expect(layout.stats.value.alpha).toBe(0)
    expect(layout.stats.value.isConverged).toBe(true)
  })

  it('should stop force animation when max iterations reached', async () => {
    const layout = useNativeLayout({ iterations: 2, layoutType: 'force' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)
    layout.start()

    expect(layout.isRunning.value).toBe(true)

    // Fast forward through enough frames to exceed max iterations
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(16)
      await vi.runAllTimersAsync()
    }

    expect(layout.isRunning.value).toBe(false)
  })

  it('should stop force animation when converged', async () => {
    const layout = useNativeLayout({ iterations: 100, layoutType: 'force' })
    const nodes = createMockNodes()
    const links = createMockLinks()

    layout.initialize(nodes, links)
    layout.start()

    // Fast forward through many frames to allow convergence
    for (let i = 0; i < 50; i++) {
      vi.advanceTimersByTime(16)
      await vi.runAllTimersAsync()
    }

    // Should eventually converge and stop
    expect(layout.stats.value.isConverged).toBe(true)
    expect(layout.isRunning.value).toBe(false)
  })
})
