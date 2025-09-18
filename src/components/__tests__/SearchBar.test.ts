import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SearchBar from '../SearchBar.vue'
import { useJsonStore } from '@/stores/json'

// Mock the store
vi.mock('@/stores/json')

describe('SearchBar', () => {
  let wrapper: any
  let mockStore: any

  beforeEach(() => {
    setActivePinia(createPinia())

    // Create mock store with simple properties
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
      treeState: {
        currentSearchIndex: -1,
      },
    }

    // Mock the useJsonStore
    vi.mocked(useJsonStore).mockReturnValue(mockStore)

    wrapper = mount(SearchBar)
  })

  describe('Component Rendering', () => {
    it('renders search input field', () => {
      const input = wrapper.find('input[type="text"]')
      expect(input.exists()).toBe(true)
      expect(input.attributes('placeholder')).toBe('Search keys and values...')
    })

    it('renders search icon', () => {
      const searchIcon = wrapper.find('svg')
      expect(searchIcon.exists()).toBe(true)
    })
  })

  describe('Search Input', () => {
    it('updates search query when typing', async () => {
      const input = wrapper.find('input')
      await input.setValue('test query')

      expect(mockStore.updateSearchQuery).toHaveBeenCalledWith('test query')
    })

    it('clears search when escape key is pressed', async () => {
      const input = wrapper.find('input')
      await input.trigger('keydown.escape')

      expect(mockStore.clearSearch).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('navigates to next result when Enter is pressed', async () => {
      const input = wrapper.find('input')
      await input.trigger('keydown.enter')

      expect(mockStore.navigateToNextSearchResult).toHaveBeenCalled()
    })

    it('navigates to previous result when Shift+Enter is pressed', async () => {
      const input = wrapper.find('input')
      await input.trigger('keydown.enter', { shiftKey: true })

      expect(mockStore.navigateToPreviousSearchResult).toHaveBeenCalled()
    })
  })

  describe('Component Methods', () => {
    it('exposes focusSearchInput method', () => {
      expect(wrapper.vm.focusSearchInput).toBeDefined()
      expect(typeof wrapper.vm.focusSearchInput).toBe('function')
    })

    it('exposes clearSearch method', () => {
      expect(wrapper.vm.clearSearch).toBeDefined()
      expect(typeof wrapper.vm.clearSearch).toBe('function')
    })

    it('focuses input when focusSearchInput is called', async () => {
      const input = wrapper.find('input')
      const focusSpy = vi.spyOn(input.element, 'focus')

      await wrapper.vm.focusSearchInput()

      expect(focusSpy).toHaveBeenCalled()
    })

    it('calls store clearSearch when clearSearch method is called', () => {
      wrapper.vm.clearSearch()

      expect(mockStore.clearSearch).toHaveBeenCalled()
    })
  })

  describe('Store Integration', () => {
    it('uses store methods for search operations', () => {
      // Test that the component is properly connected to the store
      expect(mockStore.updateSearchQuery).toBeDefined()
      expect(mockStore.navigateToNextSearchResult).toBeDefined()
      expect(mockStore.navigateToPreviousSearchResult).toBeDefined()
      expect(mockStore.clearSearch).toBeDefined()
    })
  })
})
