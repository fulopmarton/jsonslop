import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import VisualizationPanel from '../VisualizationPanel.vue'
import { useJsonStore } from '@/stores/json'
import type { JSONNode } from '@/types'

// Mock TreeNode component
vi.mock('../TreeNode.vue', () => ({
  default: {
    name: 'TreeNode',
    template: '<div class="mock-tree-node">{{ node.key }}: {{ node.value }}</div>',
    props: ['node', 'depth', 'isExpanded', 'isSelected', 'isHighlighted'],
    emits: ['toggle-expansion', 'node-select', 'copy-success'],
  },
}))

describe('VisualizationPanel', () => {
  let pinia: ReturnType<typeof createPinia>
  let jsonStore: ReturnType<typeof useJsonStore>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    jsonStore = useJsonStore()
  })

  it('renders empty state when no JSON data is available', () => {
    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.text()).toContain('No JSON to visualize')
    expect(wrapper.text()).toContain('Enter valid JSON in the input panel')
  })

  it('renders loading state when processing JSON', async () => {
    // Set processing state
    jsonStore.isProcessing = true
    jsonStore.processingMessage = 'Processing JSON...'

    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.text()).toContain('Processing JSON...')
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
  })

  it('renders error state when JSON has validation errors', async () => {
    // Set error state - need to set hasValidJson to true but hasErrors to true
    jsonStore.validationErrors = [
      {
        line: 1,
        column: 1,
        message: 'Invalid JSON syntax',
        severity: 'error',
      },
    ]
    jsonStore.isValidJson = true // This makes hasValidJson true
    jsonStore.parsedJsonData = {} // But we still have errors

    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.text()).toContain('JSON contains errors')
    expect(wrapper.text()).toContain('Fix the JSON syntax errors')
  })

  it('renders tree visualization when valid JSON is provided', async () => {
    // Create mock JSON tree data
    const mockJsonTree: JSONNode[] = [
      {
        key: 'name',
        value: 'John Doe',
        type: 'string',
        path: ['name'],
        isExpandable: false,
      },
      {
        key: 'age',
        value: 30,
        type: 'number',
        path: ['age'],
        isExpandable: false,
      },
      {
        key: 'address',
        value: { street: '123 Main St', city: 'New York' },
        type: 'object',
        path: ['address'],
        isExpandable: true,
        children: [
          {
            key: 'street',
            value: '123 Main St',
            type: 'string',
            path: ['address', 'street'],
            isExpandable: false,
          },
          {
            key: 'city',
            value: 'New York',
            type: 'string',
            path: ['address', 'city'],
            isExpandable: false,
          },
        ],
      },
    ]

    // Set valid JSON state
    jsonStore.jsonTree = mockJsonTree
    jsonStore.isValidJson = true
    jsonStore.parsedJsonData = {
      name: 'John Doe',
      age: 30,
      address: { street: '123 Main St', city: 'New York' },
    }

    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    // Should render tree nodes
    expect(wrapper.findAll('.mock-tree-node')).toHaveLength(3)
    expect(wrapper.text()).toContain('5 nodes') // The store counts all nodes including children
  })

  it('displays node count and expanded node count', async () => {
    const mockJsonTree: JSONNode[] = [
      {
        key: 'test',
        value: 'value',
        type: 'string',
        path: ['test'],
        isExpandable: false,
      },
    ]

    jsonStore.jsonTree = mockJsonTree
    jsonStore.isValidJson = true
    jsonStore.parsedJsonData = { test: 'value' }

    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.text()).toContain('1 nodes')
  })

  it('handles expand all button click', async () => {
    const mockJsonTree: JSONNode[] = [
      {
        key: 'obj',
        value: { nested: 'value' },
        type: 'object',
        path: ['obj'],
        isExpandable: true,
        children: [
          {
            key: 'nested',
            value: 'value',
            type: 'string',
            path: ['obj', 'nested'],
            isExpandable: false,
          },
        ],
      },
    ]

    jsonStore.jsonTree = mockJsonTree
    jsonStore.isValidJson = true
    jsonStore.parsedJsonData = { obj: { nested: 'value' } }

    const expandAllSpy = vi.spyOn(jsonStore, 'expandAllNodes')

    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    const buttons = wrapper.findAll('button')
    const expandAllButton = buttons.find((button) => button.text().includes('Expand All'))
    await expandAllButton!.trigger('click')

    expect(expandAllSpy).toHaveBeenCalled()
  })

  it('handles collapse all button click', async () => {
    const mockJsonTree: JSONNode[] = [
      {
        key: 'obj',
        value: { nested: 'value' },
        type: 'object',
        path: ['obj'],
        isExpandable: true,
        children: [
          {
            key: 'nested',
            value: 'value',
            type: 'string',
            path: ['obj', 'nested'],
            isExpandable: false,
          },
        ],
      },
    ]

    jsonStore.jsonTree = mockJsonTree
    jsonStore.isValidJson = true
    jsonStore.parsedJsonData = { obj: { nested: 'value' } }

    const collapseAllSpy = vi.spyOn(jsonStore, 'collapseAllNodes')

    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    const buttons = wrapper.findAll('button')
    const collapseAllButton = buttons.find((button) => button.text().includes('Collapse All'))
    await collapseAllButton!.trigger('click')

    expect(collapseAllSpy).toHaveBeenCalled()
  })

  it('handles tree node events', async () => {
    const mockJsonTree: JSONNode[] = [
      {
        key: 'test',
        value: 'value',
        type: 'string',
        path: ['test'],
        isExpandable: false,
      },
    ]

    jsonStore.jsonTree = mockJsonTree
    jsonStore.isValidJson = true
    jsonStore.parsedJsonData = { test: 'value' }

    const toggleExpansionSpy = vi.spyOn(jsonStore, 'toggleNodeExpansion')
    const selectNodeSpy = vi.spyOn(jsonStore, 'selectNode')

    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    // Simulate tree node events
    const treeNode = wrapper.findComponent({ name: 'TreeNode' })

    await treeNode.vm.$emit('toggle-expansion', 'test')
    expect(toggleExpansionSpy).toHaveBeenCalledWith('test')

    await treeNode.vm.$emit('node-select', 'test')
    expect(selectNodeSpy).toHaveBeenCalledWith('test')
  })

  it('shows copy success notification', async () => {
    const mockJsonTree: JSONNode[] = [
      {
        key: 'test',
        value: 'value',
        type: 'string',
        path: ['test'],
        isExpandable: false,
      },
    ]

    jsonStore.jsonTree = mockJsonTree
    jsonStore.isValidJson = true
    jsonStore.parsedJsonData = { test: 'value' }

    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    const treeNode = wrapper.findComponent({ name: 'TreeNode' })

    // Simulate copy success event
    await treeNode.vm.$emit('copy-success', 'Copied: test value')

    expect(wrapper.text()).toContain('Copied: test value')
    expect(wrapper.find('.fixed.bottom-4.right-4').exists()).toBe(true)
  })

  it('disables buttons when no valid JSON is available', () => {
    const wrapper = mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    const buttons = wrapper.findAll('button')
    const expandAllButton = buttons.find((button) => button.text().includes('Expand All'))
    const collapseAllButton = buttons.find((button) => button.text().includes('Collapse All'))

    expect(expandAllButton!.attributes('disabled')).toBeDefined()
    expect(collapseAllButton!.attributes('disabled')).toBeDefined()
  })

  it('calls store initialization on mount', () => {
    const initializeSpy = vi.spyOn(jsonStore, 'initializeStore')

    mount(VisualizationPanel, {
      global: {
        plugins: [pinia],
      },
    })

    expect(initializeSpy).toHaveBeenCalled()
  })
})
