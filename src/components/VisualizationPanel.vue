<template>
    <div class="visualization-panel h-full flex flex-col">
        <!-- Header with controls -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center space-x-4">
                <h3 class="text-sm font-medium text-gray-700">
                    {{ totalNodes }} nodes
                    <span v-if="expandedNodeCount > 0" class="text-gray-500">
                        ({{ expandedNodeCount }} expanded)
                    </span>
                </h3>
            </div>

            <div class="flex items-center space-x-2">
                <!-- Expand/Collapse All buttons -->
                <button @click="expandAll"
                    class="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors duration-200"
                    :disabled="!hasValidJson">
                    Expand All
                </button>
                <button @click="collapseAll"
                    class="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors duration-200"
                    :disabled="!hasValidJson">
                    Collapse All
                </button>
            </div>
        </div>

        <!-- Tree content area -->
        <div class="flex-1 overflow-auto">
            <!-- Loading state -->
            <div v-if="isProcessing" class="flex items-center justify-center h-full">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-sm text-gray-600">{{ processingMessage || 'Processing JSON...' }}</p>
                </div>
            </div>

            <!-- Empty state -->
            <div v-else-if="!hasValidJson" class="flex items-center justify-center h-full">
                <div class="text-center text-gray-500">
                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p class="text-sm font-medium mb-2">No JSON to visualize</p>
                    <p class="text-xs text-gray-400">Enter valid JSON in the input panel to see the tree structure</p>
                </div>
            </div>

            <!-- Error state -->
            <div v-else-if="hasErrors" class="flex items-center justify-center h-full">
                <div class="text-center text-red-500">
                    <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p class="text-sm font-medium mb-2">JSON contains errors</p>
                    <p class="text-xs text-gray-400">Fix the JSON syntax errors to view the visualization</p>
                </div>
            </div>

            <!-- Tree visualization -->
            <div v-else-if="jsonTree.length > 0" class="tree-container py-2">
                <TreeNode v-for="node in jsonTree" :key="getNodeKey(node)" :node="node" :depth="0"
                    :is-expanded="isNodeExpanded(node.path.join('.'))"
                    :is-selected="isNodeSelected(node.path.join('.'))"
                    :is-highlighted="isNodeHighlighted(node.path.join('.'))" @toggle-expansion="handleToggleExpansion"
                    @node-select="handleNodeSelect" @copy-success="handleCopySuccess" />
            </div>
        </div>

        <!-- Copy success notification -->
        <div v-if="showCopyNotification"
            class="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 z-50">
            <div class="flex items-center space-x-2">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm">{{ copyNotificationMessage }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useJsonStore } from '@/stores/json'
import TreeNode from './TreeNode.vue'
import type { JSONNode } from '@/types'

// Store
const jsonStore = useJsonStore()

// Local state
const showCopyNotification = ref(false)
const copyNotificationMessage = ref('')

// Computed properties from store
const jsonTree = computed(() => jsonStore.jsonTree)
const hasValidJson = computed(() => jsonStore.hasValidJson)
const hasErrors = computed(() => jsonStore.hasErrors)
const totalNodes = computed(() => jsonStore.totalNodes)
const expandedNodeCount = computed(() => jsonStore.expandedNodeCount)
const isProcessing = computed(() => jsonStore.isProcessing)
const processingMessage = computed(() => jsonStore.processingMessage)

// Methods
const isNodeExpanded = (nodePath: string): boolean => {
    return jsonStore.isNodeExpanded(nodePath)
}

const isNodeSelected = (nodePath: string): boolean => {
    return jsonStore.isNodeSelected(nodePath)
}

const isNodeHighlighted = (nodePath: string): boolean => {
    return jsonStore.isNodeInSearchResults(nodePath)
}

const getNodeKey = (node: JSONNode): string => {
    return node.path.join('.')
}

const handleToggleExpansion = (nodePath: string) => {
    jsonStore.toggleNodeExpansion(nodePath)
}

const handleNodeSelect = (nodePath: string) => {
    jsonStore.selectNode(nodePath)
}

const handleCopySuccess = (message: string) => {
    copyNotificationMessage.value = message
    showCopyNotification.value = true

    // Hide notification after 3 seconds
    setTimeout(() => {
        showCopyNotification.value = false
    }, 3000)
}

const expandAll = () => {
    jsonStore.expandAllNodes()
}

const collapseAll = () => {
    jsonStore.collapseAllNodes()
}

// Initialize store on mount
onMounted(() => {
    jsonStore.initializeStore()
})
</script>

<style scoped>
.visualization-panel {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tree-container {
    min-height: 100%;
}

/* Custom scrollbar for tree container */
.tree-container::-webkit-scrollbar {
    width: 8px;
}

.tree-container::-webkit-scrollbar-track {
    background: #f8fafc;
}

.tree-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

.tree-container::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

/* Smooth transitions */
.transition-colors {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus styles for accessibility */
button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

/* Animation for copy notification */
@keyframes slideInUp {
    from {
        transform: translateY(100%);
        opacity: 0;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.fixed.bottom-4.right-4 {
    animation: slideInUp 0.3s ease-out;
}
</style>
