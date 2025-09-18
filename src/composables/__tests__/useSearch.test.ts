import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSearch } from '../useSearch'
import { useJsonStore } from '@/stores/json'
import type { JSONNode } from '@/types'

// Mock the store
vi.mock('@/stores/json')

describe('useSearch', () => {
  let mockStore: any

  beforeEach(() => {
    setActivePinia(createPinia())

    // Create mock store
    mockStore = {
      searchQuery: '',
      searchResults: [],
      currentSearchIndex: -1,
      hasSearchResults: false,
      updateSearchQuery: vi.fn(),
      navigateToNextSearchResult: vi.fn(),
      navigateToPreviousSearchResult: vi.fn(),
      clearSearch: vi.fn(),
      selectNode: vi.fn(),
      getNodeByPath: vi.fn(),
      treeState: {
        currentSearchIndex: -1,
      },
    }

    // Mock the useJsonStore
    vi.mocked(useJsonStore).mockReturnValue(mockStore)
  })

  describe('Initialization', () => {
    it('initializes with default options', () => {
      const search = useSearch()

      expect(search.searchOptions.value).toEqual({
        caseSensitive: false,
        matchWholeWords: false,
        searchKeys: true,
        searchValues: true,
      })
    })

    it('initializes with custom options', () => {
      const customOptions = {
        caseSensitive: true,
        matchWholeWords: true,
        searchKeys: false,
        searchValues: true,
      }

      const search = useSearch(customOptions)

      expect(search.searchOptions.value).toEqual(customOptions)
    })
  })

  describe('Search Methods', () => {
    it('calls store updateSearchQuery when search is called', async () => {
      const search = useSearch()

      await search.search('test query')

      expect(mockStore.updateSearchQuery).toHaveBeenCalledWith('test query')
    })

    it('calls store clearSearch when clearSearch is called', () => {
      const search = useSearch()

      search.clearSearch()

      expect(mockStore.clearSearch).toHaveBeenCalled()
    })

    it('calls store navigation methods', () => {
      const search = useSearch()

      search.navigateToNext()
      expect(mockStore.navigateToNextSearchResult).toHaveBeenCalled()

      search.navigateToPrevious()
      expect(mockStore.navigateToPreviousSearchResult).toHaveBeenCalled()
    })
  })

  describe('Navigation Methods', () => {
    beforeEach(() => {
      mockStore.searchResults = ['path1', 'path2', 'path3']
      mockStore.hasSearchResults = true
    })

    it('navigates to specific result index', () => {
      const search = useSearch()

      search.navigateToResult(1)

      expect(mockStore.treeState.currentSearchIndex).toBe(1)
      expect(mockStore.selectNode).toHaveBeenCalledWith('path2')
    })

    it('does not navigate to invalid index', () => {
      const search = useSearch()

      search.navigateToResult(-1)
      search.navigateToResult(5)

      expect(mockStore.selectNode).not.toHaveBeenCalled()
    })
  })

  describe('Advanced Search', () => {
    const mockNodes: JSONNode[] = [
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

    it('performs case-insensitive search by default', () => {
      const search = useSearch()

      const results = search.performAdvancedSearch('JOHN', mockNodes)

      expect(results).toHaveLength(1)
      expect(results[0].nodePath).toBe('name')
      expect(results[0].matchType).toBe('value')
    })

    it('performs case-sensitive search when enabled', () => {
      const search = useSearch({ caseSensitive: true })

      const results = search.performAdvancedSearch('JOHN', mockNodes)

      expect(results).toHaveLength(0)
    })

    it('searches keys when enabled', () => {
      const search = useSearch({ searchKeys: true, searchValues: false })

      const results = search.performAdvancedSearch('name', mockNodes)

      expect(results).toHaveLength(1)
      expect(results[0].matchType).toBe('key')
    })

    it('searches values when enabled', () => {
      const search = useSearch({ searchKeys: false, searchValues: true })

      const results = search.performAdvancedSearch('John', mockNodes)

      expect(results).toHaveLength(1)
      expect(results[0].matchType).toBe('value')
    })

    it('searches both keys and values', () => {
      const search = useSearch({ searchKeys: true, searchValues: true })

      const results = search.performAdvancedSearch('street', mockNodes)

      // Should find both the key 'street' and the value '123 Main St' containing 'street'
      expect(results.length).toBeGreaterThan(0)
    })

    it('performs whole word matching when enabled', () => {
      const search = useSearch({ matchWholeWords: true })

      const results1 = search.performAdvancedSearch('John', mockNodes)
      const results2 = search.performAdvancedSearch('oh', mockNodes)

      expect(results1).toHaveLength(1)
      expect(results2).toHaveLength(0) // 'oh' is part of 'John' but not a whole word
    })

    it('searches nested nodes', () => {
      const search = useSearch()

      const results = search.performAdvancedSearch('Main', mockNodes)

      expect(results).toHaveLength(1)
      expect(results[0].nodePath).toBe('address.street')
    })

    it('returns empty array for empty query', () => {
      const search = useSearch()

      const results = search.performAdvancedSearch('', mockNodes)

      expect(results).toHaveLength(0)
    })

    it('returns empty array for whitespace-only query', () => {
      const search = useSearch()

      const results = search.performAdvancedSearch('   ', mockNodes)

      expect(results).toHaveLength(0)
    })
  })

  describe('Search Options Update', () => {
    it('updates search options', () => {
      const search = useSearch()

      search.updateSearchOptions({ caseSensitive: true })

      expect(search.searchOptions.value.caseSensitive).toBe(true)
      expect(search.searchOptions.value.matchWholeWords).toBe(false) // Should preserve other options
    })

    it('re-runs search when options change and query exists', async () => {
      mockStore.searchQuery = 'test'
      const search = useSearch()

      search.updateSearchOptions({ caseSensitive: true })

      // Should call updateSearchQuery to re-run search
      expect(mockStore.updateSearchQuery).toHaveBeenCalledWith('test')
    })
  })

  describe('Store Integration', () => {
    it('integrates with store methods', () => {
      const search = useSearch()

      // Test that the composable properly uses store methods
      expect(typeof search.search).toBe('function')
      expect(typeof search.clearSearch).toBe('function')
      expect(typeof search.navigateToNext).toBe('function')
      expect(typeof search.navigateToPrevious).toBe('function')
    })
  })
})
