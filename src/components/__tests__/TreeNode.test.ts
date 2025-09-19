import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TreeNode from '../TreeNode.vue'
import ContextMenu from '../ContextMenu.vue'
import type { JSONNode } from '@/types'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
})

// Mock document.execCommand for fallback tests
Object.assign(document, {
  execCommand: vi.fn(() => true),
})

describe('TreeNode', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const createMockNode = (overrides: Partial<JSONNode> = {}): JSONNode => ({
    key: 'test',
    value: 'test value',
    type: 'string',
    path: ['root', 'test'],
    isExpandable: false,
    ...overrides,
  })

  const mountTreeNode = (props: any = {}) => {
    return mount(TreeNode, {
      props: props.props || {},
      global: {
        plugins: [pinia],
        components: {
          ContextMenu,
        },
        ...(props.global || {}),
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders a simple string node correctly', () => {
      const node = createMockNode({
        key: 'name',
        value: 'John Doe',
        type: 'string',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      expect(wrapper.find('.node-key').text()).toBe('"name"')
      expect(wrapper.find('.node-value').text()).toBe('"John Doe"')
      expect(wrapper.find('.expand-button').exists()).toBe(false)
    })

    it('renders a number node with correct styling', () => {
      const node = createMockNode({
        key: 'age',
        value: 25,
        type: 'number',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      expect(wrapper.find('.node-key').text()).toBe('"age"')
      expect(wrapper.find('.node-value').text()).toBe('25')
      expect(wrapper.find('.node-value').classes()).toContain('text-blue-600')
    })

    it('renders a boolean node correctly', () => {
      const node = createMockNode({
        key: 'isActive',
        value: true,
        type: 'boolean',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      expect(wrapper.find('.node-value').text()).toBe('true')
      expect(wrapper.find('.node-value').classes()).toContain('text-purple-600')
    })

    it('renders a null node correctly', () => {
      const node = createMockNode({
        key: 'data',
        value: null,
        type: 'null',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      expect(wrapper.find('.node-value').text()).toBe('null')
      expect(wrapper.find('.node-value').classes()).toContain('text-gray-500')
      expect(wrapper.find('.node-value').classes()).toContain('italic')
    })

    it('renders array index keys correctly', () => {
      const node = createMockNode({
        key: 0,
        value: 'first item',
        type: 'string',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      expect(wrapper.find('.node-key').text()).toBe('[0]')
    })
  })

  describe('Expandable Nodes', () => {
    it('renders expandable object node with expand button', () => {
      const node = createMockNode({
        key: 'user',
        value: { name: 'John', age: 25 },
        type: 'object',
        isExpandable: true,
        children: [
          createMockNode({
            key: 'name',
            value: 'John',
            type: 'string',
            path: ['root', 'user', 'name'],
          }),
          createMockNode({ key: 'age', value: 25, type: 'number', path: ['root', 'user', 'age'] }),
        ],
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      expect(wrapper.find('.expand-button').exists()).toBe(true)
      expect(wrapper.find('.expandable-indicator').text()).toBe('Object{2}')
      expect(wrapper.find('.node-value').exists()).toBe(false)
    })

    it('renders expandable array node correctly', () => {
      const node = createMockNode({
        key: 'items',
        value: ['a', 'b', 'c'],
        type: 'array',
        isExpandable: true,
        children: [
          createMockNode({ key: 0, value: 'a', type: 'string', path: ['root', 'items', '0'] }),
          createMockNode({ key: 1, value: 'b', type: 'string', path: ['root', 'items', '1'] }),
          createMockNode({ key: 2, value: 'c', type: 'string', path: ['root', 'items', '2'] }),
        ],
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      expect(wrapper.find('.expandable-indicator').text()).toBe('Array(3)')
    })

    it('shows children when expanded', async () => {
      const node = createMockNode({
        key: 'user',
        value: { name: 'John' },
        type: 'object',
        isExpandable: true,
        children: [
          createMockNode({
            key: 'name',
            value: 'John',
            type: 'string',
            path: ['root', 'user', 'name'],
          }),
        ],
      })

      const wrapper = mountTreeNode({
        props: {
          node,
          isExpanded: true,
        },
        global: {
          components: {
            TreeNode,
          },
        },
      })

      expect(wrapper.find('.children').exists()).toBe(true)
      // Check that child TreeNode elements are rendered in the DOM
      expect(wrapper.findAll('.tree-node')).toHaveLength(2) // parent + child
    })

    it('hides children when collapsed', () => {
      const node = createMockNode({
        key: 'user',
        value: { name: 'John' },
        type: 'object',
        isExpandable: true,
        children: [
          createMockNode({
            key: 'name',
            value: 'John',
            type: 'string',
            path: ['root', 'user', 'name'],
          }),
        ],
      })

      const wrapper = mountTreeNode({
        props: {
          node,
          isExpanded: false,
        },
        global: {
          components: {
            TreeNode,
          },
        },
      })

      expect(wrapper.find('.children').exists()).toBe(false)
      // Only the parent node should be rendered
      expect(wrapper.findAll('.tree-node')).toHaveLength(1) // only parent
    })
  })

  describe('Interaction', () => {
    it('emits toggle-expansion when expand button is clicked', async () => {
      const node = createMockNode({
        key: 'user',
        value: { name: 'John' },
        type: 'object',
        isExpandable: true,
        path: ['root', 'user'],
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.expand-button').trigger('click')

      expect(wrapper.emitted('toggle-expansion')).toBeTruthy()
      expect(wrapper.emitted('toggle-expansion')?.[0]).toEqual(['root.user'])
    })

    it('emits node-select when node is clicked', async () => {
      const node = createMockNode({
        path: ['root', 'test'],
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('click')

      expect(wrapper.emitted('node-select')).toBeTruthy()
      expect(wrapper.emitted('node-select')?.[0]).toEqual(['root.test'])
    })

    it('copies key to clipboard when key is clicked', async () => {
      const node = createMockNode({
        key: 'testKey',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.node-key').trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('testKey')
      expect(wrapper.emitted('copy-success')).toBeTruthy()
    })

    it('copies value to clipboard when value is clicked', async () => {
      const node = createMockNode({
        value: 'test value',
        type: 'string',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.node-value').trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('"test value"')
      expect(wrapper.emitted('copy-success')).toBeTruthy()
    })
  })

  describe('Visual States', () => {
    it('applies selected styling when isSelected is true', () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: {
          node,
          isSelected: true,
        },
      })

      expect(wrapper.find('.tree-node').classes()).toContain('bg-blue-50')
      expect(wrapper.find('.tree-node').classes()).toContain('border-blue-400')
    })

    it('applies highlighted styling when isHighlighted is true', () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: {
          node,
          isHighlighted: true,
        },
      })

      expect(wrapper.find('.tree-node').classes()).toContain('bg-yellow-50')
    })

    it('shows copy button on hover', async () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: { node },
      })

      // Initially hidden
      expect(wrapper.find('.copy-button').exists()).toBe(false)

      // Show on hover
      await wrapper.find('.tree-node').trigger('mouseenter')
      expect(wrapper.find('.copy-button').exists()).toBe(true)

      // Hide on mouse leave
      await wrapper.find('.tree-node').trigger('mouseleave')
      expect(wrapper.find('.copy-button').exists()).toBe(false)
    })

    it('rotates expand button when expanded', () => {
      const node = createMockNode({
        type: 'object',
        isExpandable: true,
      })

      const wrapper = mountTreeNode({
        props: {
          node,
          isExpanded: true,
        },
      })

      expect(wrapper.find('.expand-button').classes()).toContain('rotate-90')
    })
  })

  describe('Depth and Indentation', () => {
    it('applies correct indentation based on depth', () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: {
          node,
          depth: 3,
        },
      })

      const treeNode = wrapper.find('.tree-node')
      expect(treeNode.attributes('style')).toContain('padding-left: 68px') // 3 * 20 + 8
    })

    it('has default depth of 0', () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: { node },
      })

      const treeNode = wrapper.find('.tree-node')
      expect(treeNode.attributes('style')).toContain('padding-left: 8px') // 0 * 20 + 8
    })
  })

  describe('Copy Functionality', () => {
    it('copies entire subtree for expandable nodes', async () => {
      const node = createMockNode({
        key: 'user',
        value: { name: 'John', age: 25 },
        type: 'object',
        isExpandable: true,
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      // Trigger hover to show copy button
      await wrapper.find('.tree-node').trigger('mouseenter')
      await wrapper.find('.copy-button').trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify({ name: 'John', age: 25 }, null, 2),
      )
    })

    it('handles clipboard API failure gracefully', async () => {
      // Mock clipboard failure
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Clipboard failed'))

      // Mock document.execCommand to succeed for fallback
      vi.mocked(document.execCommand).mockReturnValueOnce(true)

      const node = createMockNode({
        key: 'test',
        value: 'test value',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      // Should not throw error
      await wrapper.find('.node-key').trigger('click')

      // Wait for async operations to complete
      await wrapper.vm.$nextTick()

      // Should still emit copy-success via fallback
      expect(wrapper.emitted('copy-success')).toBeTruthy()
    })
  })

  describe('Context Menu', () => {
    it('shows context menu on right click', async () => {
      const node = createMockNode()
      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('contextmenu')

      expect(wrapper.findComponent(ContextMenu).props('isVisible')).toBe(true)
    })

    it('shows context menu button on hover', async () => {
      const node = createMockNode()
      const wrapper = mountTreeNode({
        props: { node },
      })

      // Initially hidden
      expect(wrapper.find('.context-menu-button').exists()).toBe(false)

      // Show on hover
      await wrapper.find('.tree-node').trigger('mouseenter')
      expect(wrapper.find('.context-menu-button').exists()).toBe(true)
    })

    it('opens context menu when context menu button is clicked', async () => {
      const node = createMockNode()
      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('mouseenter')
      await wrapper.find('.context-menu-button').trigger('click')

      expect(wrapper.findComponent(ContextMenu).props('isVisible')).toBe(true)
    })

    it('provides correct context menu items for expandable nodes', async () => {
      const node = createMockNode({
        type: 'object',
        isExpandable: true,
        value: { test: 'value' },
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('contextmenu')

      const contextMenu = wrapper.findComponent(ContextMenu)
      const items = contextMenu.props('items')

      expect(items).toHaveLength(4)
      expect(items[0].label).toBe('Copy Key')
      expect(items[1].label).toBe('Copy Subtree')
      expect(items[2].label).toBe('Copy Path')
      expect(items[3].label).toBe('Expand')
    })

    it('provides correct context menu items for non-expandable nodes', async () => {
      const node = createMockNode({
        type: 'string',
        isExpandable: false,
        value: 'test value',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('contextmenu')

      const contextMenu = wrapper.findComponent(ContextMenu)
      const items = contextMenu.props('items')

      expect(items).toHaveLength(4)
      expect(items[1].label).toBe('Copy Value')
      expect(items[3].disabled).toBe(true)
    })
  })

  describe('Enhanced Copy Functionality', () => {
    it('copies key when key is clicked', async () => {
      const node = createMockNode({
        key: 'testKey',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.node-key').trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('testKey')
    })

    it('copies value when value is clicked', async () => {
      const node = createMockNode({
        value: 'test value',
        type: 'string',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.node-value').trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('"test value"')
    })

    it('copies path when copy path action is triggered', async () => {
      const node = createMockNode({
        path: ['root', 'user', 'name'],
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      // Access the component instance to call copyPath directly
      await (wrapper.vm as any).copyPath()

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('root.user.name')
    })

    it('copies entire subtree for expandable nodes', async () => {
      const node = createMockNode({
        key: 'user',
        value: { name: 'John', age: 25 },
        type: 'object',
        isExpandable: true,
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('mouseenter')
      await wrapper.find('.copy-button').trigger('click')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify({ name: 'John', age: 25 }, null, 2),
      )
    })
  })

  describe('Keyboard Navigation', () => {
    it('handles Enter key to toggle expansion', async () => {
      const node = createMockNode({
        type: 'object',
        isExpandable: true,
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('toggle-expansion')).toBeTruthy()
    })

    it('handles Space key to toggle expansion', async () => {
      const node = createMockNode({
        type: 'object',
        isExpandable: true,
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('keydown', { key: ' ' })

      expect(wrapper.emitted('toggle-expansion')).toBeTruthy()
    })

    it('handles Ctrl+Shift+C to copy node data', async () => {
      const node = createMockNode({
        value: 'test value',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper
        .find('.tree-node')
        .trigger('keydown', { key: 'C', ctrlKey: true, shiftKey: true })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('"test value"')
    })

    it('handles Ctrl+K to copy key', async () => {
      const node = createMockNode({
        key: 'testKey',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('keydown', { key: 'k', ctrlKey: true })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('testKey')
    })

    it('handles Ctrl+P to copy path', async () => {
      const node = createMockNode({
        path: ['root', 'test'],
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('keydown', { key: 'p', ctrlKey: true })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('root.test')
    })

    it('handles Shift+F10 to show context menu', async () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: { node },
      })

      await wrapper.find('.tree-node').trigger('keydown', { key: 'F10', shiftKey: true })

      expect(wrapper.findComponent(ContextMenu).props('isVisible')).toBe(true)
    })

    it('focuses node when clicked', async () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: { node },
      })

      const treeNode = wrapper.find('.tree-node')
      await treeNode.trigger('click')

      // Check if the node has focus (tabindex should be 0 when selected)
      expect(wrapper.emitted('node-select')).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for expand button', () => {
      const node = createMockNode({
        type: 'object',
        isExpandable: true,
      })

      const wrapper = mountTreeNode({
        props: {
          node,
          isExpanded: false,
        },
      })

      expect(wrapper.find('.expand-button').attributes('aria-label')).toBe('Expand')
      expect(wrapper.find('.expand-button').attributes('aria-expanded')).toBe('false')
    })

    it('updates ARIA label when expanded', () => {
      const node = createMockNode({
        type: 'object',
        isExpandable: true,
      })

      const wrapper = mountTreeNode({
        props: {
          node,
          isExpanded: true,
        },
      })

      expect(wrapper.find('.expand-button').attributes('aria-label')).toBe('Collapse')
      expect(wrapper.find('.expand-button').attributes('aria-expanded')).toBe('true')
    })

    it('has proper title and aria-label attributes for interactive elements', () => {
      const node = createMockNode({
        key: 'testKey',
        value: 'testValue',
      })

      const wrapper = mountTreeNode({
        props: { node },
      })

      expect(wrapper.find('.node-key').attributes('title')).toBe('Copy key: testKey')
      expect(wrapper.find('.node-key').attributes('aria-label')).toBe(
        'Key: "testKey", press Enter to copy',
      )
      expect(wrapper.find('.node-value').attributes('title')).toBe('Copy value: "testValue"')
      expect(wrapper.find('.node-value').attributes('aria-label')).toBe(
        'Value: "testValue", press Enter to copy',
      )
    })

    it('has proper tabindex for keyboard navigation', () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: {
          node,
          isSelected: true,
        },
      })

      expect(wrapper.find('.tree-node').attributes('tabindex')).toBe('0')
    })

    it('has tabindex -1 when not selected', () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: {
          node,
          isSelected: false,
        },
      })

      expect(wrapper.find('.tree-node').attributes('tabindex')).toBe('-1')
    })

    it('has focus ring styles', () => {
      const node = createMockNode()

      const wrapper = mountTreeNode({
        props: { node },
      })

      const treeNode = wrapper.find('.tree-node')
      expect(treeNode.classes()).toContain('focus:outline-none')
      expect(treeNode.classes()).toContain('focus:ring-2')
      expect(treeNode.classes()).toContain('focus:ring-blue-500')
    })
  })
})
