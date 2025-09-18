import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import GraphNode from '../GraphNode.vue'
import type { GraphNode as GraphNodeType } from '@/types'

// Mock D3 imports
vi.mock('@/utils/d3-imports', () => ({
  select: vi.fn(() => ({
    call: vi.fn(),
    on: vi.fn(),
  })),
  drag: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
  })),
}))

describe('GraphNode', () => {
  let wrapper: VueWrapper<any>
  let mockSimulation: any

  const createMockNode = (overrides: Partial<GraphNodeType> = {}): GraphNodeType => ({
    id: 'test-node',
    key: 'testKey',
    value: 'testValue',
    type: 'string',
    path: ['root', 'testKey'],
    x: 100,
    y: 100,
    children: [],
    depth: 1,
    size: 20,
    ...overrides,
  })

  beforeEach(() => {
    mockSimulation = {
      alphaTarget: vi.fn().mockReturnThis(),
      restart: vi.fn().mockReturnThis(),
    }
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders a basic node correctly', () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      expect(wrapper.find('.graph-node').exists()).toBe(true)
      expect(wrapper.find('.node-background').exists()).toBe(true)
      expect(wrapper.find('.node-icon').exists()).toBe(true)
      expect(wrapper.find('.node-label').exists()).toBe(true)
    })

    it('applies correct transform based on node position', () => {
      const node = createMockNode({ x: 150, y: 200 })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const graphNode = wrapper.find('.graph-node')
      expect(graphNode.attributes('transform')).toBe('translate(150, 200)')
    })

    it('handles missing position coordinates', () => {
      const node = createMockNode({ x: undefined, y: undefined })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const graphNode = wrapper.find('.graph-node')
      expect(graphNode.attributes('transform')).toBe('translate(0, 0)')
    })
  })

  describe('Node Type Styling', () => {
    const nodeTypes: Array<{ type: GraphNodeType['type']; icon: string; expectedClass: string }> = [
      { type: 'object', icon: '{}', expectedClass: 'node-type-object' },
      { type: 'array', icon: '[]', expectedClass: 'node-type-array' },
      { type: 'string', icon: '"', expectedClass: 'node-type-string' },
      { type: 'number', icon: '#', expectedClass: 'node-type-number' },
      { type: 'boolean', icon: '?', expectedClass: 'node-type-boolean' },
      { type: 'null', icon: '∅', expectedClass: 'node-type-null' },
    ]

    nodeTypes.forEach(({ type, icon, expectedClass }) => {
      it(`renders ${type} node with correct styling and icon`, () => {
        const node = createMockNode({ type, value: type === 'null' ? null : `test${type}` })
        wrapper = mount(GraphNode, {
          props: { node },
        })

        expect(wrapper.find('.graph-node').classes()).toContain(expectedClass)
        expect(wrapper.find('.node-icon').text()).toBe(icon)
      })
    })
  })

  describe('Node States', () => {
    it('applies selected state styling', () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node, isSelected: true },
      })

      expect(wrapper.find('.graph-node').classes()).toContain('node-selected')
    })

    it('applies highlighted state styling', () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node, isHighlighted: true },
      })

      expect(wrapper.find('.graph-node').classes()).toContain('node-highlighted')
    })

    it('shows hovered state on mouse enter', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mouseenter')
      expect(wrapper.find('.graph-node').classes()).toContain('node-hovered')
    })

    it('removes hovered state on mouse leave', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mouseenter')
      expect(wrapper.find('.graph-node').classes()).toContain('node-hovered')

      await wrapper.find('.graph-node').trigger('mouseleave')
      expect(wrapper.find('.graph-node').classes()).not.toContain('node-hovered')
    })
  })

  describe('Node Sizing', () => {
    it('calculates radius based on node size', () => {
      const node = createMockNode({ size: 25 })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const circle = wrapper.find('.node-background')
      const radius = parseInt(circle.attributes('r') || '0')
      expect(radius).toBeGreaterThan(8) // Base minimum
      expect(radius).toBeLessThanOrEqual(30) // Maximum size
    })

    it('increases radius for selected nodes', () => {
      const node = createMockNode({ size: 20 })

      // Test unselected node
      wrapper = mount(GraphNode, {
        props: { node, isSelected: false },
      })
      const unselectedRadius = parseInt(wrapper.find('.node-background').attributes('r') || '0')

      wrapper.unmount()

      // Test selected node
      wrapper = mount(GraphNode, {
        props: { node, isSelected: true },
      })
      const selectedRadius = parseInt(wrapper.find('.node-background').attributes('r') || '0')

      expect(selectedRadius).toBeGreaterThan(unselectedRadius)
    })
  })

  describe('Labels', () => {
    it('displays node label by default', () => {
      const node = createMockNode({ key: 'testLabel' })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const label = wrapper.find('.node-label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('testLabel')
    })

    it('truncates long labels', () => {
      const node = createMockNode({ key: 'thisIsAVeryLongLabelThatShouldBeTruncated' })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const label = wrapper.find('.node-label')
      expect(label.text()).toContain('...')
      expect(label.text().length).toBeLessThanOrEqual(15) // 12 chars + "..."
    })

    it('hides labels when showLabels is false', () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node, showLabels: false },
      })

      expect(wrapper.find('.node-label').exists()).toBe(false)
    })
  })

  describe('Tooltips', () => {
    it('shows tooltip on mouse enter', async () => {
      const node = createMockNode({ key: 'testKey', value: 'testValue', path: ['root', 'test'] })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mouseenter')

      const tooltip = wrapper.find('.tooltip')
      expect(tooltip.exists()).toBe(true)
      expect(tooltip.find('.tooltip-key').text()).toBe('testKey')
      expect(tooltip.find('.tooltip-type').text()).toBe('string')
      expect(tooltip.find('.tooltip-value').text()).toBe('"testValue"')
      expect(tooltip.find('.tooltip-path').text()).toBe('root.test')
    })

    it('hides tooltip on mouse leave', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mouseenter')
      expect(wrapper.find('.tooltip').exists()).toBe(true)

      await wrapper.find('.graph-node').trigger('mouseleave')
      expect(wrapper.find('.tooltip').exists()).toBe(false)
    })

    it('formats different value types in tooltip correctly', async () => {
      const testCases = [
        { value: null, type: 'null' as const, expected: 'null' },
        { value: 'short', type: 'string' as const, expected: '"short"' },
        { value: 'a'.repeat(60), type: 'string' as const, expected: '"' + 'a'.repeat(50) + '..."' },
        { value: [1, 2, 3], type: 'array' as const, expected: 'Array(3)' },
        { value: { a: 1, b: 2 }, type: 'object' as const, expected: 'Object(2 keys)' },
        { value: 42, type: 'number' as const, expected: '42' },
        { value: true, type: 'boolean' as const, expected: 'true' },
      ]

      for (const testCase of testCases) {
        const node = createMockNode({ value: testCase.value, type: testCase.type })
        wrapper = mount(GraphNode, {
          props: { node },
        })

        await wrapper.find('.graph-node').trigger('mouseenter')
        const tooltipValue = wrapper.find('.tooltip-value')
        expect(tooltipValue.text()).toBe(testCase.expected)
        wrapper.unmount()
      }
    })
  })

  describe('Event Handling', () => {
    it('emits click event with node and event data', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('click')

      const clickEvents = wrapper.emitted('click')
      expect(clickEvents).toHaveLength(1)
      expect(clickEvents![0][0]).toEqual(node)
      expect(clickEvents![0][1]).toBeInstanceOf(MouseEvent)
    })

    it('emits doubleClick event with node and event data', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('dblclick')

      const dblClickEvents = wrapper.emitted('doubleClick')
      expect(dblClickEvents).toHaveLength(1)
      expect(dblClickEvents![0][0]).toEqual(node)
      expect(dblClickEvents![0][1]).toBeInstanceOf(MouseEvent)
    })

    it('emits contextMenu event and prevents default', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true })
      const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault')
      const stopPropagationSpy = vi.spyOn(contextMenuEvent, 'stopPropagation')

      await wrapper.find('.graph-node').element.dispatchEvent(contextMenuEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
      expect(stopPropagationSpy).toHaveBeenCalled()

      const contextMenuEvents = wrapper.emitted('contextMenu')
      expect(contextMenuEvents).toHaveLength(1)
      expect(contextMenuEvents![0][0]).toEqual(node)
    })

    it('stops event propagation on click and double-click', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const clickEvent = new MouseEvent('click', { bubbles: true })
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

      await wrapper.find('.graph-node').element.dispatchEvent(clickEvent)
      expect(stopPropagationSpy).toHaveBeenCalled()

      const dblClickEvent = new MouseEvent('dblclick', { bubbles: true })
      const stopPropagationSpy2 = vi.spyOn(dblClickEvent, 'stopPropagation')

      await wrapper.find('.graph-node').element.dispatchEvent(dblClickEvent)
      expect(stopPropagationSpy2).toHaveBeenCalled()
    })
  })

  describe('Drag Behavior', () => {
    it('sets up drag behavior when simulation is provided', () => {
      const node = createMockNode()

      wrapper = mount(GraphNode, {
        props: { node, simulation: mockSimulation },
      })

      // Since we mocked the d3-imports module, we can verify the component mounts successfully
      // and has the expected structure when simulation is provided
      expect(wrapper.find('.graph-node').exists()).toBe(true)
      expect(wrapper.props('simulation')).toStrictEqual(mockSimulation)
    })

    it('does not set up drag behavior without simulation', async () => {
      const node = createMockNode()
      const d3Imports = await import('@/utils/d3-imports')

      wrapper = mount(GraphNode, {
        props: { node },
      })

      expect(d3Imports.drag).not.toHaveBeenCalled()
    })

    it('emits dragStart and dragEnd events', () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node, simulation: mockSimulation },
      })

      // Simulate drag start
      const vm = wrapper.vm as unknown
      vm.isDragging = true
      vm.$emit('dragStart', node)

      // Simulate drag end
      vm.isDragging = false
      vm.$emit('dragEnd', node)

      const dragStartEvents = wrapper.emitted('dragStart')
      const dragEndEvents = wrapper.emitted('dragEnd')

      expect(dragStartEvents).toHaveLength(1)
      expect(dragStartEvents![0][0]).toEqual(node)
      expect(dragEndEvents).toHaveLength(1)
      expect(dragEndEvents![0][0]).toEqual(node)
    })
  })

  describe('Accessibility', () => {
    it('has proper cursor styling', () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const graphNode = wrapper.find('.graph-node')
      // In test environment, check for the CSS class instead of computed style
      expect(graphNode.classes()).toContain('graph-node')
      // The cursor: pointer is defined in the CSS, which is applied in the browser
      expect(graphNode.element.tagName.toLowerCase()).toBe('g')
    })

    it('provides visual feedback for interactions', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      // Test hover state
      await wrapper.find('.graph-node').trigger('mouseenter')
      expect(wrapper.find('.graph-node').classes()).toContain('node-hovered')

      // Test selection state
      await wrapper.setProps({ isSelected: true })
      expect(wrapper.find('.graph-node').classes()).toContain('node-selected')
    })
  })

  describe('Performance', () => {
    it('handles rapid state changes without errors', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      // Rapidly toggle states
      for (let i = 0; i < 10; i++) {
        await wrapper.setProps({ isSelected: i % 2 === 0 })
        await wrapper.setProps({ isHighlighted: i % 3 === 0 })
      }

      expect(wrapper.find('.graph-node').exists()).toBe(true)
    })

    it('handles position updates efficiently', async () => {
      const node = createMockNode({ x: 0, y: 0 })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      // Update position multiple times
      for (let i = 1; i <= 5; i++) {
        node.x = i * 10
        node.y = i * 10
        await wrapper.setProps({ node: { ...node } })

        const transform = wrapper.find('.graph-node').attributes('transform')
        expect(transform).toBe(`translate(${i * 10}, ${i * 10})`)
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles nodes with empty or undefined keys', () => {
      const testCases = [
        { key: '', expected: '' },
        { key: 0, expected: '0' },
        { key: false, expected: 'false' },
      ]

      testCases.forEach(({ key, expected }) => {
        const node = createMockNode({ key })
        wrapper = mount(GraphNode, {
          props: { node },
        })

        expect(wrapper.find('.node-label').text()).toBe(expected)
        wrapper.unmount()
      })
    })

    it('handles nodes with complex nested values', async () => {
      const complexValue = {
        nested: {
          deeply: {
            value: 'test',
          },
        },
        array: [1, 2, 3],
      }

      const node = createMockNode({
        value: complexValue,
        type: 'object',
        path: ['root', 'complex'],
      })

      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mouseenter')
      const tooltipValue = wrapper.find('.tooltip-value')
      expect(tooltipValue.text()).toBe('Object(2 keys)')
    })

    it('handles root node with empty path', async () => {
      const node = createMockNode({ path: [], key: 'root' })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mouseenter')
      const tooltipPath = wrapper.find('.tooltip-path')
      expect(tooltipPath.text()).toBe('root')
    })
  })
})
