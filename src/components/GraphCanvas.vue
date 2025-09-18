<template>
    <div ref="containerRef" class="graph-canvas" :style="{ width: `${width}px`, height: `${height}px` }">
        <svg ref="svgRef" :width="width" :height="height" class="graph-svg">
            <defs>
                <!-- Arrowhead marker for directed edges -->
                <marker id="arrowhead" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="6" markerHeight="6"
                    orient="auto">
                    <path d="M0,-5L10,0L0,5" fill="#666" />
                </marker>
            </defs>

            <!-- Container for zoom/pan transformations -->
            <g ref="containerGroupRef" class="zoom-container">
                <!-- Links group -->
                <g ref="linksGroupRef" class="links-group"></g>

                <!-- Nodes group -->
                <g ref="nodesGroupRef" class="nodes-group"></g>
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
import {
    select,
    zoom,
    zoomIdentity,
    type D3Selection,
    type D3ZoomBehavior,
    type ZoomTransform,
} from '@/utils/d3-imports'
import { ForceLayout } from '@/utils/force-layout'
import ContextMenu from './ContextMenu.vue'
import { useGraphInteractions } from '@/composables/useGraphInteractions'
import { useGraphKeyboardNavigation } from '@/composables/useGraphKeyboardNavigation'
import { useGraphSearch } from '@/composables/useGraphSearch'

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
const containerGroupRef = ref<SVGGElement>()
const linksGroupRef = ref<SVGGElement>()
const nodesGroupRef = ref<SVGGElement>()

