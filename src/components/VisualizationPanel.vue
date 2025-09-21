<template>
  <div class="visualization-panel h-full flex flex-col">
    <!-- Header with controls -->
    <div class="flex items-center justify-between p-3 sm:p-4 border-b"
      style="border-color: var(--border-primary); background-color: var(--bg-secondary);">
      <div class="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
        <h3 class="text-xs sm:text-sm font-medium truncate" style="color: var(--text-primary);">
          {{ totalNodes }} nodes
          <span v-if="expandedNodeCount > 0 && currentView === 'tree'" class="hidden sm:inline"
            style="color: var(--text-secondary);">
            ({{ expandedNodeCount }} expanded)
          </span>
        </h3>
      </div>

      <div class="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
        <!-- Expand/Collapse All buttons (only show for tree view) -->
        <div v-if="currentView === 'tree'" class="flex items-center space-x-1 sm:space-x-2">
          <button @click="expandAll" class="btn-secondary text-xs px-2 py-1 sm:px-3 sm:py-1 hover-lift"
            :disabled="!hasValidJson" :class="{ 'opacity-50 cursor-not-allowed': !hasValidJson }"
            style="color: var(--interactive-primary);">
            <span class="hidden sm:inline">Expand All</span>
            <span class="sm:hidden">Expand</span>
          </button>
          <button @click="collapseAll" class="btn-secondary text-xs px-2 py-1 sm:px-3 sm:py-1 hover-lift"
            :disabled="!hasValidJson" :class="{ 'opacity-50 cursor-not-allowed': !hasValidJson }">
            <span class="hidden sm:inline">Collapse All</span>
            <span class="sm:hidden">Collapse</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tree content area -->
    <div class="flex-1 overflow-auto">
      <!-- Enhanced Empty state -->
      <div v-if="!hasValidJson && !hasErrors" data-testid="visualization-empty-state"
        class="flex items-center justify-center h-full p-4">
        <div class="text-center max-w-md mx-auto px-4 sm:px-6">
          <div class="relative mb-6">
            <svg class="mx-auto h-16 w-16" style="color: var(--text-tertiary);" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div class="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style="background-color: var(--bg-accent);">
              <svg class="w-3 h-3 status-info" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z"
                  clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <h3 class="text-base sm:text-lg font-medium mb-3" style="color: var(--text-primary);">Ready to
            visualize</h3>
          <p class="text-sm mb-4" style="color: var(--text-secondary);">Enter valid JSON in the left panel to
            see an interactive tree visualization here.</p>
          <div class="text-xs space-y-1" style="color: var(--text-secondary);">
            <div class="flex items-center justify-center gap-2">
              <svg class="w-3 h-3 status-success" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              <span>Expand and collapse nodes</span>
            </div>
            <div class="flex items-center justify-center gap-2">
              <svg class="w-3 h-3 status-success" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              <span>Search through your data</span>
            </div>
            <div class="flex items-center justify-center gap-2">
              <svg class="w-3 h-3 status-success" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              <span>Copy values and paths</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Error state with actionable feedback -->
      <div v-else-if="hasErrors" data-testid="visualization-error-state"
        class="flex items-center justify-center h-full p-4">
        <div class="text-center max-w-md mx-auto px-4 sm:px-6">
          <div class="relative mb-6">
            <svg class="mx-auto h-16 w-16 status-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div class="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style="background-color: var(--bg-primary); border: 2px solid var(--status-error);">
              <span class="text-xs font-bold status-error">{{ validationErrors.length }}</span>
            </div>
          </div>
          <h3 class="text-base sm:text-lg font-medium mb-2 status-error">JSON Validation Failed</h3>
          <p class="text-sm mb-4 status-error">
            Found {{ validationErrors.length }} error{{ validationErrors.length !== 1 ? 's' : '' }} in your
            JSON.
            Fix {{ validationErrors.length === 1 ? 'it' : 'them' }} to see the visualization.
          </p>

          <!-- Error summary -->
          <div class="rounded-lg p-4 mb-4 text-left"
            style="background-color: var(--bg-secondary); border: 1px solid var(--border-primary);">
            <h4 class="text-sm font-medium mb-2" style="color: var(--text-primary);">Common Issues:</h4>
            <ul class="text-xs space-y-1" style="color: var(--text-secondary);">
              <li class="flex items-center gap-2">
                <svg class="w-3 h-3 status-error flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd" />
                </svg>
                <span>Missing commas between elements</span>
              </li>
              <li class="flex items-center gap-2">
                <svg class="w-3 h-3 status-error flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd" />
                </svg>
                <span>Unclosed brackets or braces</span>
              </li>
              <li class="flex items-center gap-2">
                <svg class="w-3 h-3 status-error flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd" />
                </svg>
                <span>Unquoted property names</span>
              </li>
              <li class="flex items-center gap-2">
                <svg class="w-3 h-3 status-error flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd" />
                </svg>
                <span>Trailing commas</span>
              </li>
            </ul>
          </div>

          <p class="text-xs" style="color: var(--text-secondary);">Check the input panel for detailed error
            locations and suggestions.</p>
        </div>
      </div>

      <!-- Tree visualization -->
      <div v-else-if="jsonTree.length > 0 && currentView === 'tree'" class="tree-container py-2 overflow-auto">
        <TreeNode v-for="node in jsonTree" :key="getNodeKey(node)"
          :ref="(ref) => setTreeNodeRef(node.path.join('.'), ref as InstanceType<typeof TreeNode>)" :node="node"
          :depth="0" :is-expanded="isNodeExpanded(node.path.join('.'))"
          :is-selected="isNodeSelected(node.path.join('.'))" :is-highlighted="isNodeHighlighted(node.path.join('.'))"
          @toggle-expansion="handleToggleExpansion" @node-select="handleNodeSelect" @copy-success="handleCopySuccess" />
      </div>

      <!-- Graph visualization -->
      <div v-else-if="jsonTree.length > 0 && currentView === 'graph'" class="graph-container h-full">
        <GraphCanvas :nodes="graphNodes" :links="graphLinks" :width="graphCanvasWidth" :height="graphCanvasHeight"
          :selected-node-id="selectedGraphNodeId" :highlighted-nodes="highlightedGraphNodes"
          @node-click="handleGraphNodeClick" @node-double-click="handleGraphNodeDoubleClick"
          @node-select="handleGraphNodeSelect" @node-focus="handleGraphNodeFocus" @canvas-click="handleGraphCanvasClick"
          @copy-success="handleCopySuccess" @copy-error="handleCopyError" />
      </div>
    </div>

    <!-- Copy success notification -->
    <div v-if="showCopyNotification"
      class="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 z-50 hover-lift"
      style="background-color: var(--status-success); color: white;">
      <div class="flex items-center space-x-2">
        <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-sm font-medium">{{ copyNotificationMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useJsonStore } from '@/stores/json'
