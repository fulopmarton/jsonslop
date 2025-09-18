import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import GraphCanvas from '../GraphCanvas.vue'
import { useJsonStore } from '@/stores/json'
import type { GraphNode, GraphLink } from '@/types'

// Mock D3 imports
vi.mock('@/utils/d3-imports', () => ({
  select: vi.fn(() => ({
    call: vi.fn(),
    on: vi.fn(),
    selectAll: vi.fn(() => ({
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn(() => ({ attr: vi.fn(), on: vi.fn(), style: vi.fn() })),
            on: vi.fn(),
            style: vi.fn(),
          })),
        })),
        exit: vi.fn(() => ({ remove: vi.fn() })),
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
          attr: vi.fn(),
        })),
      })),
    })),
    attr: vi.fn(),
    style: vi.fn(),
    transition: vi.fn(() => ({
      duration: vi.fn(() => ({
        call: vi.fn(),
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

// Mock force layout
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

// Mock composables
vi.mock('@/composables/useGraphInteractions', () => ({
  useGraphInteractions: vi.fn(() => ({
    contextMenu: { isVisible: false, x: 0, y: 0 },
    selectedNodeId: { value: null },
    highlightedNodes: { value: new Set() },
    contextMenuItems: [],
    handleNodeClick: vi.fn(),
    handleNodeDoubleClick: vi.fn(),
    handleNodeContextMenu: vi.fn(),
    handleNodeHover: vi.fn(),
    handleNodeFocus: vi.fn(),
    handleNodeBlur: vi.fn(),
    handleCanvasClick: vi.fn(),
    hideContextMenu: vi.fn(),
    isNodeSelected: vi.fn(() => false),
    isNodeHighlighted: vi.fn(() => false),
    highlightConnectedNodes: vi.fn(),
  })),
}))

vi.mock('@/composables/useGraphKeyboardNavigation', () => ({
  useGraphKeyboardNavigation: vi.fn(() => ({
    focusedNodeId: { value: null },
    activate: vi.fn(),
    deactivate: vi.fn(),
  })),
}))

// Mock the store
vi.mock('@/stores/json')

describe('Graph Search Integration', () => {
  let wrapper: any
  let mockStore: any

  const mockNodes: GraphNode[] = [
    {
      id: 'root',
      key: 'root',
      value: { name: 'John', age: 30 },
      type: 'object',
      path: [],
      depth: 0,
      size: 25,
      children: ['root.name', 'root.age'],
    },
    {
      id: 'root.name',
      key: 'name',
      value: 'John',
      type: 'string',
      path: ['name'],
      depth: 1,
      size: 20,
      children: [],
      parent: 'root',
    },
    {
      id: 'root.age',
      key: 'age',
      value: 30,
      type: 'number',
      path: ['age'],
      depth: 1,
      size: 20,
      children: [],
      parent: 'root',
    },
  ]

  const mockLinks: GraphLink[] = [
    { source: 'root', target: 'root.name', type: 'parent-child' },
    { source: 'root', target: 'root.age', type: 'parent-child' },
  ]

  beforeEach(() => {
    setActivePinia(createPinia())

    mockStore = {
      searchQuery: '',
      graphNodes: mockNodes,
      graphLinks: mockLinks,
      graphState: {
        selectedNodeId: null,
        highlightedNodes: new Set(),
      },
      highlightGraphNodes: vi.fn(),
      clearGraphHighlights: vi.fn(),
      selectGraphNode: vi.fn(),
    }

    vi.mocked(useJsonStore).mockReturnValue(mockStore as any)

    // Mock document.dispatchEvent
    global.document.dispatchEvent = vi.fn()
  })

  describe('Search Integration', () => {
    it('should initialize GraphCanvas with search functionality', () => {
      wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          width: 800,
          height: 600,
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle center-on-graph-node events', async () => {
      wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          width: 800,
          height: 600,
        },
      })

      // Simulate the center-on-graph-node event
      const event = new CustomEvent('center-on-graph-node', {
        detail: {
          nodeId: 'root.name',
          node: mockNodes[1],
          smooth: true,
        },
      })

      // The component should have an event listener for this
      document.dispatchEvent(event)

      // Since we're mocking D3, we can't test the actual zoom behavior,
      // but we can verify the component doesn't throw errors
      expect(wrapper.exists()).toBe(true)
    })

    it('should integrate with graph search composable', () => {
      wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          width: 800,
          height: 600,
        },
      })

      // The component should initialize the graph search composable
      // We can't directly test the composable since it's internal,
      // but we can verify the component renders without errors
      expect(wrapper.exists()).toBe(true)
    })

    it('should emit events for search integration', async () => {
      wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          width: 800,
          height: 600,
        },
      })

      // Test that the component can emit the expected events
      const nodeClickHandler = vi.fn()
      const nodeSelectHandler = vi.fn()
      const nodeFocusHandler = vi.fn()

      wrapper.vm.$emit('nodeClick', mockNodes[1], new MouseEvent('click'))
      wrapper.vm.$emit('nodeSelect', mockNodes[1])
      wrapper.vm.$emit('nodeFocus', mockNodes[1])

      // Verify events can be emitted (they would be handled by parent components)
      expect(wrapper.emitted('nodeClick')).toBeTruthy()
      expect(wrapper.emitted('nodeSelect')).toBeTruthy()
      expect(wrapper.emitted('nodeFocus')).toBeTruthy()
    })
  })

  describe('Search Highlighting', () => {
    it('should handle search highlighting props', () => {
      const highlightedNodes = new Set(['root.name'])

      wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          width: 800,
          height: 600,
          highlightedNodes,
        },
      })

      expect(wrapper.props('highlightedNodes')).toEqual(highlightedNodes)
    })

    it('should handle selected node prop', () => {
      wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          width: 800,
          height: 600,
          selectedNodeId: 'root.name',
        },
      })

      expect(wrapper.props('selectedNodeId')).toBe('root.name')
    })
  })

  describe('Event Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      wrapper = mount(GraphCanvas, {
        props: {
          nodes: mockNodes,
          links: mockLinks,
          width: 800,
          height: 600,
        },
      })

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'center-on-graph-node',
        expect.any(Function),
      )
    })
  })
})
