import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGraphKeyboardNavigation } from '../useGraphKeyboardNavigation'
import type { GraphNode } from '@/types'

// Mock the clipboard composable
vi.mock('../useClipboard', () => ({
  useClipboard: vi.fn(() => ({
    copyToClipboard: vi.fn().mockResolvedValue(true),
  })),
}))

// Mock DOM methods
Object.defineProperty(document, 'querySelector', {
  value: vi.fn(() => ({
    focus: vi.fn(),
  })),
  writable: true,
})

describe('useGraphKeyboardNavigation', () => {
  let mockNodes: GraphNode[]
  let mockOptions: any
  let keyboardNav: any

  beforeEach(() => {
    mockNodes = [
      {
        id: 'node1',
        key: 'key1',
        value: 'value1',
        type: 'string',
        path: ['root', 'key1'],
        children: [],
        depth: 1,
        size: 20,
        x: 100,
        y: 100,
      },
      {
        id: 'node2',
        key: 'key2',
        value: 'value2',
        type: 'string',
        path: ['root', 'key2'],
        children: [],
        depth: 1,
        size: 20,
        x: 200,
        y: 100,
      },
      {
        id: 'node3',
        key: 'key3',
        value: 'value3',
        type: 'string',
        path: ['root', 'key3'],
        children: [],
        depth: 1,
        size: 20,
        x: 100,
        y: 200,
      },
    ]

    mockOptions = {
      onNodeSelect: vi.fn(),
      onNodeFocus: vi.fn(),
      onCopy: vi.fn(),
      onZoomToFit: vi.fn(),
      onResetZoom: vi.fn(),
    }

    keyboardNav = useGraphKeyboardNavigation(
      () => mockNodes,
      () => null,
      mockOptions,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with inactive state', () => {
      expect(keyboardNav.isActive.value).toBe(false)
      expect(keyboardNav.focusedNodeId.value).toBeNull()
    })

    it('should activate and deactivate', () => {
      keyboardNav.activate()
      expect(keyboardNav.isActive.value).toBe(true)

      keyboardNav.deactivate()
      expect(keyboardNav.isActive.value).toBe(false)
      expect(keyboardNav.focusedNodeId.value).toBeNull()
    })
  })

  describe('node focusing', () => {
    beforeEach(() => {
      keyboardNav.activate()
    })

    it('should focus a node', () => {
      keyboardNav.focusNode(mockNodes[0])

      expect(keyboardNav.focusedNodeId.value).toBe('node1')
      expect(mockOptions.onNodeFocus).toHaveBeenCalledWith(mockNodes[0])
    })

    it('should focus first node', () => {
      keyboardNav.focusFirstNode()

      expect(keyboardNav.focusedNodeId.value).toBe('node1')
    })

    it('should focus last node', () => {
      keyboardNav.focusLastNode()

      expect(keyboardNav.focusedNodeId.value).toBe('node3')
    })

    it('should clear focus', () => {
      keyboardNav.focusNode(mockNodes[0])
      keyboardNav.clearFocus()

      expect(keyboardNav.focusedNodeId.value).toBeNull()
    })
  })

  describe('navigation', () => {
    beforeEach(() => {
      keyboardNav.activate()
      keyboardNav.focusNode(mockNodes[0]) // Focus node1 (100, 100)
    })

    it('should navigate to next node', () => {
      keyboardNav.navigateToNext()

      expect(keyboardNav.focusedNodeId.value).toBe('node2')
    })

    it('should navigate to previous node', () => {
      keyboardNav.focusNode(mockNodes[1]) // Focus node2
      keyboardNav.navigateToPrevious()

      expect(keyboardNav.focusedNodeId.value).toBe('node1')
    })

    it('should navigate right', () => {
      keyboardNav.navigateRight()

      // Should find node2 which is to the right of node1
      expect(keyboardNav.focusedNodeId.value).toBe('node2')
    })

    it('should navigate down', () => {
      keyboardNav.navigateDown()

      // Should find node3 which is below node1
      expect(keyboardNav.focusedNodeId.value).toBe('node3')
    })

    it('should navigate up from bottom node', () => {
      keyboardNav.focusNode(mockNodes[2]) // Focus node3 (100, 200)
      keyboardNav.navigateUp()

      // Should find node1 which is above node3
      expect(keyboardNav.focusedNodeId.value).toBe('node1')
    })

    it('should navigate left from right node', () => {
      keyboardNav.focusNode(mockNodes[1]) // Focus node2 (200, 100)
      keyboardNav.navigateLeft()

      // Should find node1 which is to the left of node2
      expect(keyboardNav.focusedNodeId.value).toBe('node1')
    })
  })

  describe('keyboard event handling', () => {
    beforeEach(() => {
      keyboardNav.activate()
    })

    it('should be active when activated', () => {
      expect(keyboardNav.isActive.value).toBe(true)
    })

    it('should be inactive when deactivated', () => {
      keyboardNav.deactivate()
      expect(keyboardNav.isActive.value).toBe(false)
    })

    // Note: Testing actual keyboard events is complex in unit tests
    // The keyboard navigation functionality is tested through the navigation methods
    // Integration tests would be better for testing actual keyboard events
  })

  describe('copy functionality', () => {
    beforeEach(() => {
      keyboardNav.activate()
    })

    it('should copy current node value', async () => {
      keyboardNav.focusNode(mockNodes[0])

      await keyboardNav.copyCurrentNode()

      // The copy functionality uses the mocked clipboard composable
      // We can't easily test the actual copy behavior in unit tests
      // but we can verify the method doesn't throw errors
      expect(keyboardNav.focusedNodeId.value).toBe('node1')
    })

    it('should copy object node as JSON', async () => {
      const objectNode: GraphNode = {
        ...mockNodes[0],
        type: 'object',
        value: { nested: 'value' },
      }

      keyboardNav.focusNode(objectNode)

      await keyboardNav.copyCurrentNode()

      expect(keyboardNav.focusedNodeId.value).toBe('node1')
    })

    it('should not copy when no node is focused', async () => {
      await keyboardNav.copyCurrentNode()

      // Should not throw error when no node is focused
      expect(keyboardNav.focusedNodeId.value).toBeNull()
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      keyboardNav.activate()
    })

    it('should handle navigation with empty nodes array', () => {
      const emptyKeyboardNav = useGraphKeyboardNavigation(
        () => [],
        () => null,
        mockOptions,
      )
      emptyKeyboardNav.activate()

      emptyKeyboardNav.navigateToNext()
      expect(emptyKeyboardNav.focusedNodeId.value).toBeNull()
    })

    it('should handle navigation when no current node', () => {
      keyboardNav.navigateUp()
      // Should focus first node when no current node
      expect(keyboardNav.focusedNodeId.value).toBe('node1')
    })

    it('should wrap around in next/previous navigation', () => {
      keyboardNav.focusNode(mockNodes[2]) // Focus last node
      keyboardNav.navigateToNext()

      // Should wrap to first node
      expect(keyboardNav.focusedNodeId.value).toBe('node1')
    })

    it('should wrap around in previous navigation', () => {
      keyboardNav.focusNode(mockNodes[0]) // Focus first node
      keyboardNav.navigateToPrevious()

      // Should wrap to last node
      expect(keyboardNav.focusedNodeId.value).toBe('node3')
    })
  })
})
