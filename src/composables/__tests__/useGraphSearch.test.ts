import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useGraphSearch } from '../useGraphSearch'
import { useJsonStore } from '@/stores/json'
import type { GraphNode } from '@/types'

// Mock the store
vi.mock('@/stores/json')

describe('useGraphSearch', () => {
  let pinia: ReturnType<typeof createPinia>
  let mockStore: any

  const mockGraphNodes: GraphNode[] = [
    {
      id: 'root',
      key: 'root',
      value: { name: 'John', age: 30 },
      type: 'object',
      path: [],
      depth: 0,
      size: 25,
      children: ['root.name', 'root.age'],
    },
    {
      id: 'root.name',
      key: 'name',
      value: 'John',
      type: 'string',
      path: ['name'],
      depth: 1,
      size: 20,
      children: [],
      parent: 'root',
    },
    {
      id: 'root.age',
      key: 'age',
      value: 30,
      type: 'number',
      path: ['age'],
      depth: 1,
      size: 20,
      children: [],
      parent: 'root',
    },
  ]

  const mockGraphLinks = [
    { source: 'root', target: 'root.name', type: 'parent-child' as const },
    { source: 'root', target: 'root.age', type: 'parent-child' as const },
  ]

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)

    // Create mock store
    mockStore = {
      searchQuery: '',
      graphNodes: mockGraphNodes,
      graphLinks: mockGraphLinks,
      highlightGraphNodes: vi.fn(),
      clearGraphHighlights: vi.fn(),
      selectGraphNode: vi.fn(),
    }

    // Mock the useJsonStore
    vi.mocked(useJsonStore).mockReturnValue(mockStore as any)

    // Mock document events
    global.document.dispatchEvent = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const graphSearch = useGraphSearch()

      expect(graphSearch.searchQuery.value).toBe('')
      expect(graphSearch.hasGraphSearchResults.value).toBe(false)
      expect(graphSearch.totalGraphResults.value).toBe(0)
      expect(graphSearch.isSearching.value).toBe(false)
    })

    it('should initialize with custom options', () => {
      const options = {
        caseSensitive: true,
        matchWholeWords: true,
        searchKeys: false,
        searchValues: true,
        highlightConnections: false,
      }

      const graphSearch = useGraphSearch(options)

      expect(graphSearch.searchOptions.value.caseSensitive).toBe(true)
      expect(graphSearch.searchOptions.value.matchWholeWords).toBe(true)
      expect(graphSearch.searchOptions.value.searchKeys).toBe(false)
      expect(graphSearch.searchOptions.value.searchValues).toBe(true)
      expect(graphSearch.searchOptions.value.highlightConnections).toBe(false)
    })
  })

  describe('search functionality', () => {
    it('should perform basic search on node keys', async () => {
      const graphSearch = useGraphSearch()

      const results = graphSearch.performGraphSearch('name', mockGraphNodes)

      expect(results).toHaveLength(1)
      expect(results[0].nodeId).toBe('root.name')
      expect(results[0].matchType).toBe('key')
      expect(results[0].matchText).toBe('name')
    })

    it('should perform basic search on node values', async () => {
      const graphSearch = useGraphSearch()

      const results = graphSearch.performGraphSearch('John', mockGraphNodes)

      expect(results).toHaveLength(1)
      expect(results[0].nodeId).toBe('root.name')
      expect(results[0].matchType).toBe('value')
      expect(results[0].matchText).toBe('John')
    })

    it('should perform search on both keys and values', async () => {
      const graphSearch = useGraphSearch()

      const results = graphSearch.performGraphSearch('30', mockGraphNodes)

      expect(results).toHaveLength(1)
      expect(results[0].nodeId).toBe('root.age')
      expect(results[0].matchType).toBe('value')
    })

    it('should handle case insensitive search by default', async () => {
      const graphSearch = useGraphSearch()

      const results = graphSearch.performGraphSearch('JOHN', mockGraphNodes)

      expect(results).toHaveLength(1)
      expect(results[0].nodeId).toBe('root.name')
    })

    it('should handle case sensitive search when enabled', async () => {
      const graphSearch = useGraphSearch({ caseSensitive: true })

      const results = graphSearch.performGraphSearch('JOHN', mockGraphNodes)

      expect(results).toHaveLength(0)
    })

    it('should return empty results for empty query', async () => {
      const graphSearch = useGraphSearch()

      const results = graphSearch.performGraphSearch('', mockGraphNodes)

      expect(results).toHaveLength(0)
    })

    it('should return empty results for no matches', async () => {
      const graphSearch = useGraphSearch()

      const results = graphSearch.performGraphSearch('nonexistent', mockGraphNodes)

      expect(results).toHaveLength(0)
    })
  })

  describe('search options', () => {
    it('should respect searchKeys option', async () => {
      const graphSearch = useGraphSearch({ searchKeys: false, searchValues: true })

      const results = graphSearch.performGraphSearch('name', mockGraphNodes)

      expect(results).toHaveLength(0) // Should not find key matches
    })

    it('should respect searchValues option', async () => {
      const graphSearch = useGraphSearch({ searchKeys: true, searchValues: false })

      const results = graphSearch.performGraphSearch('John', mockGraphNodes)

      expect(results).toHaveLength(0) // Should not find value matches
    })

    it('should handle whole word matching', async () => {
      const nodesWithPartialMatch: GraphNode[] = [
        {
          id: 'test',
          key: 'username',
          value: 'test',
          type: 'string',
          path: ['username'],
          depth: 0,
          size: 20,
          children: [],
        },
      ]

      const graphSearch = useGraphSearch({ matchWholeWords: true })

      // Should not match partial word
      let results = graphSearch.performGraphSearch('name', nodesWithPartialMatch)
      expect(results).toHaveLength(0)

      // Should match whole word
      results = graphSearch.performGraphSearch('username', nodesWithPartialMatch)
      expect(results).toHaveLength(1)
    })
  })

  describe('search result scoring', () => {
    it('should score exact matches higher', async () => {
      const nodesWithExactMatch: GraphNode[] = [
        {
          id: 'exact',
          key: 'name',
          value: 'name',
          type: 'string',
          path: ['name'],
          depth: 0,
          size: 20,
          children: [],
        },
        {
          id: 'partial',
          key: 'username',
          value: 'test',
          type: 'string',
          path: ['username'],
          depth: 0,
          size: 20,
          children: [],
        },
      ]

      const graphSearch = useGraphSearch()
      const results = graphSearch.performGraphSearch('name', nodesWithExactMatch)

      expect(results).toHaveLength(2)
      expect(results[0].nodeId).toBe('exact') // Should be first due to higher score
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })

    it('should score shallower nodes higher', async () => {
      const nodesWithDifferentDepths: GraphNode[] = [
        {
          id: 'shallow',
          key: 'test',
          value: 'value',
          type: 'string',
          path: ['test'],
          depth: 1,
          size: 20,
          children: [],
        },
        {
          id: 'deep',
          key: 'test',
          value: 'value',
          type: 'string',
          path: ['deep', 'nested', 'test'],
          depth: 3,
          size: 20,
          children: [],
        },
      ]

      const graphSearch = useGraphSearch()
      const results = graphSearch.performGraphSearch('test', nodesWithDifferentDepths)

      expect(results).toHaveLength(2)
      expect(results[0].nodeId).toBe('shallow')
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })
  })

  describe('debounced search', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce search queries', async () => {
      const graphSearch = useGraphSearch()

      // Set search query multiple times quickly
      graphSearch.searchQuery.value = 'a'
      graphSearch.searchQuery.value = 'ab'
      graphSearch.searchQuery.value = 'abc'

      expect(graphSearch.isSearching.value).toBe(true)
      expect(graphSearch.graphSearchResults.value).toHaveLength(0)

      // Fast-forward past debounce delay
      vi.advanceTimersByTime(300)
      await nextTick()

      expect(graphSearch.isSearching.value).toBe(false)
    })

    it('should clear search immediately for empty query', async () => {
      const graphSearch = useGraphSearch()

      // Set a search query first
      graphSearch.searchQuery.value = 'test'
      vi.advanceTimersByTime(300)
      await nextTick()

      // Clear the search
      graphSearch.searchQuery.value = ''

      expect(graphSearch.isSearching.value).toBe(false)
      expect(graphSearch.graphSearchResults.value).toHaveLength(0)
    })
  })

  describe('navigation', () => {
    it('should navigate to next search result', async () => {
      const graphSearch = useGraphSearch()

      // Simulate search results
      graphSearch.graphSearchResults.value = [
        {
          nodeId: 'root.name',
          node: mockGraphNodes[1],
          matchType: 'key',
          matchText: 'name',
          score: 10,
        },
        {
          nodeId: 'root.age',
          node: mockGraphNodes[2],
          matchType: 'key',
          matchText: 'age',
          score: 8,
        },
      ]
      graphSearch.currentGraphSearchIndex.value = 0

      graphSearch.navigateToNextGraphResult()

      expect(graphSearch.currentGraphSearchIndex.value).toBe(1)
    })

    it('should wrap to first result when navigating past last', async () => {
      const graphSearch = useGraphSearch()

      // Simulate search results
      graphSearch.graphSearchResults.value = [
        {
          nodeId: 'root.name',
          node: mockGraphNodes[1],
          matchType: 'key',
          matchText: 'name',
          score: 10,
        },
        {
          nodeId: 'root.age',
          node: mockGraphNodes[2],
          matchType: 'key',
          matchText: 'age',
          score: 8,
        },
      ]
      graphSearch.currentGraphSearchIndex.value = 1

      graphSearch.navigateToNextGraphResult()

      expect(graphSearch.currentGraphSearchIndex.value).toBe(0)
    })

    it('should navigate to previous search result', async () => {
      const graphSearch = useGraphSearch()

      // Simulate search results
      graphSearch.graphSearchResults.value = [
        {
          nodeId: 'root.name',
          node: mockGraphNodes[1],
          matchType: 'key',
          matchText: 'name',
          score: 10,
        },
        {
          nodeId: 'root.age',
          node: mockGraphNodes[2],
          matchType: 'key',
          matchText: 'age',
          score: 8,
        },
      ]
      graphSearch.currentGraphSearchIndex.value = 1

      graphSearch.navigateToPreviousGraphResult()

      expect(graphSearch.currentGraphSearchIndex.value).toBe(0)
    })

    it('should wrap to last result when navigating before first', async () => {
      const graphSearch = useGraphSearch()

      // Simulate search results
      graphSearch.graphSearchResults.value = [
        {
          nodeId: 'root.name',
          node: mockGraphNodes[1],
          matchType: 'key',
          matchText: 'name',
          score: 10,
        },
        {
          nodeId: 'root.age',
          node: mockGraphNodes[2],
          matchType: 'key',
          matchText: 'age',
          score: 8,
        },
      ]
      graphSearch.currentGraphSearchIndex.value = 0

      graphSearch.navigateToPreviousGraphResult()

      expect(graphSearch.currentGraphSearchIndex.value).toBe(1)
    })
  })

  describe('highlighting', () => {
    it('should highlight matching nodes', async () => {
      const graphSearch = useGraphSearch()

      // Simulate search results
      graphSearch.graphSearchResults.value = [
        {
          nodeId: 'root.name',
          node: mockGraphNodes[1],
          matchType: 'key',
          matchText: 'name',
          score: 10,
        },
      ]

      expect(graphSearch.isNodeHighlightedBySearch('root.name')).toBe(false)

      // Trigger highlighting update
      graphSearch.highlightedGraphNodes.value.add('root.name')

      expect(graphSearch.isNodeHighlightedBySearch('root.name')).toBe(true)
    })

    it('should dim non-matching nodes during search', async () => {
      const graphSearch = useGraphSearch()

      // Simulate search results
      graphSearch.graphSearchResults.value = [
        {
          nodeId: 'root.name',
          node: mockGraphNodes[1],
          matchType: 'key',
          matchText: 'name',
          score: 10,
        },
      ]

      // Trigger dimming update
      graphSearch.dimmedGraphNodes.value.add('root.age')

      expect(graphSearch.isNodeDimmedBySearch('root.age')).toBe(true)
      expect(graphSearch.isNodeDimmedBySearch('root.name')).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should clear search state', async () => {
      const graphSearch = useGraphSearch()

      // Set up some search state
      graphSearch.graphSearchResults.value = [
        {
          nodeId: 'root.name',
          node: mockGraphNodes[1],
          matchType: 'key',
          matchText: 'name',
          score: 10,
        },
      ]
      graphSearch.currentGraphSearchIndex.value = 0
      graphSearch.highlightedGraphNodes.value.add('root.name')

      graphSearch.clearGraphSearch()

      expect(graphSearch.graphSearchResults.value).toHaveLength(0)
      expect(graphSearch.currentGraphSearchIndex.value).toBe(-1)
      expect(graphSearch.highlightedGraphNodes.value.size).toBe(0)
      expect(mockStore.clearGraphHighlights).toHaveBeenCalled()
    })
  })
})
