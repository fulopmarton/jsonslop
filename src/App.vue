<script setup lang="ts">
// JSON Visualization App - Main Application Component
import { ref } from 'vue'
import JSONInputPanel from '@/components/JSONInputPanel.vue'
import VisualizationPanel from '@/components/VisualizationPanel.vue'

// State for managing the resizable split pane
const isResizing = ref(false)
const leftPanelWidth = ref(50) // Percentage width of left panel

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
</script>

<template>
  <div id="app" class="h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <h1 class="text-2xl font-bold text-gray-900">JSON Visualization App</h1>
      <p class="text-sm text-gray-600 mt-1">Visualize and explore JSON data structures</p>
    </header>

    <!-- Main Content Area with Split Panes -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Left Panel - JSON Input -->
      <div class="flex flex-col" :style="{ width: `${leftPanelWidth}%` }">
        <JSONInputPanel />
      </div>

      <!-- Resizer -->
      <div class="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors duration-200 flex-shrink-0"
        @mousedown="startResize" :class="{ 'bg-blue-400': isResizing }"></div>

      <!-- Right Panel - Visualization -->
      <div class="bg-white flex flex-col flex-1" :style="{ width: `${100 - leftPanelWidth}%` }">
        <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 class="text-lg font-semibold text-gray-800">JSON Visualization</h2>
          <p class="text-sm text-gray-600">Interactive tree view of your JSON data</p>
        </div>
        <div class="flex-1 overflow-hidden">
          <VisualizationPanel />
        </div>
      </div>
    </main>

    <!-- Mobile Layout Notice -->
    <div class="md:hidden fixed inset-0 bg-white z-50 flex items-center justify-center p-4">
      <div class="text-center">
        <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Desktop Required</h2>
        <p class="text-gray-600 mb-4">This JSON visualization app is optimized for desktop screens. Please use a device
          with a larger screen for the best experience.</p>
        <p class="text-sm text-gray-500">Minimum width: 768px</p>
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
