import { describe, it, expect, beforeEach } from 'vitest'
import {
  HierarchicalLayout,
  createHierarchicalLayout,
  calculateLayoutBounds,
} from '../hierarchical-layout'
import type { GraphNode } from '@/types'

describe('HierarchicalLayout', () => {
  let layout: HierarchicalLayout

  beforeEach(() => {
    layout = new HierarchicalLayout({
      nodeSpacing: 80,
      levelSpacing: 200,
      nodeWidth: 160,
      nodeHeight: 80,
      direction: 'horizontal',
      padding: {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      },
    })
  })

  const createMockNodes = (): GraphNode[] => [
    {
      id: 'root',
      key: 'root',
      value: { name: 'John', age: 30, address: {} },
      type: 'object',
      path: [],
      children: ['root.name', 'root.age', 'root.address'],
      depth: 0,
      size: 20,
      width: 160,
      height: 100,
      isExpanded: true,
      hasChildren: true,
      properties: [
        { key: 'name', value: 'John', type: 'string', hasChildNode: false },
        { key: 'age', value: 30, type: 'number', hasChildNode: false },
        {
          key: 'address',
          value: {},
          type: 'object',
          hasChildNode: true,
          childNodeId: 'root.address',
        },
      ],
    },
    {
      id: 'root.address',
      key: 'address',
      value: { street: '123 Main St', city: 'Anytown' },
      type: 'object',
      path: ['address'],
      children: [],
      parent: 'root',
      depth: 1,
      size: 15,
      width: 180,
      height: 80,
      isExpanded: true,
      hasChildren: false,
      properties: [
        { key: 'street', value: '123 Main St', type: 'string', hasChildNode: false },
        { key: 'city', value: 'Anytown', type: 'string', hasChildNode: false },
      ],
    },
  ]

  const createDeepMockNodes = (): GraphNode[] => [
    {
      id: 'root',
      key: 'root',
      value: { level1: {} },
      type: 'object',
      path: [],
      children: ['root.level1'],
      depth: 0,
      size: 20,
      width: 160,
      height: 60,
      isExpanded: true,
      hasChildren: true,
      properties: [
        {
          key: 'level1',
          value: {},
          type: 'object',
          hasChildNode: true,
          childNodeId: 'root.level1',
        },
      ],
    },
    {
      id: 'root.level1',
      key: 'level1',
      value: { level2: {} },
      type: 'object',
      path: ['level1'],
      children: ['root.level1.level2'],
      parent: 'root',
      depth: 1,
      size: 15,
      width: 160,
      height: 60,
      isExpanded: true,
      hasChildren: true,
      properties: [
        {
          key: 'level2',
          value: {},
          type: 'object',
          hasChildNode: true,
          childNodeId: 'root.level1.level2',
        },
      ],
    },
    {
      id: 'root.level1.level2',
      key: 'level2',
      value: { value: 'deep' },
      type: 'object',
      path: ['level1', 'level2'],
      children: [],
      parent: 'root.level1',
      depth: 2,
      size: 15,
      width: 160,
      height: 60,
      isExpanded: true,
      hasChildren: false,
      properties: [{ key: 'value', value: 'deep', type: 'string', hasChildNode: false }],
    },
  ]

  const createArrayMockNodes = (): GraphNode[] => [
    {
      id: 'root',
      key: 'root',
      value: [{ name: 'item1' }, { name: 'item2' }],
      type: 'array',
      path: [],
      children: ['root.0', 'root.1'],
      depth: 0,
      size: 20,
      width: 160,
      height: 80,
      isExpanded: true,
      hasChildren: true,
      properties: [
        {
          key: 0,
          value: { name: 'item1' },
          type: 'object',
          hasChildNode: true,
          childNodeId: 'root.0',
        },
        {
          key: 1,
          value: { name: 'item2' },
          type: 'object',
          hasChildNode: true,
          childNodeId: 'root.1',
        },
      ],
    },
    {
      id: 'root.0',
      key: 0,
      value: { name: 'item1' },
      type: 'object',
      path: ['0'],
      children: [],
      parent: 'root',
      depth: 1,
      size: 15,
      width: 140,
      height: 60,
      isExpanded: true,
      hasChildren: false,
      properties: [{ key: 'name', value: 'item1', type: 'string', hasChildNode: false }],
    },
    {
      id: 'root.1',
      key: 1,
      value: { name: 'item2' },
      type: 'object',
      path: ['1'],
      children: [],
      parent: 'root',
      depth: 1,
      size: 15,
      width: 140,
      height: 60,
      isExpanded: true,
      hasChildren: false,
      properties: [{ key: 'name', value: 'item2', type: 'string', hasChildNode: false }],
    },
  ]

  describe('calculatePositions', () => {
    it('should handle empty node list', () => {
      const result = layout.calculatePositions([])
      expect(result).toEqual([])
    })

    it('should position single node correctly', () => {
      const nodes = [createMockNodes()[0]]
      const result = layout.calculatePositions(nodes)

      expect(result).toHaveLength(1)
      expect(result[0].x).toBe(50) // padding.left
      expect(result[0].y).toBeDefined()
      expect(result[0].width).toBe(160)
      expect(result[0].height).toBe(100)
    })

    it('should position nodes in left-to-right hierarchical layout', () => {
      const nodes = createMockNodes()
      const result = layout.calculatePositions(nodes)

      expect(result).toHaveLength(2)

      // Root node should be at level 0
      const rootNode = result.find((n) => n.id === 'root')
      expect(rootNode?.x).toBe(50) // padding.left + 0 * levelSpacing
      expect(rootNode?.y).toBeDefined()

      // Child node should be at level 1
      const childNode = result.find((n) => n.id === 'root.address')
      expect(childNode?.x).toBe(250) // padding.left + 1 * levelSpacing (50 + 200)
      expect(childNode?.y).toBeDefined()

      // Child should be positioned to the right of parent
      expect(childNode!.x).toBeGreaterThan(rootNode!.x!)
    })

    it('should maintain proper spacing between levels', () => {
      const nodes = createDeepMockNodes()
      const result = layout.calculatePositions(nodes)

      expect(result).toHaveLength(3)

      const level0 = result.find((n) => n.depth === 0)
      const level1 = result.find((n) => n.depth === 1)
      const level2 = result.find((n) => n.depth === 2)

      expect(level0?.x).toBe(50) // padding.left
      expect(level1?.x).toBe(300) // padding.left + updated levelSpacing (50 + 250)
      expect(level2?.x).toBe(550) // padding.left + 2 * updated levelSpacing (50 + 2*250)

      // Verify spacing is consistent
      expect(level1!.x! - level0!.x!).toBe(250) // updated levelSpacing
      expect(level2!.x! - level1!.x!).toBe(250) // updated levelSpacing
    })

    it('should position multiple nodes at same level with proper vertical spacing', () => {
      const nodes = createArrayMockNodes()
      const result = layout.calculatePositions(nodes)

      expect(result).toHaveLength(3)

      // Find nodes at level 1 (the two array items)
      const level1Nodes = result.filter((n) => n.depth === 1).sort((a, b) => a.y! - b.y!)
      expect(level1Nodes).toHaveLength(2)

      // First node should be at base level position
      expect(level1Nodes[0].x).toBe(250) // padding.left + levelSpacing

      // Should have proper vertical spacing
      const verticalSpacing = level1Nodes[1].y! - level1Nodes[0].y!
      expect(verticalSpacing).toBeGreaterThanOrEqual(60 + 100) // nodeHeight + updated nodeSpacing
    })

    it('should add horizontal spacing between overlapping nodes at same level', () => {
      // Create nodes that would overlap vertically
      const overlappingNodes: GraphNode[] = [
        {
          id: 'root',
          key: 'root',
          value: { a: 1, b: 2 },
          type: 'object',
          path: [],
          children: ['root.a', 'root.b'],
          depth: 0,
          size: 20,
          width: 160,
          height: 80,
          isExpanded: true,
          hasChildren: true,
          properties: [],
        },
        {
          id: 'root.a',
          key: 'a',
          value: 1,
          type: 'number',
          path: ['a'],
          children: [],
          parent: 'root',
          depth: 1,
          size: 15,
          width: 100,
          height: 50,
          isExpanded: true,
          hasChildren: false,
          properties: [],
        },
        {
          id: 'root.b',
          key: 'b',
          value: 2,
          type: 'number',
          path: ['b'],
          children: [],
          parent: 'root',
          depth: 1,
          size: 15,
          width: 100,
          height: 50,
          isExpanded: true,
          hasChildren: false,
          properties: [],
        },
      ]

      const result = layout.calculatePositions(overlappingNodes)
      const level1Nodes = result.filter((n) => n.depth === 1).sort((a, b) => a.y! - b.y!)

      // Second node should be positioned to the right if there's vertical overlap
      if (Math.abs(level1Nodes[0].y! - level1Nodes[1].y!) < 50) {
        expect(level1Nodes[1].x).toBeGreaterThan(level1Nodes[0].x!)
      }
    })

    it('should preserve node properties while adding position', () => {
      const nodes = createMockNodes()
      const result = layout.calculatePositions(nodes)

      const originalNode = nodes[0]
      const positionedNode = result.find((n) => n.id === originalNode.id)

      expect(positionedNode?.id).toBe(originalNode.id)
      expect(positionedNode?.key).toBe(originalNode.key)
      expect(positionedNode?.value).toBe(originalNode.value)
      expect(positionedNode?.type).toBe(originalNode.type)
      expect(positionedNode?.path).toEqual(originalNode.path)
      expect(positionedNode?.children).toEqual(originalNode.children)
      expect(positionedNode?.properties).toEqual(originalNode.properties)
      expect(positionedNode?.x).toBeDefined()
      expect(positionedNode?.y).toBeDefined()
    })

    it('should handle nodes with custom dimensions', () => {
      const nodes = createMockNodes()
      // Modify one node to have custom dimensions
      nodes[1].width = 300
      nodes[1].height = 120

      const result = layout.calculatePositions(nodes)
      const customNode = result.find((n) => n.id === nodes[1].id)

      expect(customNode?.width).toBe(300)
      expect(customNode?.height).toBe(120)
    })
  })

  describe('getLayoutBounds', () => {
    it('should return zero bounds for empty nodes', () => {
      const bounds = layout.getLayoutBounds([])
      expect(bounds).toEqual({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      })
    })

    it('should calculate correct bounds for positioned nodes', () => {
      const nodes = createMockNodes()
      const positionedNodes = layout.calculatePositions(nodes)
      const bounds = layout.getLayoutBounds(positionedNodes)

      expect(bounds.minX).toBe(50) // leftmost node x
      expect(bounds.minY).toBeGreaterThanOrEqual(0)
      expect(bounds.maxX).toBeGreaterThan(bounds.minX)
      expect(bounds.maxY).toBeGreaterThan(bounds.minY)
      expect(bounds.width).toBe(bounds.maxX - bounds.minX)
      expect(bounds.height).toBe(bounds.maxY - bounds.minY)
    })
  })

  describe('updateOptions', () => {
    it('should update layout options', () => {
      const newOptions = {
        nodeSpacing: 120,
        levelSpacing: 300,
      }

      layout.updateOptions(newOptions)

      const nodes = createMockNodes()
      const result = layout.calculatePositions(nodes)

      // Verify new spacing is applied
      const level0 = result.find((n) => n.depth === 0)
      const level1 = result.find((n) => n.depth === 1)

      expect(level1!.x! - level0!.x!).toBe(300) // new levelSpacing
    })
  })

  describe('calculateOptimalSpacing', () => {
    it('should calculate optimal spacing based on node content', () => {
      const nodes = createMockNodes()
      const spacing = layout.calculateOptimalSpacing(nodes)

      expect(spacing.nodeSpacing).toBeGreaterThan(0)
      expect(spacing.levelSpacing).toBeGreaterThan(0)
      expect(spacing.nodeSpacing).toBeGreaterThanOrEqual(30) // updated minimum
      expect(spacing.levelSpacing).toBeGreaterThanOrEqual(200) // updated minimum
    })

    it('should return default spacing for empty nodes', () => {
      const spacing = layout.calculateOptimalSpacing([])
      expect(spacing.nodeSpacing).toBe(100) // updated default
      expect(spacing.levelSpacing).toBe(250) // updated default
    })
  })

  describe('validateLayout', () => {
    it('should validate layout without overlaps', () => {
      const nodes = createMockNodes()
      const positionedNodes = layout.calculatePositions(nodes)
      const validation = layout.validateLayout(positionedNodes)

      expect(validation.isValid).toBe(true)
      expect(validation.overlaps).toHaveLength(0)
      expect(validation.issues).toHaveLength(0)
    })

    it('should detect overlapping nodes', () => {
      const nodes = createMockNodes()
      const positionedNodes = layout.calculatePositions(nodes)

      // Force an overlap by setting same position
      positionedNodes[1].x = positionedNodes[0].x
      positionedNodes[1].y = positionedNodes[0].y

      const validation = layout.validateLayout(positionedNodes)

      expect(validation.isValid).toBe(false)
      expect(validation.overlaps).toHaveLength(1)
      expect(validation.overlaps[0]).toEqual({
        nodeA: positionedNodes[0].id,
        nodeB: positionedNodes[1].id,
      })
    })

    it('should detect nodes with negative coordinates', () => {
      const nodes = createMockNodes()
      const positionedNodes = layout.calculatePositions(nodes)

      // Force negative coordinates
      positionedNodes[0].x = -10
      positionedNodes[0].y = -5

      const validation = layout.validateLayout(positionedNodes)

      expect(validation.isValid).toBe(false)
      expect(validation.issues).toContain(`Node ${positionedNodes[0].id} has negative coordinates`)
    })
  })

  describe('getLayoutStats', () => {
    it('should provide layout statistics', () => {
      const nodes = createDeepMockNodes()
      const positionedNodes = layout.calculatePositions(nodes)
      const stats = layout.getLayoutStats(positionedNodes)

      expect(stats.totalNodes).toBe(3)
      expect(stats.levels).toBe(3) // depths 0, 1, 2
      expect(stats.averageNodesPerLevel).toBe(1) // 3 nodes / 3 levels
      expect(stats.layoutBounds).toBeDefined()
      expect(stats.spacing.nodeSpacing).toBe(100)
      expect(stats.spacing.levelSpacing).toBe(250)
    })
  })

  describe('getNodeLayout', () => {
    it('should return layout information for specific node', () => {
      const nodes = createMockNodes()
      layout.calculatePositions(nodes)

      const nodeLayout = layout.getNodeLayout('root')
      expect(nodeLayout).toBeDefined()
      expect(nodeLayout?.node.id).toBe('root')
      expect(nodeLayout?.x).toBeDefined()
      expect(nodeLayout?.y).toBeDefined()
      expect(nodeLayout?.level).toBe(0)
      expect(nodeLayout?.siblings).toBe(1) // only one node at level 0
      expect(nodeLayout?.siblingIndex).toBe(0)
    })

    it('should return undefined for non-existent node', () => {
      const nodes = createMockNodes()
      layout.calculatePositions(nodes)

      const nodeLayout = layout.getNodeLayout('non-existent')
      expect(nodeLayout).toBeUndefined()
    })
  })
})

