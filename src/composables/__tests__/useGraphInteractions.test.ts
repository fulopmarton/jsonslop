import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGraphInteractions } from '../useGraphInteractions'
import type { GraphNode } from '@/types'

// Mock the clipboard composable
vi.mock('../useClipboard', () => ({
  useClipboard: vi.fn(() => ({
    copyToClipboard: vi.fn().mockResolvedValue(true),
  })),
}))

describe('useGraphInteractions', () => {
  let mockNode: GraphNode
  let mockOptions: any

  beforeEach(() => {
    mockNode = {
      id: 'test-node-1',
      key: 'testKey',
      value: 'testValue',
      type: 'string',
      path: ['root', 'testKey'],
      children: [],
      depth: 1,
      size: 20,
    }

    mockOptions = {
      onNodeSelect: vi.fn(),
      onNodeDoubleClick: vi.fn(),
      onCopySuccess: vi.fn(),
      onCopyError: vi.fn(),
    }
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const interactions = useGraphInteractions()

      expect(interactions.selectedNodeId.value).toBeNull()
      expect(interactions.highlightedNodes.value.size).toBe(0)
      expect(interactions.hoveredNodeId.value).toBeNull()
      expect(interactions.contextMenu.value.isVisible).toBe(false)
    })
  })

  describe('node selection', () => {
    it('should select a node', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.selectNode('test-node-1')

      expect(interactions.selectedNodeId.value).toBe('test-node-1')
      expect(interactions.isNodeSelected('test-node-1')).toBe(true)
      expect(interactions.isNodeSelected('other-node')).toBe(false)
    })

    it('should clear selection', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.selectNode('test-node-1')
      interactions.clearSelection()

      expect(interactions.selectedNodeId.value).toBeNull()
      expect(interactions.highlightedNodes.value.size).toBe(0)
    })
  })

  describe('node highlighting', () => {
    it('should highlight nodes', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.highlightNodes(['node1', 'node2'])

      expect(interactions.highlightedNodes.value.has('node1')).toBe(true)
      expect(interactions.highlightedNodes.value.has('node2')).toBe(true)
      expect(interactions.isNodeHighlighted('node1')).toBe(true)
    })

    it('should add and remove highlighted nodes', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.addHighlightedNode('node1')
      expect(interactions.isNodeHighlighted('node1')).toBe(true)

      interactions.removeHighlightedNode('node1')
      expect(interactions.isNodeHighlighted('node1')).toBe(false)
    })

    it('should clear all highlights', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.highlightNodes(['node1', 'node2'])
      interactions.clearHighlights()

      expect(interactions.highlightedNodes.value.size).toBe(0)
    })
  })

  describe('event handlers', () => {
    it('should handle node click', () => {
      const interactions = useGraphInteractions(mockOptions)
      const mockEvent = { stopPropagation: vi.fn() } as any

      interactions.handleNodeClick(mockNode, mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(interactions.selectedNodeId.value).toBe('test-node-1')
      expect(mockOptions.onNodeSelect).toHaveBeenCalledWith(mockNode)
    })

    it('should handle node double click', () => {
      const interactions = useGraphInteractions(mockOptions)
      const mockEvent = { stopPropagation: vi.fn() } as any

      interactions.handleNodeDoubleClick(mockNode, mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(mockOptions.onNodeDoubleClick).toHaveBeenCalledWith(mockNode)
    })

    it('should handle node context menu', () => {
      const interactions = useGraphInteractions(mockOptions)
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 100,
        clientY: 200,
      } as any

      interactions.handleNodeContextMenu(mockNode, mockEvent)

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(interactions.contextMenu.value.isVisible).toBe(true)
      expect(interactions.contextMenu.value.x).toBe(100)
      expect(interactions.contextMenu.value.y).toBe(200)
      expect(interactions.contextMenu.value.node).toStrictEqual(mockNode)
    })

    it('should handle node hover', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.handleNodeHover(mockNode)
      expect(interactions.hoveredNodeId.value).toBe('test-node-1')

      interactions.handleNodeHover(null)
      expect(interactions.hoveredNodeId.value).toBeNull()
    })

    it('should handle canvas click', () => {
      const interactions = useGraphInteractions(mockOptions)

      // Set up some state first
      interactions.selectNode('test-node-1')
      interactions.showContextMenu(mockNode, 100, 200)

      interactions.handleCanvasClick({} as any)

      expect(interactions.selectedNodeId.value).toBeNull()
      expect(interactions.contextMenu.value.isVisible).toBe(false)
    })
  })

  describe('context menu', () => {
    it('should show context menu', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.showContextMenu(mockNode, 150, 250)

      expect(interactions.contextMenu.value.isVisible).toBe(true)
      expect(interactions.contextMenu.value.x).toBe(150)
      expect(interactions.contextMenu.value.y).toBe(250)
      expect(interactions.contextMenu.value.node).toStrictEqual(mockNode)
    })

    it('should hide context menu', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.showContextMenu(mockNode, 150, 250)
      interactions.hideContextMenu()

      expect(interactions.contextMenu.value.isVisible).toBe(false)
      expect(interactions.contextMenu.value.node).toBeNull()
    })

    it('should generate context menu items for string node', () => {
      const interactions = useGraphInteractions(mockOptions)

      interactions.showContextMenu(mockNode, 100, 200)
      const items = interactions.contextMenuItems.value

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((item) => item.label === 'Copy Value')).toBe(true)
      expect(items.some((item) => item.label === 'Copy Path')).toBe(true)
      expect(items.some((item) => item.label === 'Copy Key')).toBe(true)
    })

    it('should generate context menu items for object node', () => {
      const objectNode: GraphNode = {
        ...mockNode,
        type: 'object',
        value: { nested: 'value' },
      }

      const interactions = useGraphInteractions(mockOptions)

      interactions.showContextMenu(objectNode, 100, 200)
      const items = interactions.contextMenuItems.value

      expect(items.some((item) => item.label === 'Copy as JSON')).toBe(true)
    })
  })

  describe('connected nodes', () => {
    it('should find connected node IDs', () => {
      const interactions = useGraphInteractions(mockOptions)
      const links = [
        { source: 'node1', target: 'node2' },
        { source: 'node2', target: 'node3' },
        { source: 'node4', target: 'node1' },
      ]

      const connected = interactions.getConnectedNodeIds('node1', links)

      expect(connected).toContain('node2')
      expect(connected).toContain('node4')
      expect(connected).not.toContain('node3')
    })

    it('should highlight connected nodes', () => {
      const interactions = useGraphInteractions(mockOptions)
      const links = [
        { source: 'node1', target: 'node2' },
        { source: 'node2', target: 'node3' },
      ]

      interactions.highlightConnectedNodes('node1', links)

      expect(interactions.isNodeHighlighted('node1')).toBe(true)
      expect(interactions.isNodeHighlighted('node2')).toBe(true)
      expect(interactions.isNodeHighlighted('node3')).toBe(false)
    })
  })

  describe('copy functions', () => {
    it('should copy node value', async () => {
      const interactions = useGraphInteractions(mockOptions)

      await interactions.copyNodeValue(mockNode)

      // Context menu should be hidden after copy
      expect(interactions.contextMenu.value.isVisible).toBe(false)
    })

    it('should copy node path', async () => {
      const interactions = useGraphInteractions(mockOptions)

      await interactions.copyNodePath(mockNode)

      expect(interactions.contextMenu.value.isVisible).toBe(false)
    })

    it('should copy node key', async () => {
      const interactions = useGraphInteractions(mockOptions)

      await interactions.copyNodeKey(mockNode)

      expect(interactions.contextMenu.value.isVisible).toBe(false)
    })

    it('should copy object node as JSON', async () => {
      const objectNode: GraphNode = {
        ...mockNode,
        type: 'object',
        value: { nested: 'value' },
      }

      const interactions = useGraphInteractions(mockOptions)

      await interactions.copyNodeAsJSON(objectNode)

      expect(interactions.contextMenu.value.isVisible).toBe(false)
    })

    it('should copy formatted node', async () => {
      const interactions = useGraphInteractions(mockOptions)

      await interactions.copyNodeFormatted(mockNode)

      expect(interactions.contextMenu.value.isVisible).toBe(false)
    })
  })
})
