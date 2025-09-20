<template>
    <div ref="containerRef" class="graph-canvas" :style="{ width: `${width}px`, height: `${height}px` }">
        <svg ref="svgRef" :width="width" :height="height" class="graph-svg" @wheel="zoom.handleWheel"
            @mousedown="zoom.handleMouseDown" @mousemove="zoom.handleMouseMove" @mouseup="zoom.handleMouseUp"
            @click="handleCanvasClick">
            <defs>
                <!-- Arrowhead marker for directed edges -->
                <marker id="arrowhead" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="6" markerHeight="6"
                    orient="auto">
                    <path d="M0,-5L10,0L0,5" fill="#666" />
                </marker>
            </defs>

            <!-- Container for zoom/pan transformations -->
            <g class="zoom-container" :transform="zoom.transformString.value">
                <!-- Links -->
                <g class="links-group">
                    <path v-for="link in layout.links.value"
                        :key="`${getNodeId(link.source)}-${getNodeId(link.target)}`" class="link" :d="getLinkPath(link)"
                        :stroke="getLinkStroke(link)" :stroke-width="getLinkStrokeWidth(link)"
                        :opacity="getLinkOpacity(link)" fill="none" marker-end="url(#arrowhead)"
                        @click="handleLinkClick(link, $event)" />
                </g>

                <!-- Nodes -->
                <g class="nodes-group">
                    <GraphNodeComponent v-for="node in layout.nodes.value" :key="node.id" :node="node"
                        :is-selected="isNodeSelected(node.id)" :is-highlighted="isNodeHighlighted(node.id)"
                        :show-labels="true" @click="handleNodeClick" @double-click="handleNodeDoubleClick"
                        @context-menu="handleNodeContextMenu" @drag-start="handleNodeDragStart" @drag="handleNodeDrag"
                        @drag-end="handleNodeDragEnd" @focus="handleNodeFocus" @blur="handleNodeBlur"
                        @tooltip-show="handleTooltipShow" @tooltip-hide="handleTooltipHide" />
                </g>

                <!-- Tooltips layer - rendered on top of all nodes -->
                <g class="tooltips-group">
                    <foreignObject v-if="tooltipNode" :x="tooltipX" :y="tooltipY" :width="tooltipWidth"
                        :height="tooltipHeight" class="tooltip-container">
                        <div class="tooltip" xmlns="http://www.w3.org/1999/xhtml">
                            <div class="tooltip-header">
                                <span class="tooltip-key">{{ tooltipNode.key }}</span>
                                <span class="tooltip-type">{{ tooltipNode.type.toUpperCase() }}</span>
                            </div>
                            <div class="tooltip-value">{{ tooltipValue }}</div>
                            <div class="tooltip-path">{{ tooltipNode.path.join('.') || 'root' }}</div>
                            <div class="tooltip-properties">{{ tooltipNode.properties.length }} properties</div>
                        </div>
                    </foreignObject>
                </g>
            </g>
        </svg>

        <!-- Loading overlay -->
        <div v-if="isLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
            <span>Rendering graph...</span>
        </div>

        <!-- Context Menu -->
        <ContextMenu :is-visible="contextMenu.isVisible" :x="contextMenu.x" :y="contextMenu.y" :items="contextMenuItems"
            @close="hideContextMenu" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import type { GraphNode, GraphLink, LayoutType, ForceLayoutOptions, LayoutStats } from '@/types'
import type { ZoomTransform } from '@/composables/useNativeZoom'
import { useNativeZoom } from '@/composables/useNativeZoom'
import { useNativeLayout } from '@/composables/useNativeLayout'
import ContextMenu from './ContextMenu.vue'
import GraphNodeComponent from './GraphNode.vue'
import { useGraphInteractions } from '@/composables/useGraphInteractions'
import { useGraphKeyboardNavigation } from '@/composables/useGraphKeyboardNavigation'
import { useGraphSearch } from '@/composables/useGraphSearch'
import { calculateLinkPath } from '@/utils/link-paths'

// Props
interface Props {
    nodes: GraphNode[]
    links: GraphLink[]
    width?: number
    height?: number
    layoutType?: LayoutType
    selectedNodeId?: string | null
    highlightedNodes?: Set<string>
    forceOptions?: Partial<ForceLayoutOptions>
}

const props = withDefaults(defineProps<Props>(), {
    width: 800,
    height: 600,
    layoutType: 'force',
    selectedNodeId: null,
    highlightedNodes: () => new Set(),
    forceOptions: () => ({})
})

