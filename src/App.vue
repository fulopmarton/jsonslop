<script setup lang="ts">
// JSON Visualization App - Main Application Component
import { ref, onErrorCaptured, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import JSONInputPanel from '@/components/JSONInputPanel.vue'
import VisualizationPanel from '@/components/VisualizationPanel.vue'
import ViewToggle from '@/components/ViewToggle.vue'
import SearchBar from '@/components/SearchBar.vue'
import { useJsonStore } from '@/stores/json'
import { Analytics } from '@vercel/analytics/vue';


// Store integration for global error handling
const jsonStore = useJsonStore()
const { hasValidJson, rawJsonInput } = storeToRefs(jsonStore)

// State for managing the resizable split pane
const isResizing = ref(false)
const leftPanelWidth = useLocalStorage('jsonslop:leftPanelWidth', 50) // Percentage width of left panel

// Global error handling state
const globalError = ref<string | null>(null)
const errorDetails = ref<string | null>(null)
const showErrorDetails = ref(false)

// Computed properties for UI state
const hasContent = computed(() => rawJsonInput.value.trim().length > 0)
const showEmptyState = computed(() => false) // Always show the split panes layout so users can access the editor

// Vue 3 error handling with onErrorCaptured
onErrorCaptured((error: Error, instance, errorInfo) => {
  console.error('Application Error:', error)
  console.error('Component Instance:', instance)
  console.error('Error Info:', errorInfo)

  // Set user-friendly error message
  globalError.value = 'An unexpected error occurred while processing your JSON'
  errorDetails.value = `${error.message}\n\nComponent: ${instance?.$?.type?.name || 'Unknown'}\nError Info: ${errorInfo}`



  // Return false to prevent the error from propagating further
  return false
})

// Handle mouse events for resizing
const startResize = () => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const containerWidth = window.innerWidth
  const newWidth = (e.clientX / containerWidth) * 100

  // Constrain the width between 20% and 80%
  leftPanelWidth.value = Math.max(20, Math.min(80, newWidth))
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// Error handling actions
const dismissError = () => {
  globalError.value = null
  errorDetails.value = null
  showErrorDetails.value = false
}

const toggleErrorDetails = () => {
  showErrorDetails.value = !showErrorDetails.value
}

const retryOperation = () => {
  dismissError()
  // Retry the last operation by re-validating current input
  if (rawJsonInput.value.trim()) {
    jsonStore.validateAndParseJson(rawJsonInput.value)
  }
}
</script>

<template>
  <Analytics></Analytics>
  <div id="app" class="h-screen bg-gray-50 flex flex-col">


    <!-- Global Error Banner -->
    <div v-if="globalError" data-testid="global-error-banner"
      class="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 sm:px-6 py-4">
      <div class="flex items-start justify-between">
        <div class="flex items-start gap-3 min-w-0 flex-1">
          <svg class="w-5 h-5 status-error mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd" />
          </svg>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Application Error</h3>
            <p class="text-sm text-red-700 dark:text-red-300 mt-1 break-words">{{ globalError }}</p>

            <!-- Error Details (Collapsible) -->
            <div v-if="errorDetails" class="mt-2">
              <button @click="toggleErrorDetails" data-testid="toggle-error-details"
                class="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded">
                {{ showErrorDetails ? 'Hide' : 'Show' }} technical details
              </button>
              <div v-if="showErrorDetails" data-testid="error-details"
                class="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded-md text-xs text-red-800 dark:text-red-200 font-mono whitespace-pre-wrap overflow-auto max-h-32">
                {{ errorDetails
                }}</div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 ml-4 flex-shrink-0">
          <button @click="retryOperation" data-testid="retry-operation"
            class="btn-secondary text-xs px-2 py-1 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700">
            Retry
          </button>
          <button @click="dismissError" data-testid="dismiss-error"
            class="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300 p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Empty State -->
      <div v-if="showEmptyState" data-testid="empty-state" class="flex-1 flex items-center justify-center"
        style="background-color: var(--bg-primary);">
        <div class="text-center max-w-md mx-auto px-4 sm:px-6">
          <div class="relative mb-8">
            <svg class="mx-auto h-16 w-16 sm:h-20 sm:w-20" style="color: var(--text-tertiary);" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style="background-color: var(--bg-accent);">
              <svg class="w-4 h-4 status-info" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z"
                  clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 class="text-lg sm:text-xl font-semibold mb-3" style="color: var(--text-primary);">Ready to Slop Some JSON?
          </h2>
          <p class="text-sm sm:text-base mb-6" style="color: var(--text-secondary);">Drop your messy JSON in the left
            panel and watch the magic happen. No judgment here - we've seen worse.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm" style="color: var(--text-secondary);">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 status-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              <span>Real-time validation</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 status-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              <span>Interactive tree view</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 status-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              <span>Search & navigation</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 status-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              <span>Copy values & paths</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Split Panes Layout -->
      <template v-else>
        <!-- Left Panel - JSON Input -->
        <div class="flex flex-col" :style="{ width: `${leftPanelWidth}%` }">
          <JSONInputPanel />
        </div>

        <!-- Resizer -->
        <div class="w-1 cursor-col-resize transition-all duration-200 flex-shrink-0 hover-lift"
          style="background-color: var(--border-primary);" @mousedown="startResize" :class="{
            'w-2': isResizing,
          }" :style="{
            backgroundColor: isResizing ? 'var(--interactive-primary)' : 'var(--border-primary)',
            opacity: isResizing ? 1 : 0.6
          }"></div>

        <!-- Right Panel - Visualization -->
        <div class="flex flex-col flex-1"
          :style="{ width: `${100 - leftPanelWidth}%`, backgroundColor: 'var(--bg-primary)' }">
          <div class="panel-header p-3 sm:p-4 border-b"
            style="border-color: var(--border-primary); background-color: var(--bg-secondary);">
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1">
                <SearchBar v-if="hasValidJson" ref="searchBarRef" />
              </div>
              <ViewToggle class="flex-shrink-0" />
            </div>
          </div>
          <div class="flex-1 overflow-hidden">
            <VisualizationPanel />
          </div>
        </div>
      </template>
    </main>

    <!-- Mobile Layout Notice -->
    <div class="sm:hidden fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background-color: var(--bg-primary);">
      <div class="text-center max-w-sm mx-auto p-6 rounded-lg shadow-lg"
        style="background-color: var(--bg-secondary); border: 1px solid var(--border-primary);">
        <div class="relative mb-6">
          <svg class="mx-auto h-16 w-16" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style="background-color: var(--bg-accent);">
            <svg class="w-4 h-4 status-warning" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd" />
            </svg>
          </div>
        </div>
        <h2 class="text-lg font-semibold mb-3" style="color: var(--text-primary);">Whoa There, Tiny Screen!</h2>
        <p class="text-sm mb-4" style="color: var(--text-secondary);">JsonSlop works best when it has room to breathe.
          Grab
          a tablet or desktop for the full sloppy experience.</p>
        <div class="text-xs p-3 rounded-md" style="background-color: var(--bg-accent); color: var(--text-secondary);">
          <p class="font-medium mb-1">Recommended: 640px+ width</p>
          <p>Current features may be limited on smaller screens</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Prevent text selection during resize */
.cursor-col-resize {
  user-select: none;
}

/* Smooth transitions for panel resizing */
.transition-colors {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom scrollbar styling for better UX */
:deep(.overflow-auto::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(.overflow-auto::-webkit-scrollbar-track) {
  background: #f1f5f9;
}

:deep(.overflow-auto::-webkit-scrollbar-thumb) {
  background: #cbd5e1;
  border-radius: 3px;
}

:deep(.overflow-auto::-webkit-scrollbar-thumb:hover) {
  background: #94a3b8;
}
</style>
