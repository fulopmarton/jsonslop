import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useJsonStore } from '../json'

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

describe('JSON Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const store = useJsonStore()

      expect(store.rawJsonInput).toBe('')
      expect(store.parsedJsonData).toBeNull()
      expect(store.jsonTree).toEqual([])
      expect(store.isValidJson).toBe(false)
      expect(store.validationErrors).toEqual([])
      expect(store.validationWarnings).toEqual([])
      expect(store.validationSuggestions).toEqual([])
      expect(store.isValidating).toBe(false)
      expect(store.searchQuery).toBe('')
      expect(store.isProcessing).toBe(false)
    })

    it('should initialize with default UI preferences', () => {
      const store = useJsonStore()

      expect(store.uiPreferences).toEqual({
        theme: 'auto',
        fontSize: 'medium',
        showLineNumbers: true,
        autoFormat: true,
        expandDepth: 2,
      })
    })

    it('should initialize tree state correctly', () => {
      const store = useJsonStore()

      expect(store.treeState.expandedNodes).toBeInstanceOf(Set)
      expect(store.treeState.expandedNodes.size).toBe(0)
      expect(store.treeState.selectedNode).toBeNull()
      expect(store.treeState.searchResults).toEqual([])
      expect(store.treeState.currentSearchIndex).toBe(-1)
    })
  })

  describe('JSON Input and Validation', () => {
    it('should update JSON input and validate', async () => {
      const store = useJsonStore()
      const validJson = '{"name": "test", "value": 123}'

      await store.updateJsonInput(validJson)

      expect(store.rawJsonInput).toBe(validJson)
      expect(store.isValidJson).toBe(true)
      expect(store.parsedJsonData).toEqual({ name: 'test', value: 123 })
      expect(store.validationErrors).toEqual([])
    })

    it('should handle invalid JSON input', async () => {
      const store = useJsonStore()
      const invalidJson = '{"name": "test", "value": 123'

      await store.updateJsonInput(invalidJson)

      expect(store.rawJsonInput).toBe(invalidJson)
      expect(store.isValidJson).toBe(false)
      expect(store.parsedJsonData).toBeNull()
      expect(store.validationErrors.length).toBeGreaterThan(0)
    })

    it('should build tree structure for valid JSON', async () => {
      const store = useJsonStore()
      const jsonData = {
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' },
        ],
        settings: {
          theme: 'dark',
          notifications: true,
        },
      }

      await store.updateJsonInput(JSON.stringify(jsonData))

      expect(store.jsonTree.length).toBeGreaterThan(0)
      expect(store.totalNodes).toBeGreaterThan(0)
    })

    it('should clear data when input is empty', async () => {
      const store = useJsonStore()

      // First add some data
      await store.updateJsonInput('{"test": true}')
      expect(store.isValidJson).toBe(true)

      // Then clear it
      await store.updateJsonInput('')
      expect(store.parsedJsonData).toBeNull()
      expect(store.jsonTree).toEqual([])
    })
  })

  describe('Tree State Management', () => {
    let store: ReturnType<typeof useJsonStore>

    beforeEach(async () => {
      store = useJsonStore()
      const jsonData = {
        level1: {
          level2: {
            level3: 'deep value',
          },
          array: [1, 2, 3],
        },
      }
      await store.updateJsonInput(JSON.stringify(jsonData))
    })

    it('should toggle node expansion', () => {
      const nodePath = 'root.level1'

      expect(store.isNodeExpanded(nodePath)).toBe(true) // Auto-expanded

      store.toggleNodeExpansion(nodePath)
      expect(store.isNodeExpanded(nodePath)).toBe(false)

      store.toggleNodeExpansion(nodePath)
      expect(store.isNodeExpanded(nodePath)).toBe(true)
    })

    it('should expand and collapse nodes', () => {
      const nodePath = 'root.level1.level2'

      store.collapseNode(nodePath)
      expect(store.isNodeExpanded(nodePath)).toBe(false)

      store.expandNode(nodePath)
      expect(store.isNodeExpanded(nodePath)).toBe(true)
    })

    it('should expand all nodes', () => {
      store.collapseAllNodes()
      expect(store.expandedNodeCount).toBe(0)

      store.expandAllNodes()
      expect(store.expandedNodeCount).toBeGreaterThan(0)
    })

    it('should collapse all nodes', () => {
      store.expandAllNodes()
      const initialCount = store.expandedNodeCount
      expect(initialCount).toBeGreaterThan(0)

      store.collapseAllNodes()
      expect(store.expandedNodeCount).toBe(0)
    })

    it('should auto-expand nodes based on preferences', () => {
      store.collapseAllNodes()
      expect(store.expandedNodeCount).toBe(0)

      store.autoExpandNodes()
      expect(store.expandedNodeCount).toBeGreaterThan(0)
    })

    it('should select and deselect nodes', () => {
      const nodePath = 'root.level1'

      expect(store.isNodeSelected(nodePath)).toBe(false)

      store.selectNode(nodePath)
      expect(store.isNodeSelected(nodePath)).toBe(true)
      expect(store.treeState.selectedNode).toBe(nodePath)

      store.selectNode(null)
      expect(store.isNodeSelected(nodePath)).toBe(false)
      expect(store.treeState.selectedNode).toBeNull()
    })
  })

  describe('Search Functionality', () => {
    let store: ReturnType<typeof useJsonStore>

    beforeEach(async () => {
      store = useJsonStore()
      const jsonData = {
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        ],
        settings: {
          theme: 'dark',
          notifications: true,
        },
      }
      await store.updateJsonInput(JSON.stringify(jsonData))
    })

    it('should perform search and find results', () => {
      store.updateSearchQuery('john')

      expect(store.hasSearchResults).toBe(true)
      expect(store.searchResults.length).toBeGreaterThan(0)
      expect(store.currentSearchIndex).toBe(0)
    })

    it('should navigate through search results', () => {
      store.updateSearchQuery('example')

      const initialIndex = store.currentSearchIndex
      expect(initialIndex).toBe(0)

      store.navigateToNextSearchResult()
      expect(store.currentSearchIndex).toBe(1)

      store.navigateToPreviousSearchResult()
      expect(store.currentSearchIndex).toBe(0)
    })

    it('should clear search results', () => {
      store.updateSearchQuery('test')
      expect(store.searchQuery).toBe('test')

      store.clearSearch()
      expect(store.searchQuery).toBe('')
      expect(store.hasSearchResults).toBe(false)
      expect(store.currentSearchIndex).toBe(-1)
    })

    it('should handle empty search query', () => {
      store.updateSearchQuery('john')
      expect(store.hasSearchResults).toBe(true)

      store.updateSearchQuery('')
      expect(store.hasSearchResults).toBe(false)
    })

    it('should check if node is in search results', () => {
      store.updateSearchQuery('john')

      // This test depends on the actual tree structure and search implementation
      // We'll check that the method works without asserting specific paths
      const hasResults = store.searchResults.length > 0
      if (hasResults) {
        const firstResult = store.searchResults[0]
        expect(store.isNodeInSearchResults(firstResult)).toBe(true)
        expect(store.isNodeInSearchResults('nonexistent.path')).toBe(false)
      }
    })
  })

  describe('UI Preferences', () => {
    it('should update UI preferences', () => {
      const store = useJsonStore()

      store.updateUIPreferences({
        theme: 'dark',
        fontSize: 'large',
      })

      expect(store.uiPreferences.theme).toBe('dark')
      expect(store.uiPreferences.fontSize).toBe('large')
      expect(store.uiPreferences.showLineNumbers).toBe(true) // Should keep existing values
    })

    it('should reset UI preferences to defaults', () => {
      const store = useJsonStore()

      // Change some preferences
      store.updateUIPreferences({
        theme: 'dark',
        fontSize: 'large',
        showLineNumbers: false,
      })

      // Reset to defaults
      store.resetUIPreferences()

      expect(store.uiPreferences).toEqual({
        theme: 'auto',
        fontSize: 'medium',
        showLineNumbers: true,
        autoFormat: true,
        expandDepth: 2,
      })
    })

    it('should save preferences to localStorage', () => {
      const store = useJsonStore()

      store.updateUIPreferences({ theme: 'dark' })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'json-viz-preferences',
        expect.stringContaining('"theme":"dark"'),
      )
    })
  })

  describe('Computed Properties', () => {
    it('should compute hasValidJson correctly', async () => {
      const store = useJsonStore()

      expect(store.hasValidJson).toBe(false)

      await store.updateJsonInput('{"valid": true}')
      expect(store.hasValidJson).toBe(true)

      await store.updateJsonInput('invalid json')
      expect(store.hasValidJson).toBe(false)
    })

    it('should compute hasErrors correctly', async () => {
      const store = useJsonStore()

      expect(store.hasErrors).toBe(false)

      await store.updateJsonInput('invalid json')
      expect(store.hasErrors).toBe(true)

      await store.updateJsonInput('{"valid": true}')
      expect(store.hasErrors).toBe(false)
    })

    it('should compute totalNodes correctly', async () => {
      const store = useJsonStore()

      expect(store.totalNodes).toBe(0)

      await store.updateJsonInput('{"a": 1, "b": {"c": 2}}')
      expect(store.totalNodes).toBeGreaterThan(0)
    })
  })

  describe('Utility Functions', () => {
    let store: ReturnType<typeof useJsonStore>

    beforeEach(async () => {
      store = useJsonStore()
      await store.updateJsonInput('{"level1": {"level2": "value"}}')
    })

    it('should find node by path', () => {
      const node = store.getNodeByPath('root.level1')
      expect(node).toBeTruthy()
      expect(node?.key).toBe('level1')
    })

    it('should return null for non-existent path', () => {
      const node = store.getNodeByPath('nonexistent')
      expect(node).toBeNull()
    })

    it('should clear all data', () => {
      expect(store.hasValidJson).toBe(true)

      store.clearAllData()

      expect(store.rawJsonInput).toBe('')
      expect(store.parsedJsonData).toBeNull()
      expect(store.jsonTree).toEqual([])
      expect(store.isValidJson).toBe(false)
      expect(store.validationErrors).toEqual([])
      expect(store.searchQuery).toBe('')
      expect(store.treeState.selectedNode).toBeNull()
      expect(store.expandedNodeCount).toBe(0)
    })
  })

  describe('Persistence', () => {
    it('should attempt to load preferences from localStorage on initialization', () => {
      localStorageMock.getItem.mockReturnValue('{"theme":"dark","fontSize":"large"}')

      const store = useJsonStore()
      store.initializeStore()

      expect(localStorageMock.getItem).toHaveBeenCalledWith('json-viz-preferences')
    })

    it('should attempt to load tree state from sessionStorage on initialization', () => {
      sessionStorageMock.getItem.mockReturnValue('{"expandedNodes":["test"],"selectedNode":"test"}')

      const store = useJsonStore()
      store.initializeStore()

      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('json-viz-tree-state')
    })

    it('should handle storage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      // Should not throw
      expect(() => {
        const store = useJsonStore()
        store.initializeStore()
      }).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle validation service errors gracefully', async () => {
      const store = useJsonStore()

      // This should not throw even with malformed input
      await store.updateJsonInput('{"malformed": json}')

      expect(store.isValidJson).toBe(false)
      expect(store.hasErrors).toBe(true)
    })

    it('should handle tree building errors gracefully', async () => {
      const store = useJsonStore()

      // Test with circular reference (if possible) or very deep nesting
      const deepObject = { level: 1 }
      let current = deepObject
      for (let i = 2; i <= 100; i++) {
        current.level = { level: i }
        current = current.level as unknown
      }

      await store.updateJsonInput(JSON.stringify(deepObject))

      // Should handle deep nesting without crashing
      expect(store.isValidJson).toBe(true)
    })
  })
})
