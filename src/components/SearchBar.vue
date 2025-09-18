<template>
    <div class="search-bar flex items-center space-x-2 p-3 border-b"
        style="border-color: var(--border-primary); background-color: var(--bg-primary);">
        <!-- Search input -->
        <div class="flex-1 relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-4 w-4" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input ref="searchInput" v-model="searchQuery" type="text"
                :placeholder="isSearching ? 'Searching...' : 'Search keys and values...'" :class="[
                    'block w-full pl-10 pr-10 py-2 border rounded-md leading-5 text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50',
                    { 'animate-pulse': isSearching }
                ]" :style="{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                }" @keydown.enter="handleEnterKey" @keydown.escape="clearSearch" @input="handleSearchInput" />
            <!-- Clear button -->
            <button v-if="searchQuery" @click="clearSearch"
                class="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors duration-200 hover-lift"
                style="color: var(--text-tertiary);" type="button" aria-label="Clear search">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Search results info and navigation -->
        <div v-if="hasSearchResults" class="flex items-center space-x-2 text-sm" style="color: var(--text-secondary);">
            <span class="whitespace-nowrap font-medium">
                {{ currentSearchIndex + 1 }} of {{ searchResults.length }}
            </span>

            <!-- Navigation buttons -->
            <div class="flex items-center space-x-1">
                <button @click="navigateToPrevious" :disabled="!hasSearchResults"
                    class="p-2 rounded-md transition-all duration-200 hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    :style="{
                        color: hasSearchResults ? 'var(--interactive-primary)' : 'var(--text-tertiary)',
                        backgroundColor: 'transparent'
                    }" aria-label="Previous result" title="Previous result (Shift+Enter)">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                </button>
                <button @click="navigateToNext" :disabled="!hasSearchResults"
                    class="p-2 rounded-md transition-all duration-200 hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    :style="{
                        color: hasSearchResults ? 'var(--interactive-primary)' : 'var(--text-tertiary)',
                        backgroundColor: 'transparent'
                    }" aria-label="Next result" title="Next result (Enter)">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- No results indicator -->
        <div v-else-if="searchQuery && !hasSearchResults" class="text-sm font-medium"
            style="color: var(--text-secondary);">
            No results
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useJsonStore } from '@/stores/json'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import { useGraphSearch } from '@/composables/useGraphSearch'

// Store
const jsonStore = useJsonStore()

// Search composables
const debouncedSearch = useDebouncedSearch({
    delay: 300,
    minLength: 1,
    immediate: false
})

const graphSearch = useGraphSearch({
    caseSensitive: false,
    matchWholeWords: false,
    searchKeys: true,
    searchValues: true,
    highlightConnections: true,
})

// Local refs
const searchInput = ref<HTMLInputElement>()

// Current view from store
const currentView = computed(() => jsonStore.currentView)

// Use appropriate search based on current view
const searchQuery = computed({
    get: () => {
        return currentView.value === 'graph'
            ? graphSearch.searchQuery.value
            : debouncedSearch.searchInput.value
    },
    set: (value: string) => {
        if (currentView.value === 'graph') {
            graphSearch.searchQuery.value = value
        } else {
            debouncedSearch.updateSearchInput(value)
        }
    }
})

const searchResults = computed(() => {
    return currentView.value === 'graph'
        ? graphSearch.graphSearchResults.value.map(r => r.nodeId)
        : debouncedSearch.searchResults.value
})

const currentSearchIndex = computed(() => {
    return currentView.value === 'graph'
        ? graphSearch.currentGraphSearchIndex.value
        : debouncedSearch.currentSearchIndex.value
})

const hasSearchResults = computed(() => {
    return currentView.value === 'graph'
        ? graphSearch.hasGraphSearchResults.value
        : debouncedSearch.hasSearchResults.value
})

const isSearching = computed(() => {
    return currentView.value === 'graph'
        ? graphSearch.isSearching.value
        : debouncedSearch.isSearching.value
})

// Methods
const handleSearchInput = () => {
    // The v-model already updates the store through the computed property
    // This method can be used for additional logic if needed
}

const handleEnterKey = (event: KeyboardEvent) => {
    if (event.shiftKey) {
        navigateToPrevious()
    } else {
        navigateToNext()
    }
}

const navigateToNext = () => {
    if (currentView.value === 'graph') {
        graphSearch.navigateToNextGraphResult()
    } else {
        debouncedSearch.navigateToNext()
        scrollToCurrentResult()
    }
}

const navigateToPrevious = () => {
    if (currentView.value === 'graph') {
        graphSearch.navigateToPreviousGraphResult()
    } else {
        debouncedSearch.navigateToPrevious()
        scrollToCurrentResult()
    }
}

const clearSearch = () => {
    if (currentView.value === 'graph') {
        graphSearch.clearGraphSearch()
    } else {
        debouncedSearch.clearSearch()
    }
    focusSearchInput()
}

const focusSearchInput = async () => {
    await nextTick()
    searchInput.value?.focus()
}

const scrollToCurrentResult = async () => {
    await nextTick()

    if (hasSearchResults.value && currentSearchIndex.value >= 0) {
        const currentResultPath = searchResults.value[currentSearchIndex.value]

        // Select the current search result node
        jsonStore.selectNode(currentResultPath)

        // Emit event to parent to scroll to the selected node
        // This will be handled by the VisualizationPanel
        const event = new CustomEvent('scroll-to-node', {
            detail: { nodePath: currentResultPath }
        })
        document.dispatchEvent(event)
    }
}

// Watch for search results changes to auto-scroll to first result
watch(searchResults, (newResults) => {
    if (newResults.length > 0 && currentSearchIndex.value === 0) {
        scrollToCurrentResult()
    }
})

// Expose methods for parent components
defineExpose({
    focusSearchInput,
    clearSearch
})
</script>

<style scoped>
.search-bar {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Focus styles for accessibility */
input:focus {
    box-shadow: 0 0 0 1px #3b82f6;
}

button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/* Smooth transitions */
.transition-colors {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
}
</style>