// Graph interactions
const {
    contextMenu,
    selectedNodeId,
    highlightedNodes,
    contextMenuItems,
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodeContextMenu,
    handleNodeHover,
    handleNodeFocus,
    handleNodeBlur,
    handleCanvasClick,
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
    () => props.nodes,
    () => selectedNodeId.value,
    {
        onNodeSelect: (node) => {
            handleNodeClick(node, {} as MouseEvent)
        },
        onNodeFocus: (node) => {
            handleNodeFocus(node)
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
const forceLayout = ref<ForceLayout | null>(null)
const zoomBehavior = ref<D3ZoomBehavior | null>(null)
const currentTransform = ref<ZoomTransform>(zoomIdentity)
const layoutStats = ref<LayoutStats>({
    iterations: 0,
    alpha: 1,
    isConverged: false,
    averageVelocity: 0,
    maxVelocity: 0,
    frameRate: 0,
    lastTickTime: 0,
})

// D3 selections
let svgSelection: D3Selection | null = null
let containerGroupSelection: D3Selection | null = null
let linksGroupSelection: D3Selection | null = null
let nodesGroupSelection: D3Selection | null = null

// Computed
const forceLayoutOptions = computed((): ForceLayoutOptions => ({
    width: props.width,
    height: props.height,
    ...props.forceOptions
}))

// Initialize D3 selections and setup
const initializeD3 = () => {
    if (!svgRef.value || !containerGroupRef.value || !linksGroupRef.value || !nodesGroupRef.value) {
        return
    }

    svgSelection = select(svgRef.value)
    containerGroupSelection = select(containerGroupRef.value)
    linksGroupSelection = select(linksGroupRef.value)
    nodesGroupSelection = select(nodesGroupRef.value)

    setupZoomBehavior()
}

// Setup zoom and pan behavior
const setupZoomBehavior = () => {
    if (!svgSelection || !containerGroupSelection) return

    zoomBehavior.value = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
            const transform = event.transform as ZoomTransform
            currentTransform.value = transform
            containerGroupSelection!.attr('transform', transform.toString())
            emit('zoomChange', transform)
        })

    svgSelection.call(zoomBehavior.value)

    // Handle canvas clicks (when clicking on empty space)
    svgSelection.on('click', (event) => {
        if (event.target === svgRef.value) {
            handleCanvasClick(event)
            emit('canvasClick', event)
        }
    })
}

// Initialize force simulation
const initializeSimulation = () => {
    if (props.nodes.length === 0) return

    // Dispose existing layout
    if (forceLayout.value) {
        forceLayout.value.dispose()
    }

    // Create new force layout
    forceLayout.value = new ForceLayout(forceLayoutOptions.value)

    // Set up callbacks
    forceLayout.value.onTick((stats) => {
        layoutStats.value = stats
        updatePositions()
        emit('simulationTick', stats)
    })

    forceLayout.value.onEnd((stats) => {
        layoutStats.value = stats
        emit('simulationEnd', stats)
    })

    // Initialize with current data
    forceLayout.value.initialize(props.nodes, props.links)
}

// Update node and link positions during simulation
const updatePositions = () => {
    if (!nodesGroupSelection || !linksGroupSelection) return

    // Update link positions
    linksGroupSelection.selectAll('.link')
        .attr('x1', (d: any) => d.source.x ?? 0)
        .attr('y1', (d: any) => d.source.y ?? 0)
        .attr('x2', (d: any) => d.target.x ?? 0)
        .attr('y2', (d: any) => d.target.y ?? 0)

    // Update node positions
    nodesGroupSelection.selectAll('.node')
        .attr('transform', (d: any) => `translate(${d.x ?? 0},${d.y ?? 0})`)
}

// Render links
const renderLinks = () => {
    if (!linksGroupSelection) return

    const linkSelection = linksGroupSelection
        .selectAll('.link')
        .data(props.links, (d: any) => `${typeof d.source === 'string' ? d.source : d.source.id}-${typeof d.target === 'string' ? d.target : d.target.id}`)

    // Remove old links
    linkSelection.exit().remove()

    // Add new links
    const linkEnter = linkSelection.enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke', '#666')
        .attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arrowhead)')
        .style('opacity', 0)

    // Handle link clicks
    linkEnter.on('click', (event, d) => {
        event.stopPropagation()
        emit('linkClick', d as GraphLink, event)
    })

    // Merge and update all links
    const linkUpdate = linkEnter.merge(linkSelection as any)

    linkUpdate
        .transition()
        .duration(300)
        .style('opacity', 1)
        .attr('stroke-width', (d: any) => {
            const sourceId = typeof d.source === 'string' ? d.source : d.source.id
            const targetId = typeof d.target === 'string' ? d.target : d.target.id
            return isNodeHighlighted(sourceId) || isNodeHighlighted(targetId) ? 3 : 1.5
        })
        .attr('stroke', (d: any) => {
            const sourceId = typeof d.source === 'string' ? d.source : d.source.id
            const targetId = typeof d.target === 'string' ? d.target : d.target.id
            return isNodeHighlighted(sourceId) || isNodeHighlighted(targetId) ? '#007acc' : '#666'
        })
        .style('opacity', (d: any) => {
            const sourceId = typeof d.source === 'string' ? d.source : d.source.id
            const targetId = typeof d.target === 'string' ? d.target : d.target.id

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
        })
}