describe('createHierarchicalLayout utility function', () => {
  it('should create layout with default options', () => {
    const nodes = [
      {
        id: 'root',
        key: 'root',
        value: {},
        type: 'object' as const,
        path: [],
        children: [],
        depth: 0,
        size: 20,
        width: 160,
        height: 80,
        isExpanded: true,
        hasChildren: false,
        properties: [],
      },
    ]

    const result = createHierarchicalLayout(nodes)
    expect(result).toHaveLength(1)
    expect(result[0].x).toBeDefined()
    expect(result[0].y).toBeDefined()
  })

  it('should create layout with custom options', () => {
    const nodes = [
      {
        id: 'root',
        key: 'root',
        value: {},
        type: 'object' as const,
        path: [],
        children: [],
        depth: 0,
        size: 20,
        width: 160,
        height: 80,
        isExpanded: true,
        hasChildren: false,
        properties: [],
      },
    ]

    const result = createHierarchicalLayout(nodes, {
      levelSpacing: 300,
      padding: { top: 100, right: 100, bottom: 100, left: 100 },
    })

    expect(result[0].x).toBe(100) // custom padding.left
  })
})

describe('calculateLayoutBounds utility function', () => {
  it('should calculate bounds for nodes', () => {
    const nodes = [
      {
        id: 'root',
        key: 'root',
        value: {},
        type: 'object' as const,
        path: [],
        children: [],
        depth: 0,
        size: 20,
        width: 160,
        height: 80,
        isExpanded: true,
        hasChildren: false,
        properties: [],
        x: 50,
        y: 50,
      },
    ]

    const bounds = calculateLayoutBounds(nodes)
    expect(bounds.minX).toBe(50)
    expect(bounds.minY).toBe(50)
    expect(bounds.maxX).toBe(210) // 50 + 160
    expect(bounds.maxY).toBe(130) // 50 + 80
    expect(bounds.width).toBe(160)
    expect(bounds.height).toBe(80)
  })
})
