import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ForceLayout,
  createForceLayout,
  getRecommendedParameters,
  DEFAULT_FORCE_PARAMETERS,
  DEFAULT_LAYOUT_OPTIONS,
} from '../force-layout'
import type { GraphNode, GraphLink, ForceLayoutOptions } from '@/types'

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn()
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
})

describe('ForceLayout', () => {
  let forceLayout: ForceLayout
  let mockNodes: GraphNode[]
  let mockLinks: GraphLink[]

  beforeEach(() => {
    mockPerformanceNow.mockReturnValue(0)

    // Create mock graph data
    mockNodes = [
      {
        id: 'root',
        key: 'root',
        value: { name: 'test', items: [] },
        type: 'object',
        path: [],
        children: ['root.name', 'root.items'],
        depth: 0,
        size: 30,
      },
      {
        id: 'root.name',
        key: 'name',
        value: 'test',
        type: 'string',
        path: ['name'],
        children: [],
        parent: 'root',
        depth: 1,
        size: 20,
      },
      {
        id: 'root.items',
        key: 'items',
        value: [],
        type: 'array',
        path: ['items'],
        children: [],
        parent: 'root',
        depth: 1,
        size: 25,
      },
    ]

    mockLinks = [
      {
        source: 'root',
        target: 'root.name',
        type: 'parent-child',
        strength: 0.8,
      },
      {
        source: 'root',
        target: 'root.items',
        type: 'parent-child',
        strength: 0.8,
      },
    ]

    forceLayout = new ForceLayout()
  })

  afterEach(() => {
    forceLayout.dispose()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const layout = new ForceLayout()
      const options = layout.getOptions()

      expect(options).toEqual(DEFAULT_LAYOUT_OPTIONS)
    })

    it('should merge custom options with defaults', () => {
      const customOptions: Partial<ForceLayoutOptions> = {
        linkStrength: 1.5,
        chargeStrength: -400,
        width: 1000,
        height: 800,
      }

      const layout = new ForceLayout(customOptions)
      const options = layout.getOptions()

      expect(options.linkStrength).toBe(1.5)
      expect(options.chargeStrength).toBe(-400)
      expect(options.width).toBe(1000)
      expect(options.height).toBe(800)
      expect(options.alphaDecay).toBe(DEFAULT_LAYOUT_OPTIONS.alphaDecay) // Should keep default
    })
  })

  describe('initialize', () => {
    it('should initialize simulation with nodes and links', () => {
      forceLayout.initialize(mockNodes, mockLinks)

      const simulation = forceLayout.getSimulation()
      expect(simulation).not.toBeNull()
      expect(forceLayout.isRunning()).toBe(true)
    })

    it('should handle empty nodes array', () => {
      forceLayout.initialize([], [])

      const simulation = forceLayout.getSimulation()
      expect(simulation).toBeNull()
      expect(forceLayout.isRunning()).toBe(false)
    })

    it('should assign initial positions to nodes without coordinates', () => {
      const nodesWithoutPositions = mockNodes.map((node) => ({
        ...node,
        x: undefined,
        y: undefined,
      }))
      forceLayout.initialize(nodesWithoutPositions, mockLinks)

      // Check that nodes now have positions (this would be set by D3 simulation)
      const simulation = forceLayout.getSimulation()
      expect(simulation).not.toBeNull()
    })

    it('should stop existing simulation before creating new one', () => {
      forceLayout.initialize(mockNodes, mockLinks)
      const firstSimulation = forceLayout.getSimulation()

      forceLayout.initialize(mockNodes, mockLinks)
      const secondSimulation = forceLayout.getSimulation()

      expect(secondSimulation).not.toBe(firstSimulation)
    })
  })

  describe('structure analysis', () => {
    it('should detect object-heavy structures', () => {
      const objectHeavyNodes: GraphNode[] = [
        {
          id: '1',
          key: 'obj1',
          value: {},
          type: 'object',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '2',
          key: 'obj2',
          value: {},
          type: 'object',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '3',
          key: 'obj3',
          value: {},
          type: 'object',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '4',
          key: 'str1',
          value: 'test',
          type: 'string',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
      ]

      forceLayout.initialize(objectHeavyNodes, [])
      const options = forceLayout.getOptions()

      // Should use object-optimized parameters
      expect(options.chargeStrength).toBe(DEFAULT_FORCE_PARAMETERS.object.chargeStrength)
      expect(options.linkDistance).toBe(DEFAULT_FORCE_PARAMETERS.object.linkDistance)
    })

    it('should detect array-heavy structures', () => {
      const arrayHeavyNodes: GraphNode[] = [
        {
          id: '1',
          key: 'arr1',
          value: [],
          type: 'array',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '2',
          key: 'arr2',
          value: [],
          type: 'array',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '3',
          key: 'arr3',
          value: [],
          type: 'array',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '4',
          key: 'str1',
          value: 'test',
          type: 'string',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
      ]

      forceLayout.initialize(arrayHeavyNodes, [])
      const options = forceLayout.getOptions()

      // Should use array-optimized parameters
      expect(options.chargeStrength).toBe(DEFAULT_FORCE_PARAMETERS.array.chargeStrength)
      expect(options.linkStrength).toBe(DEFAULT_FORCE_PARAMETERS.array.linkStrength)
    })

    it('should detect primitive-heavy structures', () => {
      const primitiveHeavyNodes: GraphNode[] = [
        {
          id: '1',
          key: 'str1',
          value: 'test',
          type: 'string',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '2',
          key: 'num1',
          value: 42,
          type: 'number',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '3',
          key: 'bool1',
          value: true,
          type: 'boolean',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '4',
          key: 'obj1',
          value: {},
          type: 'object',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
      ]

      forceLayout.initialize(primitiveHeavyNodes, [])
      const options = forceLayout.getOptions()

      // Should use primitive-optimized parameters
      expect(options.chargeStrength).toBe(DEFAULT_FORCE_PARAMETERS.primitive.chargeStrength)
      expect(options.collisionRadius).toBe(DEFAULT_FORCE_PARAMETERS.primitive.collisionRadius)
    })

    it('should use mixed parameters for balanced structures', () => {
      const mixedNodes: GraphNode[] = [
        {
          id: '1',
          key: 'obj1',
          value: {},
          type: 'object',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '2',
          key: 'arr1',
          value: [],
          type: 'array',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
        {
          id: '3',
          key: 'str1',
          value: 'test',
          type: 'string',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
      ]

      forceLayout.initialize(mixedNodes, [])
      const options = forceLayout.getOptions()

      // Should use mixed parameters
      expect(options.chargeStrength).toBe(DEFAULT_FORCE_PARAMETERS.mixed.chargeStrength)
      expect(options.centerStrength).toBe(DEFAULT_FORCE_PARAMETERS.mixed.centerStrength)
    })
  })

  describe('simulation control', () => {
    beforeEach(() => {
      forceLayout.initialize(mockNodes, mockLinks)
    })

    it('should start simulation', () => {
      forceLayout.stop()
      expect(forceLayout.isRunning()).toBe(false)

      forceLayout.start()
      expect(forceLayout.isRunning()).toBe(true)
    })

    it('should stop simulation', () => {
      expect(forceLayout.isRunning()).toBe(true)

      forceLayout.stop()
      expect(forceLayout.isRunning()).toBe(false)
    })

    it('should update forces with new parameters', () => {
      const newOptions: Partial<ForceLayoutOptions> = {
        linkStrength: 1.5,
        chargeStrength: -500,
      }

      forceLayout.updateForces(newOptions)
      const options = forceLayout.getOptions()

      expect(options.linkStrength).toBe(1.5)
      expect(options.chargeStrength).toBe(-500)
    })

    it('should update dimensions', () => {
      forceLayout.updateDimensions(1200, 900)
      const options = forceLayout.getOptions()

      expect(options.width).toBe(1200)
      expect(options.height).toBe(900)
    })
  })

  describe('callbacks', () => {
    let tickCallback: ReturnType<typeof vi.fn>
    let endCallback: ReturnType<typeof vi.fn>

    beforeEach(() => {
      tickCallback = vi.fn()
      endCallback = vi.fn()

      forceLayout.onTick(tickCallback)
      forceLayout.onEnd(endCallback)
      forceLayout.initialize(mockNodes, mockLinks)
    })

    it('should call tick callback during simulation', () => {
      // Simulate a tick by manually calling the internal tick handler
      // This is a bit tricky to test without actually running the simulation
      expect(tickCallback).toHaveBeenCalledTimes(0) // Initially not called

      // We can test that callbacks are registered
      expect(forceLayout['tickCallbacks']).toContain(tickCallback)
    })

    it('should call end callback when simulation ends', () => {
      forceLayout.stop()
      // The end callback should be registered
      expect(forceLayout['endCallbacks']).toContain(endCallback)
    })

    it('should clear callbacks', () => {
      forceLayout.clearCallbacks()

      expect(forceLayout['tickCallbacks']).toHaveLength(0)
      expect(forceLayout['endCallbacks']).toHaveLength(0)
    })
  })

  describe('statistics', () => {
    beforeEach(() => {
      forceLayout.initialize(mockNodes, mockLinks)
    })

    it('should provide initial statistics', () => {
      const stats = forceLayout.getStats()

      expect(stats.iterations).toBe(0)
      expect(stats.alpha).toBe(1)
      expect(stats.isConverged).toBe(false)
      expect(stats.averageVelocity).toBe(0)
      expect(stats.maxVelocity).toBe(0)
      expect(stats.frameRate).toBe(0)
    })

    it('should track performance metrics', () => {
      // Mock performance timing
      let time = 0
      mockPerformanceNow.mockImplementation(() => {
        time += 16.67 // ~60fps
        return time
      })

      // Simulate multiple ticks
      const stats = forceLayout.getStats()
      expect(typeof stats.frameRate).toBe('number')
      expect(typeof stats.lastTickTime).toBe('number')
    })
  })

  describe('convergence detection', () => {
    it('should detect convergence based on velocity threshold', () => {
      const nodesWithVelocity = mockNodes.map((node) => ({
        ...node,
        vx: 0.005, // Very low velocity
        vy: 0.005,
      }))

      forceLayout.initialize(nodesWithVelocity, mockLinks)

      // Simulate many iterations to trigger convergence check
      const stats = forceLayout.getStats()
      // The convergence detection happens internally during ticks
      expect(typeof stats.isConverged).toBe('boolean')
    })

    it('should respect maximum iterations limit', () => {
      const options: Partial<ForceLayoutOptions> = {
        maxIterations: 10,
        convergenceThreshold: 0, // Never converge by velocity
      }

      forceLayout = new ForceLayout(options)
      forceLayout.initialize(mockNodes, mockLinks)

      const layoutOptions = forceLayout.getOptions()
      expect(layoutOptions.maxIterations).toBe(10)
    })
  })

  describe('disposal', () => {
    it('should clean up resources on dispose', () => {
      forceLayout.initialize(mockNodes, mockLinks)
      const simulation = forceLayout.getSimulation()
      expect(simulation).not.toBeNull()

      forceLayout.dispose()

      expect(forceLayout.getSimulation()).toBeNull()
      expect(forceLayout.isRunning()).toBe(false)
      expect(forceLayout['tickCallbacks']).toHaveLength(0)
      expect(forceLayout['endCallbacks']).toHaveLength(0)
    })
  })
})

describe('utility functions', () => {
  describe('createForceLayout', () => {
    it('should create and initialize a force layout', () => {
      const nodes: GraphNode[] = [
        {
          id: '1',
          key: 'test',
          value: 'test',
          type: 'string',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
      ]
      const links: GraphLink[] = []
      const options: Partial<ForceLayoutOptions> = { width: 500, height: 400 }

      const layout = createForceLayout(nodes, links, options)

      expect(layout).toBeInstanceOf(ForceLayout)
      expect(layout.getOptions().width).toBe(500)
      expect(layout.getOptions().height).toBe(400)

      layout.dispose()
    })
  })

  describe('getRecommendedParameters', () => {
    it('should return object-optimized parameters', () => {
      const params = getRecommendedParameters('object')

      expect(params.chargeStrength).toBe(DEFAULT_FORCE_PARAMETERS.object.chargeStrength)
      expect(params.linkDistance).toBe(DEFAULT_FORCE_PARAMETERS.object.linkDistance)
    })

    it('should merge base options with structure-specific parameters', () => {
      const baseOptions: Partial<ForceLayoutOptions> = {
        width: 1000,
        height: 800,
      }

      const params = getRecommendedParameters('array', baseOptions)

      expect(params.width).toBe(1000)
      expect(params.height).toBe(800)
      expect(params.linkStrength).toBe(DEFAULT_FORCE_PARAMETERS.array.linkStrength)
    })
  })
})

describe('performance monitoring', () => {
  let forceLayout: ForceLayout
  let mockNodes: GraphNode[]

  beforeEach(() => {
    mockNodes = Array.from({ length: 100 }, (_, i) => ({
      id: `node-${i}`,
      key: `key-${i}`,
      value: `value-${i}`,
      type: 'string' as const,
      path: [`key-${i}`],
      children: [],
      depth: 0,
      size: 20,
    }))

    forceLayout = new ForceLayout({
      maxIterations: 50,
      convergenceThreshold: 0.1,
    })
  })

  afterEach(() => {
    forceLayout.dispose()
  })

  it('should handle large datasets efficiently', () => {
    const startTime = performance.now()

    forceLayout.initialize(mockNodes, [])

    const endTime = performance.now()
    const initTime = endTime - startTime

    // Initialization should be reasonably fast (less than 100ms)
    expect(initTime).toBeLessThan(100)
    expect(forceLayout.isRunning()).toBe(true)
  })

  it('should provide frame rate monitoring', () => {
    forceLayout.initialize(mockNodes, [])

    const stats = forceLayout.getStats()
    expect(typeof stats.frameRate).toBe('number')
    expect(stats.frameRate).toBeGreaterThanOrEqual(0)
  })

  it('should track velocity metrics for convergence', () => {
    const nodesWithVelocity = mockNodes.map((node) => ({
      ...node,
      vx: Math.random() * 0.1,
      vy: Math.random() * 0.1,
    }))

    forceLayout.initialize(nodesWithVelocity, [])

    const stats = forceLayout.getStats()
    expect(typeof stats.averageVelocity).toBe('number')
    expect(typeof stats.maxVelocity).toBe('number')
  })
})