// Render nodes
const renderNodes = () => {
    if (!nodesGroupSelection) return

    const nodeSelection = nodesGroupSelection
        .selectAll('.node')
        .data(props.nodes, (d: any) => d.id)

    // Remove old nodes
    nodeSelection.exit().remove()

    // Add new nodes
    const nodeEnter = nodeSelection.enter()
        .append('g')
        .attr('class', 'node')
        .style('cursor', 'pointer')
        .style('opacity', 0)

    // Add circles for nodes
    nodeEnter.append('circle')
        .attr('r', (d: any) => d.size)
        .attr('fill', (d: any) => getNodeColor(d.type))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)

    // Add labels for nodes
    nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-family', 'Arial, sans-serif')
        .attr('fill', '#333')
        .text((d: any) => truncateLabel(String(d.key), 10))

    // Handle node interactions
    nodeEnter
        .attr('data-node-id', (d: any) => d.id)
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', (d: any) => `${d.type} node: ${d.key}`)
        .on('click', (event, d) => {
            handleNodeClick(d as GraphNode, event)
            emit('nodeClick', d as GraphNode, event)
        })
        .on('dblclick', (event, d) => {
            handleNodeDoubleClick(d as GraphNode, event)
            emit('nodeDoubleClick', d as GraphNode, event)
        })
        .on('contextmenu', (event, d) => {
            handleNodeContextMenu(d as GraphNode, event)
        })
        .on('mouseenter', (event, d) => {
            handleNodeHover(d as GraphNode)
            emit('nodeHover', d as GraphNode, event)
        })
        .on('mouseleave', (event) => {
            handleNodeHover(null)
            emit('nodeHover', null, event)
        })
        .on('focus', (event, d) => {
            handleNodeFocus(d as GraphNode)
            emit('nodeFocus', d as GraphNode)
        })
        .on('blur', (event, d) => {
            handleNodeBlur(d as GraphNode)
        })
        .on('keydown', (event, d) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleNodeClick(d as GraphNode, event as unknown as MouseEvent)
            }
        })

    // Merge and update all nodes
    const nodeUpdate = nodeEnter.merge(nodeSelection as any)

    nodeUpdate
        .transition()
        .duration(300)
        .style('opacity', 1)

    // Update node appearance based on selection, highlighting, and search
    nodeUpdate.select('circle')
        .attr('fill', (d: any) => {
            if (isNodeSelected(d.id)) return '#ff6b35'
            if (isNodeHighlighted(d.id)) return '#007acc'
            if (graphSearch.isNodeHighlightedBySearch(d.id)) return '#10b981' // Green for search matches
            return getNodeColor(d.type)
        })
        .attr('stroke-width', (d: any) => {
            if (isNodeSelected(d.id)) return 4
            if (isNodeHighlighted(d.id)) return 3
            if (graphSearch.isNodeHighlightedBySearch(d.id)) return 3
            return 2
        })
        .attr('stroke', (d: any) => {
            if (isNodeSelected(d.id)) return '#333'
            if (isNodeHighlighted(d.id)) return '#005a9e'
            if (graphSearch.isNodeHighlightedBySearch(d.id)) return '#059669'
            return '#fff'
        })
        .attr('r', (d: any) => {
            const baseSize = d.size
            if (isNodeSelected(d.id)) return baseSize * 1.2
            if (isNodeHighlighted(d.id)) return baseSize * 1.1
            if (graphSearch.isNodeHighlightedBySearch(d.id)) return baseSize * 1.15
            return baseSize
        })
        .style('opacity', (d: any) => {
            // Dim nodes that don't match search when search is active
            if (graphSearch.hasGraphSearchResults.value && graphSearch.isNodeDimmedBySearch(d.id)) {
                return 0.3
            }
            return 1
        })

    nodeUpdate.select('text')
        .attr('fill', (d: any) => {
            if (isNodeSelected(d.id) || isNodeHighlighted(d.id) || graphSearch.isNodeHighlightedBySearch(d.id)) return '#fff'
            return '#333'
        })
        .style('opacity', (d: any) => {
            // Dim text for nodes that don't match search when search is active
            if (graphSearch.hasGraphSearchResults.value && graphSearch.isNodeDimmedBySearch(d.id)) {
                return 0.4
            }
            return 1
        })

    // Add focus indicators
    nodeUpdate
        .style('outline', (d: any) => {
            if (keyboardNav.focusedNodeId.value === d.id) return '2px solid #007acc'
            return 'none'
        })
        .style('outline-offset', '2px')
}

// Get color for node based on type
const getNodeColor = (type: GraphNode['type']): string => {
    const colors = {
        object: '#4CAF50',
        array: '#2196F3',
        string: '#FF9800',
        number: '#9C27B0',
        boolean: '#F44336',
        null: '#607D8B'
    }
    return colors[type] || '#666'
}

// Truncate label text
const truncateLabel = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
}

// Render the complete graph
const renderGraph = async () => {
    if (!svgSelection || !containerGroupSelection) return

    isLoading.value = true

    try {
        await nextTick()

        renderLinks()
        renderNodes()
        initializeSimulation()
    } finally {
        isLoading.value = false
    }
}

