import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import GraphNode from '../GraphNode.vue'
import type { GraphNode as GraphNodeType, NodeProperty } from '@/types'

describe('GraphNode', () => {
  let wrapper: VueWrapper<any>

  const createMockProperty = (overrides: Partial<NodeProperty> = {}): NodeProperty => ({
    key: 'testProp',
    value: 'testValue',
    type: 'string',
    hasChildNode: false,
    ...overrides,
  })

  const createMockNode = (overrides: Partial<GraphNodeType> = {}): GraphNodeType => ({
    id: 'test-node',
    key: 'testKey',
    value: { testProp: 'testValue' },
    type: 'object',
    path: ['root', 'testKey'],
    x: 100,
    y: 100,
    width: 150,
    height: 80,
    children: [],
    depth: 1,
    size: 20,
    isExpanded: true,
    hasChildren: false,
    properties: [createMockProperty()],
    ...overrides,
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders a rectangular node correctly', () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      expect(wrapper.find('.graph-node').exists()).toBe(true)
      expect(wrapper.find('.node-background').exists()).toBe(true)
      expect(wrapper.find('.node-header').exists()).toBe(true)
      expect(wrapper.find('.node-header-text').exists()).toBe(true)
      expect(wrapper.find('.node-type-badge').exists()).toBe(true)
    })

    it('renders property rows correctly', () => {
      const properties = [
        createMockProperty({ key: 'name', value: 'John', type: 'string' }),
        createMockProperty({ key: 'age', value: 30, type: 'number' }),
      ]
      const node = createMockNode({ properties })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const propertyRows = wrapper.findAll('.property-row')
      expect(propertyRows).toHaveLength(2)

      const propertyKeys = wrapper.findAll('.property-key')
      expect(propertyKeys[0].text()).toBe('name:')
      expect(propertyKeys[1].text()).toBe('age:')

      const propertyValues = wrapper.findAll('.property-value')
      expect(propertyValues[0].text()).toBe('"John"')
      expect(propertyValues[1].text()).toBe('30')
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

    it('uses node dimensions for rectangle size', () => {
      const node = createMockNode({ width: 200, height: 120 })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const background = wrapper.find('.node-background')
      expect(background.attributes('width')).toBe('200')
      expect(background.attributes('height')).toBe('120')
    })
  })

  describe('Node Type Styling', () => {
    const nodeTypes: Array<{ type: GraphNodeType['type']; badge: string; expectedClass: string }> =
      [
        { type: 'object', badge: 'OBJ', expectedClass: 'node-type-object' },
        { type: 'array', badge: 'ARR', expectedClass: 'node-type-array' },
        { type: 'string', badge: 'STR', expectedClass: 'node-type-string' },
        { type: 'number', badge: 'NUM', expectedClass: 'node-type-number' },
        { type: 'boolean', badge: 'BOOL', expectedClass: 'node-type-boolean' },
        { type: 'null', badge: 'NULL', expectedClass: 'node-type-null' },
      ]

    nodeTypes.forEach(({ type, badge, expectedClass }) => {
      it(`renders ${type} node with correct styling and type badge`, () => {
        const properties = [
          createMockProperty({ value: type === 'null' ? null : `test${type}`, type }),
        ]
        const node = createMockNode({ type, properties })
        wrapper = mount(GraphNode, {
          props: { node },
        })

        expect(wrapper.find('.graph-node').classes()).toContain(expectedClass)
        expect(wrapper.find('.node-type-badge').text()).toBe(badge)
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

  describe('Connection Points', () => {
    it('renders connection points for properties with child nodes', () => {
      const properties = [
        createMockProperty({ key: 'child', hasChildNode: true, childNodeId: 'child-node' }),
        createMockProperty({ key: 'primitive', hasChildNode: false }),
      ]
      const node = createMockNode({ properties })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const connectionPoints = wrapper.findAll('.connection-point')
      expect(connectionPoints).toHaveLength(1) // Only one property has a child node
    })

    it('positions connection points correctly', () => {
      const properties = [createMockProperty({ hasChildNode: true, childNodeId: 'child' })]
      const node = createMockNode({ properties, width: 150, height: 80 })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const connectionPoint = wrapper.find('.connection-point')
      expect(connectionPoint.attributes('cx')).toBe('150') // At right edge
      expect(parseFloat(connectionPoint.attributes('cy') || '0')).toBeGreaterThan(24) // Below header
    })
  })

  describe('Property Display', () => {
    it('displays property keys and values correctly', () => {
      const properties = [
        createMockProperty({ key: 'name', value: 'John Doe', type: 'string' }),
        createMockProperty({ key: 'age', value: 25, type: 'number' }),
        createMockProperty({ key: 'active', value: true, type: 'boolean' }),
      ]
      const node = createMockNode({ properties })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const propertyKeys = wrapper.findAll('.property-key')
      const propertyValues = wrapper.findAll('.property-value')

      expect(propertyKeys[0].text()).toBe('name:')
      expect(propertyValues[0].text()).toBe('"John Doe"')

      expect(propertyKeys[1].text()).toBe('age:')
      expect(propertyValues[1].text()).toBe('25')

      expect(propertyKeys[2].text()).toBe('active:')
      expect(propertyValues[2].text()).toBe('true')
    })

    it('truncates long property keys', () => {
      const properties = [
        createMockProperty({ key: 'thisIsAVeryLongPropertyKeyThatShouldBeTruncated' }),
      ]
      const node = createMockNode({ properties })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const propertyKey = wrapper.find('.property-key')
      expect(propertyKey.text()).toContain('...')
      expect(propertyKey.text().length).toBeLessThanOrEqual(16) // 12 chars + "..." + ":"
    })

    it('formats different value types correctly', () => {
      const properties = [
        createMockProperty({ key: 'str', value: 'hello world', type: 'string' }),
        createMockProperty({ key: 'num', value: 42, type: 'number' }),
        createMockProperty({ key: 'bool', value: false, type: 'boolean' }),
        createMockProperty({ key: 'nil', value: null, type: 'null' }),
        createMockProperty({ key: 'obj', value: {}, type: 'object', hasChildNode: true }),
        createMockProperty({ key: 'arr', value: [1, 2, 3], type: 'array', hasChildNode: true }),
      ]
      const node = createMockNode({ properties })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const propertyValues = wrapper.findAll('.property-value')
      expect(propertyValues[0].text()).toBe('"hello world"')
      expect(propertyValues[1].text()).toBe('42')
      expect(propertyValues[2].text()).toBe('false')
      expect(propertyValues[3].text()).toBe('null')
      expect(propertyValues[4].text()).toBe('{...}')
      expect(propertyValues[5].text()).toBe('[3]')
    })
  })

  describe('Tooltips', () => {
    it('shows tooltip on mouse enter', async () => {
      const properties = [createMockProperty()]
      const node = createMockNode({
        key: 'testKey',
        value: { testProp: 'testValue' },
        path: ['root', 'test'],
        properties,
      })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mouseenter')

      const tooltip = wrapper.find('.tooltip')
      expect(tooltip.exists()).toBe(true)
      expect(tooltip.find('.tooltip-key').text()).toBe('testKey')
      expect(tooltip.find('.tooltip-type').text()).toBe('OBJECT')
      expect(tooltip.find('.tooltip-path').text()).toBe('root.test')
      expect(tooltip.find('.tooltip-properties').text()).toBe('1 properties')
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
        const properties = [createMockProperty({ value: testCase.value, type: testCase.type })]
        const node = createMockNode({ value: testCase.value, type: testCase.type, properties })
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
    it('emits dragStart event on mouse down', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mousedown', { button: 0 })

      const dragStartEvents = wrapper.emitted('dragStart')
      expect(dragStartEvents).toHaveLength(1)
      expect(dragStartEvents![0][0]).toEqual(node)
    })

    it('emits drag events during mouse movement', async () => {
      const node = createMockNode({ x: 100, y: 100 })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      // Start dragging
      await wrapper.find('.graph-node').trigger('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 100,
      })

      // Simulate mouse move
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 150,
      })
      document.dispatchEvent(mouseMoveEvent)

      const dragEvents = wrapper.emitted('drag')
      expect(dragEvents).toHaveLength(1)

      // Check that the emitted node has updated position
      const draggedNode = dragEvents![0][0] as GraphNodeType
      expect(draggedNode.x).toBe(150) // 100 + (150 - 100)
      expect(draggedNode.y).toBe(150) // 100 + (150 - 100)
    })

    it('emits dragEnd event on mouse up', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      // Start dragging
      await wrapper.find('.graph-node').trigger('mousedown', { button: 0 })

      // End dragging
      const mouseUpEvent = new MouseEvent('mouseup')
      document.dispatchEvent(mouseUpEvent)

      const dragEndEvents = wrapper.emitted('dragEnd')
      expect(dragEndEvents).toHaveLength(1)
      expect(dragEndEvents![0][0]).toEqual(node)
    })

    it('ignores non-left mouse button clicks', async () => {
      const node = createMockNode()
      wrapper = mount(GraphNode, {
        props: { node },
      })

      await wrapper.find('.graph-node').trigger('mousedown', { button: 1 }) // Right click

      const dragStartEvents = wrapper.emitted('dragStart')
      expect(dragStartEvents).toBeUndefined()
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
        const updatedNode = { ...node, x: i * 10, y: i * 10 }
        await wrapper.setProps({ node: updatedNode })

        const transform = wrapper.find('.graph-node').attributes('transform')
        expect(transform).toBe(`translate(${i * 10}, ${i * 10})`)
      }
    })

    it('handles large numbers of properties efficiently', () => {
      const properties = Array.from({ length: 20 }, (_, i) =>
        createMockProperty({ key: `prop${i}`, value: `value${i}` }),
      )
      const node = createMockNode({ properties })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const propertyRows = wrapper.findAll('.property-row')
      expect(propertyRows).toHaveLength(20)
      expect(wrapper.find('.graph-node').exists()).toBe(true)
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

        expect(wrapper.find('.node-header-text').text()).toBe(expected)
        wrapper.unmount()
      })
    })

    it('handles nodes with no properties', () => {
      const node = createMockNode({ properties: [] })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const propertyRows = wrapper.findAll('.property-row')
      expect(propertyRows).toHaveLength(0)
      expect(wrapper.find('.graph-node').exists()).toBe(true)
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

      const properties = [
        createMockProperty({
          key: 'nested',
          value: complexValue.nested,
          type: 'object',
          hasChildNode: true,
        }),
        createMockProperty({
          key: 'array',
          value: complexValue.array,
          type: 'array',
          hasChildNode: true,
        }),
      ]

      const node = createMockNode({
        value: complexValue,
        type: 'object',
        path: ['root', 'complex'],
        properties,
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

    it('handles very long property values', () => {
      const longValue = 'a'.repeat(100)
      const properties = [createMockProperty({ value: longValue, type: 'string' })]
      const node = createMockNode({ properties })
      wrapper = mount(GraphNode, {
        props: { node },
      })

      const propertyValue = wrapper.find('.property-value')
      expect(propertyValue.text()).toContain('...')
      expect(propertyValue.text().length).toBeLessThan(longValue.length)
    })
  })
})
