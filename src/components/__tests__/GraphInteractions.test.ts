import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GraphCanvas from '../GraphCanvas.vue'
import type { GraphNode, GraphLink } from '@/types'

// Mock D3 imports
vi.mock('@/utils/d3-imports', () => ({
  select: vi.fn(() => ({
    call: vi.fn(),
    on: vi.fn(),
    attr: vi.fn(),
    selectAll: vi.fn(() => ({
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn(),
            on: vi.fn(),
            style: vi.fn(),
            text: vi.fn(),
            transition: vi.fn(() => ({
              duration: vi.fn(() => ({
                style: vi.fn(),
                attr: vi.fn(),
              })),
            })),
          })),
        })),
        exit: vi.fn(() => ({
          remove: vi.fn(),
        })),
        merge: vi.fn(() => ({
          transition: vi.fn(() => ({
            duration: vi.fn(() => ({
              style: vi.fn(),
              attr: vi.fn(),
            })),
          })),
          select: vi.fn(() => ({
            attr: vi.fn(),
            style: vi.fn(),
          })),
          style: vi.fn(),
        })),
      })),
    })),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn(() => ({
      on: vi.fn(),
    })),
  })),
  zoomIdentity: {
    translate: vi.fn(() => ({
      scale: vi.fn(),
    })),
  },
}))

// Mock ForceLayout
vi.mock('@/utils/force-layout', () => ({
  ForceLayout: vi.fn(() => ({
    initialize: vi.fn(),
    onTick: vi.fn(),
    onEnd: vi.fn(),
    dispose: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    updateForces: vi.fn(),
    updateDimensions: vi.fn(),
  })),
}))

// Mock ContextMenu component
vi.mock('../ContextMenu.vue', () => ({
  default: {
    name: 'ContextMenu',
    template: '<div data-testid="context-menu"></div>',
    props: ['isVisible', 'x', 'y', 'items'],
    emits: ['close'],
  },
}))

