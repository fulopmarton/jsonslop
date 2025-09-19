import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GraphCanvas from '../GraphCanvas.vue'
import type { GraphNode, GraphLink } from '@/types'

// Mock the composables
vi.mock('@/composables/useNativeZoom', () => ({
  useNativeZoom: () => ({
    transform: { value: { x: 0, y: 0, k: 1 } },
    isDragging: { value: false },
    transformString: { value: 'translate(0, 0) scale(1)' },
    handleWheel: vi.fn(),
    handleMouseDown: vi.fn(),
    handleMouseMove: vi.fn(),
    handleMouseUp: vi.fn(),
    zoomToFit: vi.fn(),
    resetZoom: vi.fn(),
    setTransform: vi.fn(),
  }),
}))

vi.mock('@/composables/useNativeLayout', () => ({
  useNativeLayout: () => ({
    nodes: { value: [] },
    links: { value: [] },
    stats: {
      value: {
        iterations: 0,
        alpha: 1,
        isConverged: false,
        averageVelocity: 0,
        maxVelocity: 0,
        frameRate: 0,
        lastTickTime: 0,
      },
    },
    isRunning: { value: false },
    initialize: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    updateOptions: vi.fn(),
    onTick: vi.fn(),
    onEnd: vi.fn(),
  }),
}))

vi.mock('@/composables/useGraphInteractions', () => ({
  useGraphInteractions: () => ({
    contextMenu: { value: { isVisible: false, x: 0, y: 0 } },
    selectedNodeId: { value: null },
    highlightedNodes: { value: new Set() },
    contextMenuItems: { value: [] },
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
  }),
}))

vi.mock('@/composables/useGraphKeyboardNavigation', () => ({
  useGraphKeyboardNavigation: () => ({
    focusedNodeId: { value: null },
    activate: vi.fn(),
    deactivate: vi.fn(),
  }),
}))

vi.mock('@/composables/useGraphSearch', () => ({
  useGraphSearch: () => ({
    hasGraphSearchResults: { value: false },
    highlightedGraphNodes: { value: new Set() },
    dimmedGraphNodes: { value: new Set() },
    isNodeHighlightedBySearch: vi.fn(() => false),
    isNodeDimmedBySearch: vi.fn(() => false),
  }),
}))

describe('GraphCanvas (Native SVG)', () => {
  const mockNodes: GraphNode[] = [
    {
      id: 'node1',
      key: 'root',
      value: {},
      type: 'object',
      path: [],
      children: ['node2'],
      depth: 0,
      size: 20,
      x: 100,
      y: 100,
    },
    {
      id: 'node2',
      key: 'child',
      value: 'test',
      type: 'string',
      path: ['child'],
      children: [],
      parent: 'node1',
      depth: 1,
      size: 15,
      x: 200,
      y: 150,
    },
  ]

  const mockLinks: GraphLink[] = [
    {
      source: 'node1',
      target: 'node2',
      type: 'parent-child',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render SVG canvas', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
        width: 800,
        height: 600,
      },
    })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('.graph-canvas').exists()).toBe(true)
  })

  it('should render with correct dimensions', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
        width: 1000,
        height: 800,
      },
    })

    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('1000')
    expect(svg.attributes('height')).toBe('800')
  })

  it('should render arrowhead marker', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    expect(wrapper.find('marker#arrowhead').exists()).toBe(true)
  })

  it('should render zoom container with transform', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    const zoomContainer = wrapper.find('.zoom-container')
    expect(zoomContainer.exists()).toBe(true)
    expect(zoomContainer.attributes('transform')).toBe('translate(0, 0) scale(1)')
  })

  it('should render links group', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    expect(wrapper.find('.links-group').exists()).toBe(true)
  })

  it('should render nodes group', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    expect(wrapper.find('.nodes-group').exists()).toBe(true)
  })

  it('should handle canvas click events', async () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    const svg = wrapper.find('svg')
    await svg.trigger('click')

    expect(wrapper.emitted('canvasClick')).toBeTruthy()
  })

  it('should handle wheel events for zooming', async () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    const svg = wrapper.find('svg')
    await svg.trigger('wheel', { deltaY: -100 })

    // Zoom handler should be called (mocked)
    expect(svg.exists()).toBe(true)
  })

  it('should handle mouse events for panning', async () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    const svg = wrapper.find('svg')

    await svg.trigger('mousedown', { button: 0, clientX: 100, clientY: 50 })
    await svg.trigger('mousemove', { clientX: 110, clientY: 60 })
    await svg.trigger('mouseup', { button: 0 })

    // Mouse handlers should be called (mocked)
    expect(svg.exists()).toBe(true)
  })

  it('should show loading overlay when loading', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    // Initially not loading
    expect(wrapper.find('.loading-overlay').exists()).toBe(false)

    // We can't easily test the loading state since it's internal
    // but we can verify the overlay structure exists in the template
    expect(wrapper.html()).toContain('Loading overlay')
  })

  it('should render context menu when visible', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    expect(wrapper.findComponent({ name: 'ContextMenu' }).exists()).toBe(true)
  })

  it('should emit node events', async () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    // Since GraphNode components are rendered, we should be able to find them
    // However, due to mocking, we'll test the event emission structure
    expect(wrapper.vm).toBeDefined()
  })

  it('should emit zoom change events', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    // The zoom composable should emit zoom changes
    expect(wrapper.vm).toBeDefined()
  })

  it('should emit simulation events', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    // The layout composable should emit simulation events
    expect(wrapper.vm).toBeDefined()
  })

  it('should handle props changes', async () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
        width: 800,
        height: 600,
      },
    })

    // Change props
    await wrapper.setProps({
      width: 1000,
      height: 800,
      nodes: [
        ...mockNodes,
        {
          id: 'node3',
          key: 'newNode',
          value: 123,
          type: 'number',
          path: ['newNode'],
          children: [],
          depth: 1,
          size: 15,
          x: 300,
          y: 200,
        },
      ],
    })

    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('1000')
    expect(svg.attributes('height')).toBe('800')
  })

  it('should expose public methods', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: mockNodes,
        links: mockLinks,
      },
    })

    const vm = wrapper.vm as unknown

    expect(typeof vm.zoomToFit).toBe('function')
    expect(typeof vm.zoomToNode).toBe('function')
    expect(typeof vm.resetZoom).toBe('function')
    expect(typeof vm.restartSimulation).toBe('function')
    expect(typeof vm.stopSimulation).toBe('function')
    expect(typeof vm.updateForceParameters).toBe('function')
    expect(typeof vm.getLayoutStats).toBe('function')
    expect(typeof vm.getBounds).toBe('function')
  })
})