// Emits
interface Emits {
    nodeClick: [node: GraphNode, event: MouseEvent]
    nodeDoubleClick: [node: GraphNode, event: MouseEvent]
    nodeHover: [node: GraphNode | null, event: MouseEvent]
    nodeSelect: [node: GraphNode]
    nodeFocus: [node: GraphNode]
    linkClick: [link: GraphLink, event: MouseEvent]
    canvasClick: [event: MouseEvent]
    zoomChange: [transform: ZoomTransform]
    simulationTick: [stats: LayoutStats]
    simulationEnd: [stats: LayoutStats]
    copySuccess: [text: string]
    copyError: [error: Error]
}

const emit = defineEmits<Emits>()

// Template refs
const containerRef = ref<HTMLDivElement>()
const svgRef = ref<SVGSVGElement>()

// Native zoom and pan
const zoom = useNativeZoom({
    bounds: { minScale: 0.1, maxScale: 10 },
    onTransformChange: (transform) => {
        emit('zoomChange', transform)
    }
})

// Native layout engine
const layout = useNativeLayout({
    width: props.width,
    height: props.height,
    nodeSpacing: 80,
    levelSpacing: 220,
    centerForce: 0.1,
    iterations: 300
})

// Graph interactions
const {
    contextMenu,
    selectedNodeId,
    highlightedNodes,
    contextMenuItems,
    handleNodeClick: baseHandleNodeClick,
    handleNodeDoubleClick: baseHandleNodeDoubleClick,
    handleNodeContextMenu: baseHandleNodeContextMenu,
    handleNodeHover,
    handleNodeFocus: baseHandleNodeFocus,
    handleNodeBlur: baseHandleNodeBlur,
    handleCanvasClick: baseHandleCanvasClick,
    hideContextMenu,
    isNodeSelected,
    isNodeHighlighted,
    highlightConnectedNodes,
} = useGraphInteractions({
    onNodeSelect: (node) => emit('nodeSelect', node),
    onNodeDoubleClick: (node) => emit('nodeDoubleClick', node, {} as MouseEvent),
    onCopySuccess: (text) => emit('copySuccess', text),
    onCopyError: (error) => emit('copyError', error),
})

// Keyboard navigation
const keyboardNav = useGraphKeyboardNavigation(
    () => layout.nodes.value,
    () => selectedNodeId.value,
    {
        onNodeSelect: (node) => {
            baseHandleNodeClick(node, {} as MouseEvent)
        },
        onNodeFocus: (node) => {
            baseHandleNodeFocus(node)
            emit('nodeFocus', node)
        },
        onCopy: (text) => emit('copySuccess', text),
        onZoomToFit: () => zoomToFit(),
        onResetZoom: () => resetZoom(),
    }
)

// Graph search functionality
const graphSearch = useGraphSearch({
    caseSensitive: false,
    matchWholeWords: false,
    searchKeys: true,
    searchValues: true,
    highlightConnections: true,
})

// State
const isLoading = ref(false)

// Tooltip state
const tooltipNode = ref<GraphNode | null>(null)

// Tooltip computed properties
const tooltipX = computed(() => {
    if (!tooltipNode.value) return 0
    const nodeWidth = tooltipNode.value.width || 150
    return (tooltipNode.value.x || 0) + nodeWidth + 10
})

const tooltipY = computed(() => {
    if (!tooltipNode.value) return 0
    return (tooltipNode.value.y || 0) - 10
})

const tooltipWidth = computed(() => 220)
const tooltipHeight = computed(() => 100)

