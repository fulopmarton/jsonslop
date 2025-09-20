import { describe, it, expect } from 'vitest'
import {
  getPropertyConnectionPoint,
  getNodeEntryPoint,
  findSourceConnectionPoint,
  generateCurvedPath,
  calculateLinkPath,
  calculateLinkPaths,
  getCurvePathMidpoint,
  getPathAngleAtEnd,
} from '../link-paths'
import type { GraphNode, GraphLink } from '@/types'

describe('Link Paths Utilities', () => {
  const createMockNode = (
    id: string,
    x: number,
    y: number,
    properties: Array<{ key: string | number; hasChildNode: boolean; childNodeId?: string }>,
  ): GraphNode => ({
    id,
    key: id,
    value: {},
    type: 'object',
    path: id === 'root' ? [] : [id],
    x,
    y,
    width: 160,
    height: 80,
    children: [],
    depth: 0,
    size: 20,
    isExpanded: true,
    hasChildren: false,
    properties: properties.map((p) => ({
      key: p.key,
      value: 'test',
      type: 'string' as const,
      hasChildNode: p.hasChildNode,
      childNodeId: p.childNodeId,
    })),
  })

  describe('getPropertyConnectionPoint', () => {
    it('should calculate connection point for a property with child node', () => {
      const node = createMockNode('root', 100, 50, [
        { key: 'prop1', hasChildNode: false },
        { key: 'prop2', hasChildNode: true, childNodeId: 'child' },
        { key: 'prop3', hasChildNode: false },
      ])

      const connectionPoint = getPropertyConnectionPoint(node, 'prop2')

      expect(connectionPoint).toBeDefined()
      expect(connectionPoint?.x).toBe(260) // 100 + 160 (nodeWidth)
      expect(connectionPoint?.y).toBe(104) // 50 + 24 + (1 * 20) + 10 (y + headerHeight + propertyIndex * propertyHeight + propertyHeight/2)
      expect(connectionPoint?.propertyIndex).toBe(1)
    })

    it('should return null for property without child node', () => {
      const node = createMockNode('root', 100, 50, [{ key: 'prop1', hasChildNode: false }])

      const connectionPoint = getPropertyConnectionPoint(node, 'prop1')

      expect(connectionPoint).toBeNull()
    })

    it('should return null for non-existent property', () => {
      const node = createMockNode('root', 100, 50, [{ key: 'prop1', hasChildNode: true }])

      const connectionPoint = getPropertyConnectionPoint(node, 'nonexistent')

      expect(connectionPoint).toBeNull()
    })

    it('should use actual node width for wider nodes', () => {
      const wideNode = createMockNode('root', 100, 50, [
        {
          key: 'this_is_a_very_long_property_name_that_should_make_the_node_wider',
          hasChildNode: true,
          childNodeId: 'child',
        },
      ])
      // Simulate a wider node (like what would be calculated by calculateNodeWidth)
      wideNode.width = 280

      const connectionPoint = getPropertyConnectionPoint(
        wideNode,
        'this_is_a_very_long_property_name_that_should_make_the_node_wider',
      )

      expect(connectionPoint).toBeDefined()
      expect(connectionPoint?.x).toBe(380) // 100 + 280 (actual node width, not default 150)
      expect(connectionPoint?.y).toBe(84) // 50 + 24 + (0 * 20) + 10
    })
  })

  describe('getNodeEntryPoint', () => {
    it('should calculate entry point at left center of node', () => {
      const node = createMockNode('child', 300, 100, [])

      const entryPoint = getNodeEntryPoint(node)

      expect(entryPoint.x).toBe(300) // node.x
      expect(entryPoint.y).toBe(140) // 100 + 80/2 (y + nodeHeight/2)
    })

    it('should use actual node height for taller nodes', () => {
      const tallNode = createMockNode('child', 300, 100, [])
      // Simulate a taller node (like what would be calculated by calculateNodeHeight)
      tallNode.height = 120

      const entryPoint = getNodeEntryPoint(tallNode)

      expect(entryPoint.x).toBe(300) // node.x
      expect(entryPoint.y).toBe(160) // 100 + 120/2 (y + actual node height/2)
    })
  })

  describe('findSourceConnectionPoint', () => {
    it('should find connection point for target node key', () => {
      const sourceNode = createMockNode('root', 100, 50, [
        { key: 'child', hasChildNode: true, childNodeId: 'root.child' },
      ])
      const targetNode = createMockNode('child', 300, 100, [])
      targetNode.path = ['child']

      const connectionPoint = findSourceConnectionPoint(sourceNode, targetNode)

      expect(connectionPoint).toBeDefined()
      expect(connectionPoint?.x).toBe(260) // 100 + 160
      expect(connectionPoint?.y).toBe(84) // 50 + 24 + 0 * 20 + 10 (first property)
    })

    it('should return null if no matching property found', () => {
      const sourceNode = createMockNode('root', 100, 50, [{ key: 'other', hasChildNode: true }])
      const targetNode = createMockNode('child', 300, 100, [])
      targetNode.path = ['child']

      const connectionPoint = findSourceConnectionPoint(sourceNode, targetNode)

      expect(connectionPoint).toBeNull()
    })
  })

  describe('generateCurvedPath', () => {
    it('should generate a curved SVG path', () => {
      const source = { x: 100, y: 50 }
      const target = { x: 300, y: 150 }

      const path = generateCurvedPath(source, target, 0.5)

      expect(path).toMatch(/^M 100 50 C/)
      expect(path).toContain('300 150')
      expect(path.split(' ')).toHaveLength(10) // M x y C x1 y1, x2 y2, x y (with commas)
    })

    it('should handle different curvature values', () => {
      const source = { x: 0, y: 0 }
      const target = { x: 200, y: 100 }

      const path1 = generateCurvedPath(source, target, 0.3)
      const path2 = generateCurvedPath(source, target, 0.7)

      expect(path1).not.toBe(path2)
      expect(path1).toContain('M 0 0 C')
      expect(path2).toContain('M 0 0 C')
    })
  })

  describe('calculateLinkPath', () => {
    it('should calculate complete link path', () => {
      const sourceNode = createMockNode('root', 100, 50, [
        { key: 'child', hasChildNode: true, childNodeId: 'root.child' },
      ])
      const targetNode = createMockNode('child', 300, 100, [])
      targetNode.path = ['child']

      const link: GraphLink = {
        source: 'root',
        target: 'child',
        type: 'parent-child',
      }

      const linkPath = calculateLinkPath(link, [sourceNode, targetNode])

      expect(linkPath).toBeDefined()
      expect(linkPath?.path).toMatch(/^M 260 84 C/)
      expect(linkPath?.sourcePoint.x).toBe(260)
      expect(linkPath?.sourcePoint.y).toBe(84)
      expect(linkPath?.targetPoint.x).toBe(300)
      expect(linkPath?.targetPoint.y).toBe(140)
    })

    it('should handle missing nodes gracefully', () => {
      const link: GraphLink = {
        source: 'nonexistent',
        target: 'alsononexistent',
        type: 'parent-child',
      }

      const linkPath = calculateLinkPath(link, [])

      expect(linkPath).toBeNull()
    })

    it('should provide fallback when no property connection found', () => {
      const sourceNode = createMockNode('root', 100, 50, [])
      const targetNode = createMockNode('child', 300, 100, [])

      const link: GraphLink = {
        source: 'root',
        target: 'child',
        type: 'parent-child',
      }

      const linkPath = calculateLinkPath(link, [sourceNode, targetNode])

      expect(linkPath).toBeDefined()
      expect(linkPath?.sourcePoint.x).toBe(260) // fallback to right edge of source
      expect(linkPath?.sourcePoint.y).toBe(90) // center of source node
    })
  })

  describe('calculateLinkPaths', () => {
    it('should calculate paths for multiple links', () => {
      const nodes = [
        createMockNode('root', 100, 50, [
          { key: 'child1', hasChildNode: true },
          { key: 'child2', hasChildNode: true },
        ]),
        createMockNode('child1', 300, 80, []),
        createMockNode('child2', 300, 150, []),
      ]
      nodes[1].path = ['child1']
      nodes[2].path = ['child2']

      const links: GraphLink[] = [
        { source: 'root', target: 'child1', type: 'parent-child' },
        { source: 'root', target: 'child2', type: 'parent-child' },
      ]

      const linkPaths = calculateLinkPaths(links, nodes)

      expect(linkPaths.size).toBe(2)
      expect(linkPaths.has('root-child1')).toBe(true)
      expect(linkPaths.has('root-child2')).toBe(true)
    })
  })

  describe('getCurvePathMidpoint', () => {
    it('should calculate midpoint of curved path', () => {
      const linkPath = {
        path: 'M 100 50 C 150 50, 250 100, 300 100',
        sourcePoint: { x: 100, y: 50 },
        targetPoint: { x: 300, y: 100 },
      }

      const midpoint = getCurvePathMidpoint(linkPath)

      expect(midpoint.x).toBe(200) // (100 + 300) / 2
      expect(midpoint.y).toBe(75) // (50 + 100) / 2
    })
  })

  describe('getPathAngleAtEnd', () => {
    it('should calculate angle from source to target', () => {
      const linkPath = {
        path: 'M 0 0 C 50 0, 150 100, 200 100',
        sourcePoint: { x: 0, y: 0 },
        targetPoint: { x: 200, y: 100 },
      }

      const angle = getPathAngleAtEnd(linkPath)

      // Angle should be approximately 26.57 degrees (arctan(100/200))
      expect(angle).toBeCloseTo(26.57, 1)
    })

    it('should handle vertical paths', () => {
      const linkPath = {
        path: 'M 100 0 C 100 50, 100 50, 100 100',
        sourcePoint: { x: 100, y: 0 },
        targetPoint: { x: 100, y: 100 },
      }

      const angle = getPathAngleAtEnd(linkPath)

      expect(angle).toBe(90) // Straight down
    })
  })
})
