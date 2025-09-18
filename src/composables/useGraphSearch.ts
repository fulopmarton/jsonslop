import { ref, computed, watch, onUnmounted } from 'vue'
import { useJsonStore } from '@/stores/json'
import type { GraphNode } from '@/types'

export interface GraphSearchOptions {
  caseSensitive?: boolean
  matchWholeWords?: boolean
  searchKeys?: boolean
  searchValues?: boolean
  highlightConnections?: boolean
}

export interface GraphSearchResult {
  nodeId: string
  node: GraphNode
  matchType: 'key' | 'value' | 'both'
  matchText: string
  score: number // Relevance score for ranking
}

export function useGraphSearch(options: GraphSearchOptions = {}) {
  const jsonStore = useJsonStore()

  // Default options
  const searchOptions = ref<Required<GraphSearchOptions>>({
    caseSensitive: false,
    matchWholeWords: false,
    searchKeys: true,
    searchValues: true,
    highlightConnections: true,
    ...options,
  })

  // Reactive search state
  const isSearching = ref(false)
  const searchTimeout = ref<NodeJS.Timeout | null>(null)
  const searchDelay = ref(300) // Debounce delay in ms

  // Graph-specific search state
  const graphSearchResults = ref<GraphSearchResult[]>([])
  const currentGraphSearchIndex = ref(-1)
  const highlightedGraphNodes = ref<Set<string>>(new Set())
  const dimmedGraphNodes = ref<Set<string>>(new Set())

  // Computed properties
  const searchQuery = computed({
    get: () => jsonStore.searchQuery,
    set: (value: string) => debouncedGraphSearch(value),
  })

  const hasGraphSearchResults = computed(() => graphSearchResults.value.length > 0)
  const totalGraphResults = computed(() => graphSearchResults.value.length)
  const graphNodes = computed(() => jsonStore.graphNodes)

  // Enhanced search functionality for graph nodes
  const performGraphSearch = (query: string, nodes: GraphNode[]): GraphSearchResult[] => {
    if (!query.trim()) return []

    const results: GraphSearchResult[] = []
    const searchTerm = searchOptions.value.caseSensitive ? query : query.toLowerCase()

    const matchesQuery = (text: string): boolean => {
      const targetText = searchOptions.value.caseSensitive ? text : text.toLowerCase()

      if (searchOptions.value.matchWholeWords) {
        const regex = new RegExp(`\\b${escapeRegExp(searchTerm)}\\b`, 'g')
        return regex.test(targetText)
      }

      return targetText.includes(searchTerm)
    }

    const calculateScore = (node: GraphNode, keyMatch: boolean, valueMatch: boolean): number => {
      let score = 0

      // Base score for matches
      if (keyMatch) score += 10
      if (valueMatch) score += 8
      if (keyMatch && valueMatch) score += 5 // Bonus for both matches

      // Boost score for exact matches
      const keyText = String(node.key).toLowerCase()
      const valueText = String(node.value).toLowerCase()
      const queryLower = searchTerm.toLowerCase()

      if (keyText === queryLower) score += 20
      if (valueText === queryLower) score += 15

      // Boost score for shorter paths (more relevant)
      score += Math.max(0, 10 - node.depth)

      // Boost score for certain node types
      if (node.type === 'object' || node.type === 'array') score += 2

      return score
    }

    for (const node of nodes) {
      const keyText = String(node.key)
      const valueText = String(node.value)

      const keyMatches = searchOptions.value.searchKeys && matchesQuery(keyText)
      const valueMatches = searchOptions.value.searchValues && matchesQuery(valueText)

      if (keyMatches || valueMatches) {
        let matchType: 'key' | 'value' | 'both'
        let matchText: string

        if (keyMatches && valueMatches) {
          matchType = 'both'
          matchText = `${keyText}: ${valueText}`
        } else if (keyMatches) {
          matchType = 'key'
          matchText = keyText
        } else {
          matchType = 'value'
          matchText = valueText
        }

        const score = calculateScore(node, keyMatches, valueMatches)

        results.push({
          nodeId: node.id,
          node,
          matchType,
          matchText,
          score,
        })
      }
    }

    // Sort results by score (highest first)
    return results.sort((a, b) => b.score - a.score)
  }

  // Debounced search implementation
  const debouncedGraphSearch = (query: string) => {
    // Clear existing timeout
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
    }

    // If query is empty, clear immediately
    if (!query.trim()) {
      clearGraphSearch()
      return
    }

    isSearching.value = true

    searchTimeout.value = setTimeout(() => {
      try {
        performGraphSearchInternal(query)
      } finally {
        isSearching.value = false
      }
    }, searchDelay.value)
  }

  // Internal search method
  const performGraphSearchInternal = (query: string) => {
    const results = performGraphSearch(query, graphNodes.value)
    graphSearchResults.value = results
    currentGraphSearchIndex.value = results.length > 0 ? 0 : -1

    // Update highlighting and dimming
    updateGraphHighlighting()

    // Update the main store's search query to keep it in sync
    jsonStore.searchQuery = query
  }

  // Update graph node highlighting and dimming
  const updateGraphHighlighting = () => {
    const highlighted = new Set<string>()
    const dimmed = new Set<string>()

    if (graphSearchResults.value.length > 0) {
      // Highlight matching nodes
      graphSearchResults.value.forEach((result) => {
        highlighted.add(result.nodeId)

        // Optionally highlight connected nodes
        if (searchOptions.value.highlightConnections) {
          const connections = getConnectedNodeIds(result.nodeId)
          connections.forEach((id) => highlighted.add(id))
        }
      })

      // Dim non-matching nodes
      graphNodes.value.forEach((node) => {
        if (!highlighted.has(node.id)) {
          dimmed.add(node.id)
        }
      })
    }

    highlightedGraphNodes.value = highlighted
    dimmedGraphNodes.value = dimmed

    // Update the store's highlighted nodes
    jsonStore.highlightGraphNodes(Array.from(highlighted))
  }

  // Get connected node IDs for a given node
  const getConnectedNodeIds = (nodeId: string): string[] => {
    const connected: string[] = []
    const links = jsonStore.graphLinks

    links.forEach((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id

      if (sourceId === nodeId) {
        connected.push(targetId)
      } else if (targetId === nodeId) {
        connected.push(sourceId)
      }
    })

    return connected
  }

  // Search methods
  const searchGraph = async (query: string) => {
    debouncedGraphSearch(query)
  }

  const clearGraphSearch = () => {
    // Clear timeout if active
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
      searchTimeout.value = null
    }

    isSearching.value = false
    graphSearchResults.value = []
    currentGraphSearchIndex.value = -1
    highlightedGraphNodes.value.clear()
    dimmedGraphNodes.value.clear()

    // Clear store highlights
    jsonStore.clearGraphHighlights()
    jsonStore.searchQuery = ''
  }

  const navigateToNextGraphResult = () => {
    if (graphSearchResults.value.length > 0) {
      currentGraphSearchIndex.value =
        (currentGraphSearchIndex.value + 1) % graphSearchResults.value.length
      centerOnCurrentResult()
    }
  }

  const navigateToPreviousGraphResult = () => {
    if (graphSearchResults.value.length > 0) {
      currentGraphSearchIndex.value =
        currentGraphSearchIndex.value <= 0
          ? graphSearchResults.value.length - 1
          : currentGraphSearchIndex.value - 1
      centerOnCurrentResult()
    }
  }

  const navigateToGraphResult = (index: number) => {
    if (index >= 0 && index < totalGraphResults.value) {
      currentGraphSearchIndex.value = index
      centerOnCurrentResult()
    }
  }

  // Center view on current search result
  const centerOnCurrentResult = () => {
    if (
      currentGraphSearchIndex.value >= 0 &&
      currentGraphSearchIndex.value < graphSearchResults.value.length
    ) {
      const currentResult = graphSearchResults.value[currentGraphSearchIndex.value]

      // Select the node in the store
      jsonStore.selectGraphNode(currentResult.nodeId)

      // Emit event to center view on the node
      const event = new CustomEvent('center-on-graph-node', {
        detail: {
          nodeId: currentResult.nodeId,
          node: currentResult.node,
          smooth: true,
        },
      })
      document.dispatchEvent(event)
    }
  }

  const getCurrentGraphResult = computed((): GraphSearchResult | null => {
    if (!hasGraphSearchResults.value || currentGraphSearchIndex.value < 0) {
      return null
    }
    return graphSearchResults.value[currentGraphSearchIndex.value]
  })

  // Update search options
  const updateGraphSearchOptions = (newOptions: Partial<GraphSearchOptions>) => {
    searchOptions.value = { ...searchOptions.value, ...newOptions }

    // Re-run search if there's an active query
    if (searchQuery.value.trim()) {
      searchGraph(searchQuery.value)
    }
  }

  // Utility function to escape regex special characters
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Update search delay
  const updateSearchDelay = (delay: number) => {
    searchDelay.value = delay
  }

  // Check if a node is highlighted by search
  const isNodeHighlightedBySearch = (nodeId: string): boolean => {
    return highlightedGraphNodes.value.has(nodeId)
  }

  // Check if a node is dimmed by search
  const isNodeDimmedBySearch = (nodeId: string): boolean => {
    return dimmedGraphNodes.value.has(nodeId)
  }

  // Get search result for a specific node
  const getSearchResultForNode = (nodeId: string): GraphSearchResult | null => {
    return graphSearchResults.value.find((result) => result.nodeId === nodeId) || null
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
    }
  })

  // Watch for changes in search options to re-run search
  watch(
    searchOptions,
    () => {
      if (searchQuery.value.trim()) {
        searchGraph(searchQuery.value)
      }
    },
    { deep: true },
  )

  // Watch for changes in graph nodes to re-run search
  watch(
    graphNodes,
    () => {
      if (searchQuery.value.trim()) {
        performGraphSearchInternal(searchQuery.value)
      }
    },
    { deep: true },
  )

  return {
    // State
    searchQuery,
    searchOptions,
    isSearching,
    searchDelay,

    // Graph-specific state
    graphSearchResults,
    currentGraphSearchIndex,
    highlightedGraphNodes,
    dimmedGraphNodes,

    // Computed
    hasGraphSearchResults,
    totalGraphResults,
    getCurrentGraphResult,

    // Methods
    searchGraph,
    clearGraphSearch,
    navigateToNextGraphResult,
    navigateToPreviousGraphResult,
    navigateToGraphResult,
    updateGraphSearchOptions,
    updateSearchDelay,
    performGraphSearch,
    debouncedGraphSearch,
    centerOnCurrentResult,
    isNodeHighlightedBySearch,
    isNodeDimmedBySearch,
    getSearchResultForNode,
  }
}
