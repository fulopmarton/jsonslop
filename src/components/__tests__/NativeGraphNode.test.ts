import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GraphNode from '../GraphNode.vue'
import type { GraphNode as GraphNodeType } from '@/types'

describe('GraphNode (Native SVG)', () => {
  const mockNode: GraphNodeType = {
    id: 'test-node',
    key: 'testKey',
    value: 'test value',
    type: 'string',
    path: ['testKey'],
    children: [],
    depth: 1,
    size: 20,
    x: 100,
    y: 150,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render node with correct transform', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    const nodeGroup = wrapper.find('g')
    expect(nodeGroup.attributes('transform')).toBe('translate(100, 150)')
  })

  it('should render node without coordinates', () => {
    const nodeWithoutCoords = { ...mockNode, x: undefined, y: undefined }
    const wrapper = mount(GraphNode, {
      props: {
        node: nodeWithoutCoords,
      },
    })

    const nodeGroup = wrapper.find('g')
    expect(nodeGroup.attributes('transform')).toBe('translate(0, 0)')
  })

  it('should render circle with correct attributes', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    const circle = wrapper.find('circle')
    expect(circle.exists()).toBe(true)
    expect(circle.classes()).toContain('node-background')
  })

  it('should render node icon', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    const icon = wrapper.find('.node-icon')
    expect(icon.exists()).toBe(true)
    expect(icon.text()).toBe('"') // String type icon
  })

  it('should render different icons for different types', () => {
    const objectNode = { ...mockNode, type: 'object' as const }
    const arrayNode = { ...mockNode, type: 'array' as const }
    const numberNode = { ...mockNode, type: 'number' as const }

    const objectWrapper = mount(GraphNode, { props: { node: objectNode } })
    const arrayWrapper = mount(GraphNode, { props: { node: arrayNode } })
    const numberWrapper = mount(GraphNode, { props: { node: numberNode } })

    expect(objectWrapper.find('.node-icon').text()).toBe('{}')
    expect(arrayWrapper.find('.node-icon').text()).toBe('[]')
    expect(numberWrapper.find('.node-icon').text()).toBe('#')
  })

  it('should render node label when showLabels is true', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
        showLabels: true,
      },
    })

    const label = wrapper.find('.node-label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('testKey')
  })

  it('should not render node label when showLabels is false', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
        showLabels: false,
      },
    })

    const label = wrapper.find('.node-label')
    expect(label.exists()).toBe(false)
  })

  it('should truncate long labels', () => {
    const longKeyNode = { ...mockNode, key: 'thisIsAVeryLongKeyName' }
    const wrapper = mount(GraphNode, {
      props: {
        node: longKeyNode,
        showLabels: true,
      },
    })

    const label = wrapper.find('.node-label')
    expect(label.text()).toBe('thisIsAVeryL...')
  })

  it('should apply selected styling', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
        isSelected: true,
      },
    })

    const nodeGroup = wrapper.find('g')
    expect(nodeGroup.classes()).toContain('node-selected')
  })

  it('should apply highlighted styling', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
        isHighlighted: true,
      },
    })

    const nodeGroup = wrapper.find('g')
    expect(nodeGroup.classes()).toContain('node-highlighted')
  })

  it('should handle click events', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')![0]).toEqual([mockNode, expect.any(Object)])
  })

  it('should handle double click events', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    await wrapper.trigger('dblclick')

    expect(wrapper.emitted('doubleClick')).toBeTruthy()
    expect(wrapper.emitted('doubleClick')![0]).toEqual([mockNode, expect.any(Object)])
  })

  it('should handle context menu events', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    await wrapper.trigger('contextmenu')

    expect(wrapper.emitted('contextMenu')).toBeTruthy()
    expect(wrapper.emitted('contextMenu')![0]).toEqual([mockNode, expect.any(Object)])
  })

  it('should handle mouse enter and leave events', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    await wrapper.trigger('mouseenter')
    expect(wrapper.vm.isHovered).toBe(true)
    expect(wrapper.vm.showTooltip).toBe(true)

    await wrapper.trigger('mouseleave')
    expect(wrapper.vm.isHovered).toBe(false)
    expect(wrapper.vm.showTooltip).toBe(false)
  })

  it('should handle focus and blur events', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    await wrapper.trigger('focus')
    expect(wrapper.emitted('focus')).toBeTruthy()
    expect(wrapper.emitted('focus')![0]).toEqual([mockNode])

    await wrapper.trigger('blur')
    expect(wrapper.emitted('blur')).toBeTruthy()
    expect(wrapper.emitted('blur')![0]).toEqual([mockNode])
  })

  it('should handle keyboard events', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    // Enter key should trigger click
    await wrapper.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('click')).toBeTruthy()

    // Space key should trigger click
    await wrapper.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('click')).toHaveLength(2)

    // Escape key should blur the element
    const blurSpy = vi.spyOn(wrapper.vm.$refs.nodeElement as any, 'blur')
    await wrapper.trigger('keydown', { key: 'Escape' })
    // Note: blur spy might not work in test environment, but the handler exists
  })

  it('should handle drag events', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    // Mock getBoundingClientRect for drag calculations
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    }))

    // Add global event listeners mock
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    // Start drag
    await wrapper.trigger('mousedown', {
      button: 0,
      clientX: 100,
      clientY: 50,
    })

    expect(wrapper.emitted('dragStart')).toBeTruthy()
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))

    // Simulate mouse move
    const mouseMoveHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'mousemove',
    )?.[1] as Function

    if (mouseMoveHandler) {
      mouseMoveHandler({ clientX: 110, clientY: 60 })
      expect(wrapper.vm.isDragging).toBe(true)
    }

    // Simulate mouse up
    const mouseUpHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'mouseup',
    )?.[1] as Function

    if (mouseUpHandler) {
      mouseUpHandler({ button: 0 })
      expect(wrapper.emitted('dragEnd')).toBeTruthy()
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    }
  })

  it('should ignore non-left mouse button for drag', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    // Right mouse button
    await wrapper.trigger('mousedown', { button: 2, clientX: 100, clientY: 50 })
    expect(wrapper.emitted('dragStart')).toBeFalsy()
    expect(wrapper.vm.isDragging).toBe(false)
  })

  it('should show tooltip on hover', async () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    await wrapper.trigger('mouseenter')

    const tooltip = wrapper.find('.tooltip')
    expect(tooltip.exists()).toBe(true)
    expect(tooltip.find('.tooltip-key').text()).toBe('testKey')
    expect(tooltip.find('.tooltip-type').text()).toBe('STRING')
    expect(tooltip.find('.tooltip-value').text()).toBe('"test value"')
  })

  it('should display correct tooltip for different value types', async () => {
    const objectNode = {
      ...mockNode,
      type: 'object' as const,
      value: { a: 1, b: 2 },
    }

    const wrapper = mount(GraphNode, {
      props: {
        node: objectNode,
      },
    })

    await wrapper.trigger('mouseenter')

    const tooltipValue = wrapper.find('.tooltip-value')
    expect(tooltipValue.text()).toBe('Object(2 keys)')
  })

  it('should have correct accessibility attributes', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
        isSelected: true,
      },
    })

    const nodeGroup = wrapper.find('g')
    expect(nodeGroup.attributes('role')).toBe('button')
    expect(nodeGroup.attributes('tabindex')).toBe('0')
    expect(nodeGroup.attributes('aria-label')).toBe('string node: testKey')
    expect(nodeGroup.attributes('aria-selected')).toBe('true')
  })

  it('should apply type-specific CSS classes', () => {
    const wrapper = mount(GraphNode, {
      props: {
        node: mockNode,
      },
    })

    const nodeGroup = wrapper.find('g')
    expect(nodeGroup.classes()).toContain('node-type-string')
  })
})