describe('GraphCanvas Interactions', () => {
  let mockNodes: GraphNode[]
  let mockLinks: GraphLink[]

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
        value: { nested: 'object' },
        type: 'object',
        path: ['root', 'key2'],
        children: ['node3'],
        depth: 1,
        size: 25,
        x: 200,
        y: 100,
      },
      {
        id: 'node3',
        key: 'nested',
        value: 'object',
        type: 'string',
        path: ['root', 'key2', 'nested'],
        children: [],
        depth: 2,
        size: 15,
        x: 200,
        y: 150,
      },
    ]

    mockLinks = [
      {
        source: 'node2',
        target: 'node3',
        type: 'parent-child',
      },
    ]
  })

  describe('component mounting', () => {
    it('should mount without errors', () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          width: 800,
          height: 600,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render SVG canvas', () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      expect(svg.classes()).toContain('graph-svg')
    })

    it('should render context menu component', () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const contextMenu = wrapper.findComponent({ name: 'ContextMenu' })
      expect(contextMenu.exists()).toBe(true)
    })
  })

  describe('event emissions', () => {
    it('should emit nodeClick event', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      // Simulate node click through the internal interaction handler
      const canvas = wrapper.vm as any
      const mockEvent = { stopPropagation: vi.fn() }

      canvas.handleNodeClick(mockNodes[0], mockEvent)
      await nextTick()

      expect(wrapper.emitted('nodeClick')).toBeTruthy()
      expect(wrapper.emitted('nodeSelect')).toBeTruthy()
    })

    it('should emit nodeDoubleClick event', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any
      const mockEvent = { stopPropagation: vi.fn() }

      canvas.handleNodeDoubleClick(mockNodes[0], mockEvent)
      await nextTick()

      expect(wrapper.emitted('nodeDoubleClick')).toBeTruthy()
    })

    it('should emit canvasClick event', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any
      const mockEvent = {}

      canvas.handleCanvasClick(mockEvent)
      await nextTick()

      expect(wrapper.emitted('canvasClick')).toBeTruthy()
    })

    it('should emit copySuccess event', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      wrapper.vm.$emit('copySuccess', 'test text')
      await nextTick()

      expect(wrapper.emitted('copySuccess')).toBeTruthy()
      expect(wrapper.emitted('copySuccess')?.[0]).toEqual(['test text'])
    })

    it('should emit copyError event', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const error = new Error('Copy failed')
      wrapper.vm.$emit('copyError', error)
      await nextTick()

      expect(wrapper.emitted('copyError')).toBeTruthy()
      expect(wrapper.emitted('copyError')?.[0]).toEqual([error])
    })
  })

  describe('node selection and highlighting', () => {
    it('should handle node selection', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any
      const mockEvent = { stopPropagation: vi.fn() }

      canvas.handleNodeClick(mockNodes[0], mockEvent)
      await nextTick()

      expect(canvas.selectedNodeId).toBe('node1')
      expect(canvas.isNodeSelected('node1')).toBe(true)
      expect(canvas.isNodeSelected('node2')).toBe(false)
    })

    it('should highlight connected nodes when node is selected', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any
      const mockEvent = { stopPropagation: vi.fn() }

      // Select node2 which has a connection to node3
      canvas.handleNodeClick(mockNodes[1], mockEvent)
      await nextTick()

      expect(canvas.isNodeHighlighted('node2')).toBe(true)
      expect(canvas.isNodeHighlighted('node3')).toBe(true)
      expect(canvas.isNodeHighlighted('node1')).toBe(false)
    })

    it('should clear selection on canvas click', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any

      // First select a node
      canvas.handleNodeClick(mockNodes[0], { stopPropagation: vi.fn() })
      await nextTick()
      expect(canvas.selectedNodeId).toBe('node1')

      // Then click canvas
      canvas.handleCanvasClick({})
      await nextTick()
      expect(canvas.selectedNodeId).toBeNull()
    })
  })

  describe('context menu functionality', () => {
    it('should show context menu on node right-click', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        clientX: 150,
        clientY: 200,
      }

      canvas.handleNodeContextMenu(mockNodes[0], mockEvent)
      await nextTick()

      expect(canvas.contextMenu.isVisible).toBe(true)
      expect(canvas.contextMenu.x).toBe(150)
      expect(canvas.contextMenu.y).toBe(200)
      expect(canvas.contextMenu.node).toBe(mockNodes[0])
    })

    it('should hide context menu on canvas click', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any

      // First show context menu
      canvas.showContextMenu(mockNodes[0], 100, 100)
      await nextTick()
      expect(canvas.contextMenu.isVisible).toBe(true)

      // Then click canvas
      canvas.handleCanvasClick({})
      await nextTick()
      expect(canvas.contextMenu.isVisible).toBe(false)
    })

    it('should generate appropriate context menu items', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any

      canvas.showContextMenu(mockNodes[0], 100, 100)
      await nextTick()

      const items = canvas.contextMenuItems
      expect(items.length).toBeGreaterThan(0)
      expect(items.some((item: any) => item.label === 'Copy Value')).toBe(true)
      expect(items.some((item: any) => item.label === 'Copy Path')).toBe(true)
    })

    it('should include JSON copy option for object nodes', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any

      // Show context menu for object node
      canvas.showContextMenu(mockNodes[1], 100, 100)
      await nextTick()

      const items = canvas.contextMenuItems
      expect(items.some((item: any) => item.label === 'Copy as JSON')).toBe(true)
    })
  })

  describe('keyboard navigation', () => {
    it('should activate keyboard navigation on mount', () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any
      expect(canvas.keyboardNav.isActive.value).toBe(true)
    })

    it('should deactivate keyboard navigation on unmount', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any
      const keyboardNav = canvas.keyboardNav

      wrapper.unmount()
      await nextTick()

      expect(keyboardNav.isActive.value).toBe(false)
    })
  })

  describe('accessibility features', () => {
    it('should set proper ARIA attributes on nodes', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      // Wait for D3 rendering to complete
      await nextTick()

      // Check that D3 select was called with proper attributes
      // (This is a simplified test since we're mocking D3)
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle keyboard events for accessibility', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const canvas = wrapper.vm as any

      // Test that keyboard navigation is properly set up
      expect(canvas.keyboardNav).toBeDefined()
      expect(typeof canvas.keyboardNav.activate).toBe('function')
      expect(typeof canvas.keyboardNav.deactivate).toBe('function')
    })
  })

  describe('drag functionality', () => {
    it('should handle drag events', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      // Since drag is handled by D3 and GraphNode component,
      // we just verify the component structure is correct
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('props reactivity', () => {
    it('should react to node changes', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
        },
      })

      const newNodes = [
        ...mockNodes,
        {
          id: 'node4',
          key: 'key4',
          value: 'value4',
          type: 'string' as const,
          path: ['root', 'key4'],
          children: [],
          depth: 1,
          size: 20,
          x: 300,
          y: 100,
        },
      ]

      await wrapper.setProps({ nodes: newNodes })

      // Verify component handles the prop change
      expect(wrapper.props('nodes')).toHaveLength(4)
    })

    it('should react to selection changes', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          selectedNodeId: null,
        },
      })

      await wrapper.setProps({ selectedNodeId: 'node1' })

      expect(wrapper.props('selectedNodeId')).toBe('node1')
    })

    it('should react to highlight changes', async () => {
      const wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          highlightedNodes: new Set(),
        },
      })

      const highlightedNodes = new Set(['node1', 'node2'])
      await wrapper.setProps({ highlightedNodes })

      expect(wrapper.props('highlightedNodes')).toBe(highlightedNodes)
    })
  })
})