// Public methods for external control
const zoomToFit = () => {
    if (!svgSelection || !zoomBehavior.value || props.nodes.length === 0) return

    const bounds = getBounds()
    const fullWidth = props.width
    const fullHeight = props.height
    const width = bounds.width
    const height = bounds.height
    const midX = bounds.x + width / 2
    const midY = bounds.y + height / 2

    if (width === 0 || height === 0) return

    const scale = Math.min(fullWidth / width, fullHeight / height) * 0.9
    const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY]

    svgSelection
        .transition()
        .duration(750)
        .call(zoomBehavior.value.transform, zoomIdentity.translate(translate[0], translate[1]).scale(scale))
}

const zoomToNode = (nodeId: string) => {
    if (!svgSelection || !zoomBehavior.value) return

    const node = props.nodes.find(n => n.id === nodeId)
    if (!node || node.x === undefined || node.y === undefined) return

    const scale = 2
    const translate = [props.width / 2 - scale * node.x, props.height / 2 - scale * node.y]

    svgSelection
        .transition()
        .duration(500)
        .call(zoomBehavior.value.transform, zoomIdentity.translate(translate[0], translate[1]).scale(scale))
}

const resetZoom = () => {
    if (!svgSelection || !zoomBehavior.value) return

    svgSelection
        .transition()
        .duration(500)
        .call(zoomBehavior.value.transform, zoomIdentity)
}

const restartSimulation = () => {
    if (forceLayout.value) {
        forceLayout.value.start()
    }
}

const stopSimulation = () => {
    if (forceLayout.value) {
        forceLayout.value.stop()
    }
}

const updateForceParameters = (options: Partial<ForceLayoutOptions>) => {
    if (forceLayout.value) {
        forceLayout.value.updateForces(options)
    }
}

const getLayoutStats = (): LayoutStats => {
    return layoutStats.value
}

// Get bounds of all nodes
const getBounds = () => {
    const nodes = props.nodes.filter(n => n.x !== undefined && n.y !== undefined)
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

watch(() => [props.selectedNodeId, props.highlightedNodes], () => {
    renderNodes()
    renderLinks()
}, { deep: true })

watch(() => selectedNodeId.value, (newSelectedId) => {
    if (newSelectedId) {
        // Highlight connected nodes when a node is selected
        highlightConnectedNodes(newSelectedId, props.links)
    }
    renderNodes()
    renderLinks()
})

watch(() => highlightedNodes.value, () => {
    renderNodes()
    renderLinks()
}, { deep: true })

watch(() => [graphSearch.highlightedGraphNodes.value, graphSearch.dimmedGraphNodes.value], () => {
    renderNodes()
    renderLinks()
}, { deep: true })

watch(() => props.forceOptions, () => {
    if (forceLayout.value) {
        forceLayout.value.updateForces(forceLayoutOptions.value)
    }
}, { deep: true })

watch(() => [props.width, props.height], () => {
    if (forceLayout.value) {
        forceLayout.value.updateDimensions(props.width, props.height)
    }
})

// Event handlers for search integration
const handleCenterOnNode = (event: CustomEvent) => {
    const { nodeId, smooth = true } = event.detail
    if (smooth) {
        zoomToNode(nodeId)
    } else {
        // Immediate center without animation
        const node = props.nodes.find(n => n.id === nodeId)
        if (node && node.x !== undefined && node.y !== undefined) {
            const scale = currentTransform.value.k
            const translate = [props.width / 2 - scale * node.x, props.height / 2 - scale * node.y]

            if (svgSelection && zoomBehavior.value) {
                svgSelection.call(zoomBehavior.value.transform, zoomIdentity.translate(translate[0], translate[1]).scale(scale))
            }
        }
    }
}

// Lifecycle
onMounted(() => {
    initializeD3()
    renderGraph()
    keyboardNav.activate()

    // Listen for search-related events
    document.addEventListener('center-on-graph-node', handleCenterOnNode as EventListener)
})

onUnmounted(() => {
    if (forceLayout.value) {
        forceLayout.value.dispose()
    }
    keyboardNav.deactivate()

    // Remove event listeners
    document.removeEventListener('center-on-graph-node', handleCenterOnNode as EventListener)
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
</style>
