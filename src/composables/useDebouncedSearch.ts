import { ref, computed, watch, onUnmounted } from 'vue'
import { useJsonStore } from '@/stores/json'

export interface DebouncedSearchOptions {
  delay?: number
  minLength?: number
  immediate?: boolean
}

export function useDebouncedSearch(options: DebouncedSearchOptions = {}) {
  const { delay = 300, minLength = 1, immediate = false } = options

  const jsonStore = useJsonStore()

  // Local state
  const searchInput = ref('')
  const isSearching = ref(false)
  const searchTimeout = ref<NodeJS.Timeout | null>(null)

  // Computed properties from store
  const searchResults = computed(() => jsonStore.searchResults)
  const currentSearchIndex = computed(() => jsonStore.currentSearchIndex)
  const hasSearchResults = computed(() => jsonStore.hasSearchResults)
  const totalResults = computed(() => searchResults.value.length)

  // Debounced search function
  const performDebouncedSearch = (query: string) => {
    // Clear existing timeout
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
    }

    // Don't search if query is too short
    if (query.length < minLength) {
      jsonStore.clearSearch()
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
    }, delay)
  }

  // Update search input and trigger debounced search
  const updateSearchInput = (query: string) => {
    searchInput.value = query

    if (immediate && query.length >= minLength) {
      // Immediate search for first character
      jsonStore.updateSearchQuery(query)
      isSearching.value = false
    } else {
      performDebouncedSearch(query)
    }
  }

  // Clear search
  const clearSearch = () => {
    searchInput.value = ''
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
      searchTimeout.value = null
    }
    jsonStore.clearSearch()
    isSearching.value = false
  }

  // Navigation methods
  const navigateToNext = () => {
    jsonStore.navigateToNextSearchResult()
  }

  const navigateToPrevious = () => {
    jsonStore.navigateToPreviousSearchResult()
  }

  const navigateToResult = (index: number) => {
    if (index >= 0 && index < totalResults.value) {
      jsonStore.treeState.currentSearchIndex = index
      const resultPath = searchResults.value[index]
      jsonStore.selectNode(resultPath)
    }
  }

  // Watch for external changes to search query
  watch(
    () => jsonStore.searchQuery,
    (newQuery) => {
      if (newQuery !== searchInput.value) {
        searchInput.value = newQuery
      }
    },
  )

  // Cleanup on unmount
  onUnmounted(() => {
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
    }
  })

  return {
    // State
    searchInput,
    isSearching,

    // Computed
    searchResults,
    currentSearchIndex,
    hasSearchResults,
    totalResults,

    // Methods
    updateSearchInput,
    clearSearch,
    navigateToNext,
    navigateToPrevious,
    navigateToResult,
    performDebouncedSearch,
  }
}