import TreeNode from './TreeNode.vue'
import GraphCanvas from './GraphCanvas.vue'
import type { JSONNode, GraphNode } from '@/types'

// Store
const jsonStore = useJsonStore()

// Local state
const showCopyNotification = ref(false)
const copyNotificationMessage = ref('')
const treeNodeRefs = ref<Record<string, InstanceType<typeof TreeNode>>>({})
const graphCanvasRef = ref<InstanceType<typeof GraphCanvas>>()
const graphCanvasWidth = ref(800)
const graphCanvasHeight = ref(600)

// Computed properties from store
const jsonTree = computed(() => jsonStore.jsonTree)
const hasValidJson = computed(() => jsonStore.hasValidJson)
const hasErrors = computed(() => jsonStore.hasErrors)
const validationErrors = computed(() => jsonStore.validationErrors)
const totalNodes = computed(() => jsonStore.totalNodes)
const expandedNodeCount = computed(() => jsonStore.expandedNodeCount)
const currentView = computed(() => jsonStore.currentView)

// Graph-specific computed properties
const graphNodes = computed(() => jsonStore.graphNodes)
const graphLinks = computed(() => jsonStore.graphLinks)
const selectedGraphNodeId = computed(() => jsonStore.graphState.selectedNodeId)
const highlightedGraphNodes = computed(() => jsonStore.graphState.highlightedNodes)


// Methods - Define these first before computed properties that use them
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

const handleNodeSelect = async (nodePath: string) => {
  jsonStore.selectNode(nodePath)

  // Focus the selected node
  await nextTick()
  const nodeRef = treeNodeRefs.value[nodePath]
  if (nodeRef) {
    nodeRef.focusNode()
  }
}

const setTreeNodeRef = (nodePath: string, ref: InstanceType<typeof TreeNode> | null) => {
  if (ref) {
    treeNodeRefs.value[nodePath] = ref
  } else {
    delete treeNodeRefs.value[nodePath]
  }
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

const scrollToNode = async (nodePath: string) => {
  await nextTick()
  const nodeRef = treeNodeRefs.value[nodePath]
  if (nodeRef) {
    nodeRef.scrollIntoView()
  }
}

const handleScrollToNode = (event: CustomEvent) => {
  const { nodePath } = event.detail
  scrollToNode(nodePath)
}

// Graph event handlers
const handleGraphNodeClick = (node: GraphNode, event: MouseEvent) => {
  // Handle graph node click - could sync with tree selection
  console.log('Graph node clicked:', node)
}

const handleGraphNodeDoubleClick = (node: GraphNode, event: MouseEvent) => {
  // Handle graph node double click - could focus on node
  console.log('Graph node double clicked:', node)
}

const handleGraphNodeSelect = (node: GraphNode) => {
  jsonStore.selectGraphNode(node.id)
}

const handleGraphNodeFocus = (node: GraphNode) => {
  // Handle graph node focus for accessibility
  console.log('Graph node focused:', node)
}

const handleGraphCanvasClick = (event: MouseEvent) => {
  // Handle canvas click - clear selection
  jsonStore.selectGraphNode(null)
}

const handleCopyError = (error: Error) => {
  console.error('Copy failed:', error)
  handleCopySuccess('Copy failed')
}

// Resize handler for graph canvas
const updateGraphCanvasSize = () => {
  const container = document.querySelector('.graph-container')
  if (container) {
    const rect = container.getBoundingClientRect()
    graphCanvasWidth.value = rect.width
    graphCanvasHeight.value = rect.height
  }
}

// Resize observer for responsive graph canvas
const resizeObserver = ref<ResizeObserver | null>(null)

// Initialize store on mount
onMounted(() => {
  jsonStore.initializeStore()

  // Listen for scroll-to-node events from SearchBar
  document.addEventListener('scroll-to-node', handleScrollToNode as EventListener)

  // Set up resize observer for graph canvas
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver.value = new ResizeObserver(() => {
      updateGraphCanvasSize()
    })

    const container = document.querySelector('.graph-container')
    if (container) {
      resizeObserver.value.observe(container)
    }
  }

  // Initial size update
  updateGraphCanvasSize()
})

onUnmounted(() => {
  document.removeEventListener('scroll-to-node', handleScrollToNode as EventListener)

  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
})
</script>

<style scoped>
.visualization-panel {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tree-container {
  min-height: 100%;
}

.graph-container {
  min-height: 100%;
  width: 100%;
  position: relative;
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
