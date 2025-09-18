import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import GraphControls from '../GraphControls.vue'
import type { GraphNode, GraphLink, LayoutType, LayoutStats } from '@/types'

// Mock data
const mockNodes: GraphNode[] = [
  {
    id: 'node1',
    key: 'root',
    value: { name: 'test' },
    type: 'object',
    path: [],
    x: 100,
    y: 100,
    children: ['node2'],
    depth: 0,
    size: 20,
  },
  {
    id: 'node2',
    key: 'name',
    value: 'test',
    type: 'string',
    path: ['name'],
    x: 200,
    y: 200,
    children: [],
    parent: 'node1',
    depth: 1,
    size: 15,
  },
]

const mockLinks: GraphLink[] = [
  {
    source: 'node1',
    target: 'node2',
    type: 'parent-child',
  },
]

const mockLayoutStats: LayoutStats = {
  iterations: 50,
  alpha: 0.1,
  isConverged: false,
  averageVelocity: 0.5,
  maxVelocity: 1.2,
  frameRate: 60,
  lastTickTime: Date.now(),
}

const defaultProps = {
  layoutType: 'force' as LayoutType,
  zoomLevel: 1,
  nodes: mockNodes,
  links: mockLinks,
  canvasWidth: 800,
  canvasHeight: 600,
  highlightedNodes: new Set<string>(),
  layoutStats: mockLayoutStats,
  showMinimap: true,
  showPerformanceMonitor: true,
}

