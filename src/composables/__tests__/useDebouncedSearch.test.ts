import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useDebouncedSearch } from '../useDebouncedSearch'

// Mock the JSON store
vi.mock('@/stores/json', () => ({
  useJsonStore: () => ({
    searchResults: [],
    currentSearchIndex: -1,
    hasSearchResults: false,
    searchQuery: '',
    updateSearchQuery: vi.fn(),
    clearSearch: vi.fn(),
    navigateToNextSearchResult: vi.fn(),
    navigateToPreviousSearchResult: vi.fn(),
    treeState: {
      currentSearchIndex: -1,
    },
    selectNode: vi.fn(),
  }),
}))

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with default options', () => {
    const { searchInput, isSearching, hasSearchResults } = useDebouncedSearch()

    expect(searchInput.value).toBe('')
    expect(isSearching.value).toBe(false)
    expect(hasSearchResults.value).toBe(false)
  })

  it('should initialize with custom options', () => {
    const options = {
      delay: 500,
      minLength: 2,
      immediate: true,
    }

    const search = useDebouncedSearch(options)
    expect(search).toBeDefined()
  })

  it('should debounce search input', async () => {
    const { updateSearchInput, isSearching } = useDebouncedSearch({ delay: 300 })

    updateSearchInput('test')
    expect(isSearching.value).toBe(true)

    // Should not trigger search immediately
    expect(isSearching.value).toBe(true)

    // Fast forward time
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(isSearching.value).toBe(false)
  })

  it('should not search if query is too short', async () => {
    const { updateSearchInput, isSearching } = useDebouncedSearch({ minLength: 3 })

    updateSearchInput('te')
    expect(isSearching.value).toBe(false)

    updateSearchInput('test')
    expect(isSearching.value).toBe(true)

    vi.advanceTimersByTime(300)
    await nextTick()
    expect(isSearching.value).toBe(false)
  })

  it('should clear previous timeout when new search is triggered', async () => {
    const { updateSearchInput, isSearching } = useDebouncedSearch({ delay: 300 })

    updateSearchInput('test1')
    expect(isSearching.value).toBe(true)

    // Trigger another search before timeout
    vi.advanceTimersByTime(150)
    updateSearchInput('test2')
    expect(isSearching.value).toBe(true)

    // First timeout should be cleared, only second should execute
    vi.advanceTimersByTime(150) // Total 300ms from first call
    await nextTick()
    expect(isSearching.value).toBe(true) // Still searching

    vi.advanceTimersByTime(150) // 300ms from second call
    await nextTick()
    expect(isSearching.value).toBe(false) // Now finished
  })

  it('should handle immediate search option', async () => {
    const { updateSearchInput, isSearching } = useDebouncedSearch({
      immediate: true,
      minLength: 1,
    })

    updateSearchInput('t')
    // Should search immediately for first character
    expect(isSearching.value).toBe(false)

    updateSearchInput('te')
    // With immediate option, all searches are immediate
    expect(isSearching.value).toBe(false)

    vi.advanceTimersByTime(300)
    await nextTick()
    expect(isSearching.value).toBe(false)
  })

  it('should clear search properly', async () => {
    const { updateSearchInput, clearSearch, searchInput, isSearching } = useDebouncedSearch()

    updateSearchInput('test')
    expect(searchInput.value).toBe('test')
    expect(isSearching.value).toBe(true)

    clearSearch()
    expect(searchInput.value).toBe('')
    expect(isSearching.value).toBe(false)
  })

  it('should handle navigation methods', () => {
    const { navigateToNext, navigateToPrevious, navigateToResult } = useDebouncedSearch()

    // These should not throw errors
    expect(() => navigateToNext()).not.toThrow()
    expect(() => navigateToPrevious()).not.toThrow()
    expect(() => navigateToResult(0)).not.toThrow()
  })

  it('should handle empty search query', async () => {
    const { updateSearchInput, isSearching } = useDebouncedSearch()

    updateSearchInput('')
    expect(isSearching.value).toBe(false)

    updateSearchInput('   ') // Whitespace only - will still trigger debounce initially
    expect(isSearching.value).toBe(true)

    // But will clear after timeout
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(isSearching.value).toBe(false)
  })

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { updateSearchInput, clearSearch } = useDebouncedSearch()
    updateSearchInput('test')

    // Manually trigger cleanup (simulating unmount)
    clearSearch()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })

  it('should handle rapid successive searches', async () => {
    const { updateSearchInput, isSearching } = useDebouncedSearch({ delay: 100 })

    // Rapid fire searches
    updateSearchInput('a')
    updateSearchInput('ab')
    updateSearchInput('abc')
    updateSearchInput('abcd')

    expect(isSearching.value).toBe(true)

    // Only the last search should execute
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(isSearching.value).toBe(false)
  })

  it('should maintain search state consistency', async () => {
    const { updateSearchInput, searchInput, clearSearch } = useDebouncedSearch()

    updateSearchInput('test query')
    expect(searchInput.value).toBe('test query')

    clearSearch()
    expect(searchInput.value).toBe('')

    updateSearchInput('another query')
    expect(searchInput.value).toBe('another query')
  })

  it('should handle different delay values', async () => {
    const shortDelay = useDebouncedSearch({ delay: 50 })
    const longDelay = useDebouncedSearch({ delay: 500 })

    shortDelay.updateSearchInput('test')
    longDelay.updateSearchInput('test')

    expect(shortDelay.isSearching.value).toBe(true)
    expect(longDelay.isSearching.value).toBe(true)

    vi.advanceTimersByTime(50)
    await nextTick()

    expect(shortDelay.isSearching.value).toBe(false)
    expect(longDelay.isSearching.value).toBe(true)

    vi.advanceTimersByTime(450)
    await nextTick()

    expect(longDelay.isSearching.value).toBe(false)
  })
})
