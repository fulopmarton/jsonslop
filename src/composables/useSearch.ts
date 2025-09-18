import { ref, computed, watch, onUnmounted } from 'vue'
import { useJsonStore } from '@/stores/json'
import type { JSONNode } from '@/types'

export interface SearchOptions {
  caseSensitive?: boolean
  matchWholeWords?: boolean
  searchKeys?: boolean
  searchValues?: boolean
}

export interface SearchResult {
  nodePath: string
  node: JSONNode
  matchType: 'key' | 'value' | 'both'
  matchText: string
}

export function useSearch(options: SearchOptions = {}) {
  const jsonStore = useJsonStore()

  // Default options
  const searchOptions = ref<Required<SearchOptions>>({
    caseSensitive: false,
    matchWholeWords: false,
    searchKeys: true,
    searchValues: true,
    ...options,
  })

  // Reactive search state
  const isSearching = ref(false)
  const searchTimeout = ref<NodeJS.Timeout | null>(null)
  const searchDelay = ref(300) // Debounce delay in ms

  const searchQuery = computed({
    get: () => jsonStore.searchQuery,
    set: (value: string) => debouncedSearch(value),
  })

  // Computed properties from store
  const searchResults = computed(() => jsonStore.searchResults)
  const currentSearchIndex = computed(() => jsonStore.currentSearchIndex)
  const hasSearchResults = computed(() => jsonStore.hasSearchResults)
  const totalResults = computed(() => searchResults.value.length)

  // Enhanced search functionality
  const performAdvancedSearch = (query: string, nodes: JSONNode[]): SearchResult[] => {
    if (!query.trim()) return []

    const results: SearchResult[] = []
    const searchTerm = searchOptions.value.caseSensitive ? query : query.toLowerCase()

    const matchesQuery = (text: string): boolean => {
      const targetText = searchOptions.value.caseSensitive ? text : text.toLowerCase()

      if (searchOptions.value.matchWholeWords) {
        const regex = new RegExp(`\\b${escapeRegExp(searchTerm)}\\b`, 'g')
        return regex.test(targetText)
      }

      return targetText.includes(searchTerm)
    }

    const traverseNodes = (nodeList: JSONNode[]) => {
      for (const node of nodeList) {
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

          results.push({
            nodePath: node.path.join('.'),
            node,
            matchType,
            matchText,
          })
        }

        if (node.children) {
          traverseNodes(node.children)
        }
      }
    }

    traverseNodes(nodes)
    return results
  }

  // Debounced search implementation
  const debouncedSearch = (query: string) => {
    // Clear existing timeout
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
    }

    // If query is empty, clear immediately
    if (!query.trim()) {
      jsonStore.updateSearchQuery('')
      isSearching.value = false
      return
    }

    isSearching.value = true

    searchTimeout.value = setTimeout(() => {
      try {
        jsonStore.updateSearchQuery(query)
      } finally {
        isSearching.value = false
      }
    }, searchDelay.value)
  }

  // Search methods
  const search = async (query: string) => {
    debouncedSearch(query)
  }

  const clearSearch = () => {
    // Clear timeout if active
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
      searchTimeout.value = null
    }
    isSearching.value = false
    jsonStore.clearSearch()
  }

  const navigateToNext = () => {
    jsonStore.navigateToNextSearchResult()
  }

  const navigateToPrevious = () => {
    jsonStore.navigateToPreviousSearchResult()
  }

  const navigateToResult = (index: number) => {
    if (index >= 0 && index < totalResults.value) {
      // Update the current search index in the store
      jsonStore.treeState.currentSearchIndex = index

      // Select the node
      const resultPath = searchResults.value[index]
      jsonStore.selectNode(resultPath)
    }
  }

  const getCurrentResult = computed((): SearchResult | null => {
    if (!hasSearchResults.value || currentSearchIndex.value < 0) {
      return null
    }

    const currentPath = searchResults.value[currentSearchIndex.value]
    const node = jsonStore.getNodeByPath(currentPath)

    if (!node) return null

    // Determine match type based on search query
    const query = searchQuery.value.toLowerCase()
    const keyMatches = String(node.key).toLowerCase().includes(query)
    const valueMatches = String(node.value).toLowerCase().includes(query)

    let matchType: 'key' | 'value' | 'both'
    let matchText: string

    if (keyMatches && valueMatches) {
      matchType = 'both'
      matchText = `${node.key}: ${node.value}`
    } else if (keyMatches) {
      matchType = 'key'
      matchText = String(node.key)
    } else {
      matchType = 'value'
      matchText = String(node.value)
    }

    return {
      nodePath: currentPath,
      node,
      matchType,
      matchText,
    }
  })

  // Update search options
  const updateSearchOptions = (newOptions: Partial<SearchOptions>) => {
    searchOptions.value = { ...searchOptions.value, ...newOptions }

    // Re-run search if there's an active query
    if (searchQuery.value.trim()) {
      search(searchQuery.value)
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
        search(searchQuery.value)
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

    // Computed
    searchResults,
    currentSearchIndex,
    hasSearchResults,
    totalResults,
    getCurrentResult,

    // Methods
    search,
    clearSearch,
    navigateToNext,
    navigateToPrevious,
    navigateToResult,
    updateSearchOptions,
    updateSearchDelay,
    performAdvancedSearch,
    debouncedSearch,
  }
}