describe('GraphControls', () => {
  let wrapper: VueWrapper<unknown>

  beforeEach(() => {
    // Mock getBoundingClientRect for minimap click tests
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      top: 0,
      left: 0,
      bottom: 80,
      right: 120,
      toJSON: () => {},
    }))
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders with default props', () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })

      expect(wrapper.find('.graph-controls').exists()).toBe(true)
      expect(wrapper.find('.controls-toggle').exists()).toBe(true)
    })

    it('renders collapsed by default', () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })

      expect(wrapper.find('.controls-panel').isVisible()).toBe(false)
    })

    it('expands when toggle button is clicked', async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })

      await wrapper.find('.controls-toggle').trigger('click')
      expect(wrapper.find('.controls-panel').isVisible()).toBe(true)
    })

    it('renders all control groups when expanded', async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })

      await wrapper.find('.controls-toggle').trigger('click')

      expect(wrapper.find('.control-group').exists()).toBe(true)
      expect(wrapper.text()).toContain('Zoom')
      expect(wrapper.text()).toContain('Layout')
      expect(wrapper.text()).toContain('Minimap')
      expect(wrapper.text()).toContain('Performance')
    })
  })

  describe('Zoom Controls', () => {
    beforeEach(async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })
      await wrapper.find('.controls-toggle').trigger('click')
    })

    it('displays current zoom level', () => {
      expect(wrapper.find('.zoom-level').text()).toBe('100%')
    })

    it('updates zoom level display when prop changes', async () => {
      await wrapper.setProps({ zoomLevel: 1.5 })
      expect(wrapper.find('.zoom-level').text()).toBe('150%')
    })

    it('emits zoomIn event when zoom in button is clicked', async () => {
      const zoomInBtn = wrapper.findAll('.control-btn')[0]
      await zoomInBtn.trigger('click')

      expect(wrapper.emitted('zoomIn')).toHaveLength(1)
    })

    it('emits zoomOut event when zoom out button is clicked', async () => {
      const zoomOutBtn = wrapper.findAll('.control-btn')[1]
      await zoomOutBtn.trigger('click')

      expect(wrapper.emitted('zoomOut')).toHaveLength(1)
    })

    it('emits zoomToFit event when zoom to fit button is clicked', async () => {
      const zoomToFitBtn = wrapper.findAll('.control-btn')[2]
      await zoomToFitBtn.trigger('click')

      expect(wrapper.emitted('zoomToFit')).toHaveLength(1)
    })

    it('emits resetZoom event when reset zoom button is clicked', async () => {
      const resetZoomBtn = wrapper.findAll('.control-btn')[3]
      await resetZoomBtn.trigger('click')

      expect(wrapper.emitted('resetZoom')).toHaveLength(1)
    })

    it('disables zoom in button at maximum zoom', async () => {
      await wrapper.setProps({ zoomLevel: 10 })
      const zoomInBtn = wrapper.findAll('.control-btn')[0]
      expect(zoomInBtn.attributes('disabled')).toBeDefined()
    })

    it('disables zoom out button at minimum zoom', async () => {
      await wrapper.setProps({ zoomLevel: 0.1 })
      const zoomOutBtn = wrapper.findAll('.control-btn')[1]
      expect(zoomOutBtn.attributes('disabled')).toBeDefined()
    })
  })

  describe('Layout Controls', () => {
    beforeEach(async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })
      await wrapper.find('.controls-toggle').trigger('click')
    })

    it('displays current layout type', () => {
      const forceRadio = wrapper.find('input[value="force"]')
      expect(forceRadio.element.checked).toBe(true)
    })

    it('emits layoutChange event when layout is changed', async () => {
      const hierarchicalRadio = wrapper.find('input[value="hierarchical"]')
      await hierarchicalRadio.trigger('change')

      expect(wrapper.emitted('layoutChange')).toHaveLength(1)
      expect(wrapper.emitted('layoutChange')[0]).toEqual(['hierarchical'])
    })

    it('updates selected layout when prop changes', async () => {
      await wrapper.setProps({ layoutType: 'tree' })
      const treeRadio = wrapper.find('input[value="tree"]')
      expect(treeRadio.element.checked).toBe(true)
    })

    it('emits restartLayout event when restart button is clicked', async () => {
      const restartBtn = wrapper.find('.restart-btn')
      await restartBtn.trigger('click')

      expect(wrapper.emitted('restartLayout')).toHaveLength(1)
    })

    it('renders all layout options', () => {
      const layoutOptions = wrapper.findAll('.layout-option')
      expect(layoutOptions).toHaveLength(3)

      const labels = layoutOptions.map((option) => option.find('.layout-label').text())
      expect(labels).toContain('Force-Directed')
      expect(labels).toContain('Hierarchical')
      expect(labels).toContain('Tree')
    })
  })

  describe('Minimap', () => {
    beforeEach(async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })
      await wrapper.find('.controls-toggle').trigger('click')
    })

    it('renders minimap when showMinimap is true', () => {
      expect(wrapper.find('.minimap').exists()).toBe(true)
    })

    it('does not render minimap when showMinimap is false', async () => {
      await wrapper.setProps({ showMinimap: false })
      expect(wrapper.find('.minimap').exists()).toBe(false)
    })

    it('renders nodes in minimap', () => {
      const minimapNodes = wrapper.findAll('.minimap-nodes circle')
      expect(minimapNodes).toHaveLength(2)
    })

    it('renders viewport indicator', () => {
      expect(wrapper.find('.viewport-indicator').exists()).toBe(true)
    })

    it('emits minimapClick event when minimap is clicked', async () => {
      const minimap = wrapper.find('.minimap')
      await minimap.trigger('click', { clientX: 60, clientY: 40 })

      expect(wrapper.emitted('minimapClick')).toHaveLength(1)
      // Should emit canvas coordinates (scaled from minimap coordinates)
      const [x, y] = wrapper.emitted('minimapClick')[0]
      expect(typeof x).toBe('number')
      expect(typeof y).toBe('number')
    })

    it('highlights nodes in minimap based on highlightedNodes prop', async () => {
      await wrapper.setProps({ highlightedNodes: new Set(['node1']) })

      const minimapNodes = wrapper.findAll('.minimap-nodes circle')
      // First node should have full opacity (highlighted)
      expect(minimapNodes[0].attributes('opacity')).toBe('1')
      // Second node should have reduced opacity (not highlighted)
      expect(minimapNodes[1].attributes('opacity')).toBe('0.7')
    })

    it('updates viewport indicator based on zoom level', async () => {
      await wrapper.setProps({ zoomLevel: 2 })

      const viewportIndicator = wrapper.find('.viewport-indicator')
      const width = parseFloat(viewportIndicator.attributes('width') || '0')
      const height = parseFloat(viewportIndicator.attributes('height') || '0')

      // Viewport should be smaller when zoomed in
      expect(width).toBeLessThan(120)
      expect(height).toBeLessThan(80)
    })
  })

  describe('Performance Monitor', () => {
    beforeEach(async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })
      await wrapper.find('.controls-toggle').trigger('click')
    })

    it('renders performance stats when showPerformanceMonitor is true', () => {
      expect(wrapper.find('.performance-stats').exists()).toBe(true)
    })

    it('does not render performance stats when showPerformanceMonitor is false', async () => {
      await wrapper.setProps({ showPerformanceMonitor: false })
      expect(wrapper.find('.performance-stats').exists()).toBe(false)
    })

    it('displays node and link counts', () => {
      const statItems = wrapper.findAll('.stat-item')
      const nodeCountStat = statItems.find((item) => item.text().includes('Nodes:'))
      const linkCountStat = statItems.find((item) => item.text().includes('Links:'))

      expect(nodeCountStat?.text()).toContain('2')
      expect(linkCountStat?.text()).toContain('1')
    })

    it('displays frame rate with appropriate class', () => {
      const fpsStatValue = wrapper.find('.stat-item .stat-value.fps-good')
      expect(fpsStatValue.text()).toBe('60')
    })

    it('displays simulation status', () => {
      const statusStat = wrapper.find('.stat-item .status-running')
      expect(statusStat.text()).toBe('Running')
    })

    it('updates performance stats when layoutStats prop changes', async () => {
      const newStats: LayoutStats = {
        ...mockLayoutStats,
        iterations: 100,
        frameRate: 30,
        isConverged: true,
      }

      await wrapper.setProps({ layoutStats: newStats })

      expect(wrapper.text()).toContain('100')
      expect(wrapper.find('.fps-ok').text()).toBe('30')
      expect(wrapper.find('.status-converged').text()).toBe('Converged')
    })

    it('applies correct frame rate classes', async () => {
      // Test good FPS (>= 50)
      await wrapper.setProps({
        layoutStats: { ...mockLayoutStats, frameRate: 60 },
      })
      expect(wrapper.find('.fps-good').exists()).toBe(true)

      // Test OK FPS (30-49)
      await wrapper.setProps({
        layoutStats: { ...mockLayoutStats, frameRate: 40 },
      })
      expect(wrapper.find('.fps-ok').exists()).toBe(true)

      // Test poor FPS (< 30)
      await wrapper.setProps({
        layoutStats: { ...mockLayoutStats, frameRate: 20 },
      })
      expect(wrapper.find('.fps-poor').exists()).toBe(true)
    })
  })

  describe('Keyboard Shortcuts', () => {
    beforeEach(async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })
      await wrapper.find('.controls-toggle').trigger('click')
    })

    it('handles zoom in shortcut (Ctrl/Cmd + +)', async () => {
      const event = new KeyboardEvent('keydown', {
        key: '+',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('zoomIn')).toHaveLength(1)
    })

    it('handles zoom out shortcut (Ctrl/Cmd + -)', async () => {
      const event = new KeyboardEvent('keydown', {
        key: '-',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('zoomOut')).toHaveLength(1)
    })

    it('handles reset zoom shortcut (Ctrl/Cmd + 0)', async () => {
      const event = new KeyboardEvent('keydown', {
        key: '0',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('resetZoom')).toHaveLength(1)
    })

    it('handles zoom to fit shortcut (Ctrl/Cmd + f)', async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('zoomToFit')).toHaveLength(1)
    })

    it('handles restart layout shortcut (Ctrl/Cmd + r)', async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'r',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('restartLayout')).toHaveLength(1)
    })

    it('ignores shortcuts when controls are collapsed', async () => {
      // Collapse the controls
      await wrapper.find('.controls-toggle').trigger('click')

      const event = new KeyboardEvent('keydown', {
        key: '+',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('zoomIn')).toBeFalsy()
    })
  })

  describe('Responsive Behavior', () => {
    it('auto-collapses on mobile width', async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })

      // Expand first
      await wrapper.find('.controls-toggle').trigger('click')
      expect(wrapper.find('.controls-panel').isVisible()).toBe(true)

      // Simulate mobile width
      await wrapper.setProps({ canvasWidth: 500 })
      expect(wrapper.vm.isExpanded).toBe(false)
    })

    it('maintains expanded state on desktop width', async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })

      await wrapper.find('.controls-toggle').trigger('click')
      await wrapper.setProps({ canvasWidth: 1200 })

      expect(wrapper.vm.isExpanded).toBe(true)
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      wrapper = mount(GraphControls, {
        props: defaultProps,
      })
    })

    it('has proper ARIA attributes on toggle button', () => {
      const toggleBtn = wrapper.find('.controls-toggle')
      expect(toggleBtn.attributes('aria-label')).toBe('Expand controls')
      expect(toggleBtn.attributes('aria-expanded')).toBe('false')
    })

    it('updates ARIA attributes when expanded', async () => {
      await wrapper.find('.controls-toggle').trigger('click')
      const toggleBtn = wrapper.find('.controls-toggle')
      expect(toggleBtn.attributes('aria-label')).toBe('Collapse controls')
      expect(toggleBtn.attributes('aria-expanded')).toBe('true')
    })

    it('has proper labels on control buttons', async () => {
      await wrapper.find('.controls-toggle').trigger('click')

      const controlBtns = wrapper.findAll('.control-btn')
      expect(controlBtns[0].attributes('aria-label')).toBe('Zoom in')
      expect(controlBtns[1].attributes('aria-label')).toBe('Zoom out')
      expect(controlBtns[2].attributes('aria-label')).toBe('Zoom to fit all nodes')
      expect(controlBtns[3].attributes('aria-label')).toBe('Reset zoom to default')
    })

    it('has proper titles on control buttons', async () => {
      await wrapper.find('.controls-toggle').trigger('click')

      const controlBtns = wrapper.findAll('.control-btn')
      expect(controlBtns[0].attributes('title')).toBe('Zoom In')
      expect(controlBtns[1].attributes('title')).toBe('Zoom Out')
      expect(controlBtns[2].attributes('title')).toBe('Zoom to Fit')
      expect(controlBtns[3].attributes('title')).toBe('Reset Zoom')
    })
  })

  describe('Edge Cases', () => {
    it('handles empty nodes array', async () => {
      wrapper = mount(GraphControls, {
        props: {
          ...defaultProps,
          nodes: [],
          links: [],
        },
      })

      await wrapper.find('.controls-toggle').trigger('click')
      expect(wrapper.find('.performance-stats').text()).toContain('Nodes:0')
      expect(wrapper.find('.performance-stats').text()).toContain('Links:0')
    })

    it('handles nodes without positions in minimap', async () => {
      const nodesWithoutPositions: GraphNode[] = [
        {
          id: 'node1',
          key: 'root',
          value: {},
          type: 'object',
          path: [],
          children: [],
          depth: 0,
          size: 20,
        },
      ]

      wrapper = mount(GraphControls, {
        props: {
          ...defaultProps,
          nodes: nodesWithoutPositions,
        },
      })

      await wrapper.find('.controls-toggle').trigger('click')
      const minimapNodes = wrapper.findAll('.minimap-nodes circle')
      expect(minimapNodes).toHaveLength(0)
    })

    it('handles zero canvas dimensions', async () => {
      wrapper = mount(GraphControls, {
        props: {
          ...defaultProps,
          canvasWidth: 0,
          canvasHeight: 0,
        },
      })

      await wrapper.find('.controls-toggle').trigger('click')
      // Should not crash and should render minimap
      expect(wrapper.find('.minimap').exists()).toBe(true)
    })

    it('handles missing layoutStats gracefully', async () => {
      wrapper = mount(GraphControls, {
        props: {
          ...defaultProps,
          layoutStats: undefined,
        },
      })

      await wrapper.find('.controls-toggle').trigger('click')
      // Should use default stats
      expect(wrapper.find('.performance-stats').exists()).toBe(true)
    })
  })
})