const tooltipValue = computed(() => {
    if (!tooltipNode.value) return ''
    const value = tooltipNode.value.value
    if (value === null) return 'null'
    if (typeof value === 'string') {
        return value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`
    }
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return `Array(${value.length})`
        }
        const keys = Object.keys(value as Record<string, unknown>)
        return `Object(${keys.length} keys)`
    }
    return String(value)
})

// Initialize native layout
const initializeLayout = () => {
    if (props.nodes.length === 0) {
        console.log('GraphCanvas: No nodes to simulate')
        return
    }

    console.log('GraphCanvas: Initializing layout with', props.nodes.length, 'nodes and', props.links.length, 'links')

    // Set up callbacks
    layout.onTick((stats) => {
        console.log('GraphCanvas: Layout tick', stats.iterations, 'alpha:', stats.alpha)
        emit('simulationTick', stats)
    })

    layout.onEnd((stats) => {
        console.log('GraphCanvas: Layout ended', stats)
        emit('simulationEnd', stats)
    })

    // Initialize with current data
    layout.initialize(props.nodes, props.links)

    console.log('GraphCanvas: Layout initialized, isRunning:', layout.isRunning.value)
}

// Helper functions for template
const getNodeId = (nodeRef: string | GraphNode): string => {
    return typeof nodeRef === 'string' ? nodeRef : nodeRef.id
}

const getNodeX = (nodeRef: string | GraphNode): number => {
    if (typeof nodeRef === 'string') {
        const node = layout.nodes.value.find(n => n.id === nodeRef)
        return node?.x ?? 0
    }
    return nodeRef.x ?? 0
}

const getNodeY = (nodeRef: string | GraphNode): number => {
    if (typeof nodeRef === 'string') {
        const node = layout.nodes.value.find(n => n.id === nodeRef)
        return node?.y ?? 0
    }
    return nodeRef.y ?? 0
}

const getLinkStroke = (link: GraphLink): string => {
    const sourceId = getNodeId(link.source)
    const targetId = getNodeId(link.target)
    return isNodeHighlighted(sourceId) || isNodeHighlighted(targetId) ? '#007acc' : '#666'
}

const getLinkStrokeWidth = (link: GraphLink): number => {
    const sourceId = getNodeId(link.source)
    const targetId = getNodeId(link.target)
    return isNodeHighlighted(sourceId) || isNodeHighlighted(targetId) ? 3 : 1.5
}

const getLinkOpacity = (link: GraphLink): number => {
    const sourceId = getNodeId(link.source)
    const targetId = getNodeId(link.target)

    // Handle search highlighting
    if (graphSearch.hasGraphSearchResults.value) {
        const sourceHighlighted = graphSearch.isNodeHighlightedBySearch(sourceId)
        const targetHighlighted = graphSearch.isNodeHighlightedBySearch(targetId)
        if (sourceHighlighted || targetHighlighted) {
            return 1 // Full opacity for search-related links
        } else {
            return 0.2 // Dim non-search-related links
        }
    }

    // Handle selection highlighting
    if (selectedNodeId.value && !isNodeHighlighted(sourceId) && !isNodeHighlighted(targetId)) {
        return 0.3 // Dim non-connected links when a node is selected
    }
    return 1
}

const getLinkPath = (link: GraphLink): string => {
    // Get actual node dimensions instead of using hardcoded values
    const sourceId = getNodeId(link.source)
    const targetId = getNodeId(link.target)
    const sourceNode = layout.nodes.value.find(n => n.id === sourceId)
    const targetNode = layout.nodes.value.find(n => n.id === targetId)

    // Use actual node dimensions or fallback to defaults
    const nodeWidth = sourceNode?.width || 150
    const nodeHeight = sourceNode?.height || 80

    const linkPath = calculateLinkPath(link, layout.nodes.value, {
        nodeWidth,
        nodeHeight,
        headerHeight: 24,
        propertyHeight: 20,
        curvature: 0.4
    })

    if (linkPath) {
        return linkPath.path
    }

    // Fallback to straight line if path calculation fails
    const sourceX = getNodeX(link.source)
    const sourceY = getNodeY(link.source)
    const targetX = getNodeX(link.target)
    const targetY = getNodeY(link.target)

    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
}

// Event handlers
const handleCanvasClick = (event: MouseEvent) => {
    // Only handle clicks on the SVG background, not on nodes or links
    if (event.target === svgRef.value && !zoom.isDragging.value) {
        baseHandleCanvasClick(event)
        emit('canvasClick', event)
    }
}

const handleLinkClick = (link: GraphLink, event: MouseEvent) => {
    event.stopPropagation()
    emit('linkClick', link, event)
}

const handleNodeClick = (node: GraphNode, event: MouseEvent) => {
    baseHandleNodeClick(node, event)
    emit('nodeClick', node, event)
}

const handleNodeDoubleClick = (node: GraphNode, event: MouseEvent) => {
    baseHandleNodeDoubleClick(node, event)
    emit('nodeDoubleClick', node, event)
}

const handleNodeContextMenu = (node: GraphNode, event: MouseEvent) => {
    baseHandleNodeContextMenu(node, event)
}

const handleNodeFocus = (node: GraphNode) => {
    baseHandleNodeFocus(node)
    emit('nodeFocus', node)
}

const handleNodeBlur = (node: GraphNode) => {
    baseHandleNodeBlur(node)
}

const handleNodeDragStart = (node: GraphNode) => {
    // Stop layout animation during drag
    layout.stop()
}

const handleNodeDrag = (node: GraphNode) => {
    // Node position is updated by the GraphNode component
}

const handleNodeDragEnd = (node: GraphNode) => {
    // Optionally restart layout after drag
    // layout.start()
}

const handleTooltipShow = (node: GraphNode) => {
    tooltipNode.value = node
}

const handleTooltipHide = (node: GraphNode) => {
    if (tooltipNode.value?.id === node.id) {
        tooltipNode.value = null
    }
}

// Render the complete graph
const renderGraph = async () => {
    isLoading.value = true

    try {
        await nextTick()
        initializeLayout()
    } finally {
        isLoading.value = false
    }
}

// Public methods for external control
const zoomToFit = () => {
    if (layout.nodes.value.length === 0) return

    const bounds = getBounds()
    zoom.zoomToFit(bounds, props.width, props.height)
}

const zoomToNode = (nodeId: string) => {
    const node = layout.nodes.value.find(n => n.id === nodeId)
    if (!node || node.x === undefined || node.y === undefined) return

    const centerX = props.width / 2
    const centerY = props.height / 2
    const scale = 2
    const x = centerX - node.x * scale
    const y = centerY - node.y * scale

    zoom.setTransform({ x, y, k: scale })
}

const resetZoom = () => {
    zoom.resetZoom()
}

const restartSimulation = () => {
    layout.start()
}

const stopSimulation = () => {
    layout.stop()
}

const updateForceParameters = (options: Partial<ForceLayoutOptions>) => {
    // Convert force options to native layout options
    layout.updateOptions({
        width: options.width ?? props.width,
        height: options.height ?? props.height,
        nodeSpacing: 80,
        levelSpacing: 150,
        centerForce: 0.1,
        iterations: 300
    })
}

const getLayoutStats = (): LayoutStats => {
    return layout.stats.value
}

// Get bounds of all nodes
const getBounds = () => {
    const nodes = layout.nodes.value.filter(n => n.x !== undefined && n.y !== undefined)
    if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

    const xs = nodes.map(n => n.x!)
    const ys = nodes.map(n => n.y!)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    }
}

// Watchers
watch(() => [props.nodes, props.links], () => {
    renderGraph()
}, { deep: true })

watch(() => selectedNodeId.value, (newSelectedId) => {
    if (newSelectedId) {
        // Highlight connected nodes when a node is selected
        highlightConnectedNodes(newSelectedId, props.links)
    }
})

watch(() => [props.width, props.height], () => {
    layout.updateOptions({
        width: props.width,
        height: props.height
    })
})

// Event handlers for search integration
const handleCenterOnNode = (event: CustomEvent) => {
    const { nodeId, smooth = true } = event.detail
    if (smooth) {
        zoomToNode(nodeId)
    } else {
        // Immediate center without animation
        const node = layout.nodes.value.find(n => n.id === nodeId)
        if (node && node.x !== undefined && node.y !== undefined) {
            const scale = zoom.transform.value.k
            const x = props.width / 2 - node.x * scale
            const y = props.height / 2 - node.y * scale
            zoom.setTransform({ x, y, k: scale })
        }
    }
}

// Lifecycle
onMounted(() => {
    renderGraph()
    keyboardNav.activate()

    // Listen for search-related events
    document.addEventListener('center-on-graph-node', handleCenterOnNode as EventListener)

    // Add global mouse event listeners for zoom/pan
    document.addEventListener('mousemove', zoom.handleMouseMove)
    document.addEventListener('mouseup', zoom.handleMouseUp)
})

onUnmounted(() => {
    layout.stop()
    keyboardNav.deactivate()

    // Remove event listeners
    document.removeEventListener('center-on-graph-node', handleCenterOnNode as EventListener)
    document.removeEventListener('mousemove', zoom.handleMouseMove)
    document.removeEventListener('mouseup', zoom.handleMouseUp)
})

// Expose public methods
defineExpose({
    zoomToFit,
    zoomToNode,
    resetZoom,
    restartSimulation,
    stopSimulation,
    updateForceParameters,
    getLayoutStats,
    getBounds
})
</script>

<style scoped>
.graph-canvas {
    position: relative;
    overflow: hidden;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fafafa;
}

.graph-svg {
    display: block;
    background: #fff;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-size: 14px;
    color: #666;
}

.loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007acc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

/* Node and link styles are handled by D3 */
:deep(.node) {
    transition: opacity 0.3s ease;
}

:deep(.link) {
    transition: opacity 0.3s ease, stroke-width 0.3s ease, stroke 0.3s ease;
}

:deep(.node:hover circle) {
    filter: brightness(1.1);
}

/* Tooltip styles */
.tooltip-container {
    pointer-events: none;
    z-index: 1000;
}

.tooltip {
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 200px;
    word-wrap: break-word;
}

.tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-weight: 600;
}

.tooltip-key {
    color: #fbbf24;
    font-family: 'Monaco', 'Consolas', monospace;
}

.tooltip-type {
    color: #a78bfa;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.tooltip-value {
    color: #e5e7eb;
    margin-bottom: 4px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 11px;
}

.tooltip-path {
    color: #9ca3af;
    font-size: 10px;
    font-style: italic;
    margin-bottom: 4px;
}

.tooltip-properties {
    color: #9ca3af;
    font-size: 10px;
}
</style>
