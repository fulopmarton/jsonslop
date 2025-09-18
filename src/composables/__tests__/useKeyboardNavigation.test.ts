import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useKeyboardNavigation } from '../useKeyboardNavigation'
import { useJsonStore } from '@/stores/json'

// Mock the JSON store
vi.mock('@/stores/json', () => ({
  useJsonStore: vi.fn(),
}))

describe('useKeyboardNavigation', () => {
  let mockJsonStore: any
  let mockOptions: any

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)

    mockOptions = {
      onCopy: vi.fn(),
      onToggleExpansion: vi.fn(),
      onSelectNode: vi.fn(),
    }

    mockJsonStore = {
      hasValidJson: true,
      treeState: {
        selectedNode: 'root.user',
      },
      jsonTree: [
        {
          key: 'root',
          path: ['root'],
          isExpandable: true,
          children: [
            {
              key: 'user',
              path: ['root', 'user'],
              isExpandable: true,
              children: [
                {
                  key: 'name',
                  path: ['root', 'user', 'name'],
                  value: 'John',
                  isExpandable: false,
                },
              ],
            },
          ],
        },
      ],
      isNodeExpanded: vi.fn(() => true),
      collapseNode: vi.fn(),
      expandNode: vi.fn(),
      toggleNodeExpansion: vi.fn(),
      selectNode: vi.fn(),
      getNodeByPath: vi.fn(() => ({
        key: 'user',
        value: { name: 'John' },
        isExpandable: true,
        children: [
          {
            key: 'name',
            path: ['root', 'user', 'name'],
            value: 'John',
            isExpandable: false,
          },
        ],
      })),
    }

    vi.mocked(useJsonStore).mockReturnValue(mockJsonStore)
  })

  it('should initialize with inactive state', () => {
    const { isActive } = useKeyboardNavigation()

    expect(isActive.value).toBe(false)
  })

  it('should activate and deactivate', () => {
    const { isActive, activate, deactivate } = useKeyboardNavigation()

    activate()
    expect(isActive.value).toBe(true)

    deactivate()
    expect(isActive.value).toBe(false)
  })

  it('should handle ArrowUp key to navigate up', () => {
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    // Mock getAllVisibleNodePaths to return a list
    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    // Simulate key event
    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })

  it('should handle ArrowDown key to navigate down', () => {
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })

  it('should handle ArrowLeft key to collapse or navigate to parent', () => {
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockJsonStore.collapseNode).toHaveBeenCalledWith('root.user')
  })

  it('should handle ArrowRight key to expand or navigate to first child', () => {
    mockJsonStore.isNodeExpanded.mockReturnValue(false)
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockJsonStore.expandNode).toHaveBeenCalledWith('root.user')
  })

  it('should handle Enter key to toggle expansion', () => {
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockJsonStore.toggleNodeExpansion).toHaveBeenCalledWith('root.user')
  })

  it('should handle Space key to toggle expansion', () => {
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: ' ' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockJsonStore.toggleNodeExpansion).toHaveBeenCalledWith('root.user')
  })

  it('should handle Ctrl+C to copy selected node', () => {
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockOptions.onCopy).toHaveBeenCalledWith(JSON.stringify({ name: 'John' }, null, 2))
  })

  it('should handle Escape key to deselect node', () => {
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockJsonStore.selectNode).toHaveBeenCalledWith(null)
  })

  it('should not handle keys when inactive', () => {
    const {} = useKeyboardNavigation(mockOptions)
    // Don't activate

    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
  })

  it('should not handle keys when no valid JSON', () => {
    mockJsonStore.hasValidJson = false
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
  })

  it('should not handle keys when no node is selected', () => {
    mockJsonStore.treeState.selectedNode = null
    const { activate } = useKeyboardNavigation(mockOptions)
    activate()

    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' })
    Object.defineProperty(mockEvent, 'preventDefault', {
      value: vi.fn(),
    })

    document.dispatchEvent(mockEvent)

    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
  })
})
