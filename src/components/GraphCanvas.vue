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
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import type { GraphNode, GraphLink, LayoutType } from '@/types'
import {
    select,
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceCollide,
    zoom,
    zoomIdentity,
    type D3Selection,
    type D3Simulation,
    type D3ZoomBehavior,
    type ZoomTransform,
    type SimulationNodeDatum,
    type SimulationLinkDatum
} from '@/utils/d3-imports'

// Props
interface Props {
    nodes: GraphNode[]
    links: GraphLink[]
    width?: number
    height?: number
    layoutType?: LayoutType
    selectedNodeId?: string | null
    highlightedNodes?: Set<string>
    forceStrength?: number
    linkDistance?: number
    centerForce?: number
    collisionRadius?: number
    alphaDecay?: number
}

const props = withDefaults(defineProps<Props>(), {
    width: 800,
    height: 600,
    layoutType: 'force',
    selectedNodeId: null,
    highlightedNodes: () => new Set(),
    forceStrength: -300,
    linkDistance: 50,
    centerForce: 1,
    collisionRadius: 20,
    alphaDecay: 0.02
})

// Emits
interface Emits {
    nodeClick: [node: GraphNode, event: MouseEvent]
    nodeDoubleClick: [node: GraphNode, event: MouseEvent]
    nodeHover: [node: GraphNode | null, event: MouseEvent]
    linkClick: [link: GraphLink, event: MouseEvent]
    canvasClick: [event: MouseEvent]
    zoomChange: [transform: ZoomTransform]
    simulationEnd: []
}

const emit = defineEmits<Emits>()

// Template refs
const containerRef = ref<HTMLDivElement>()
const svgRef = ref<SVGSVGElement>()
const containerGroupRef = ref<SVGGElement>()
const linksGroupRef = ref<SVGGElement>()
const nodesGroupRef = ref<SVGGElement>()

// State
const isLoading = ref(false)
const simulation = ref<D3Simulation<GraphNode> | null>(null)
const zoomBehavior = ref<D3ZoomBehavior | null>(null)
const currentTransform = ref<ZoomTransform>(zoomIdentity)

// D3 selections
let svgSelection: D3Selection | null = null
let containerGroupSelection: D3Selection | null = null
let linksGroupSelection: D3Selection | null = null
let nodesGroupSelection: D3Selection | null = null

// Computed
const simulationNodes = computed(() => {
    return props.nodes.map(node => ({
        ...node,
        // Ensure nodes have initial positions
        x: node.x ?? props.width / 2 + (Math.random() - 0.5) * 100,
        y: node.y ?? props.height / 2 + (Math.random() - 0.5) * 100
    }))
})

const simulationLinks = computed(() => {
    return props.links.map(link => ({
        ...link,
        source: typeof link.source === 'string' ? link.source : link.source.id,
        target: typeof link.target === 'string' ? link.target : link.target.id
    }))
})

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
            emit('canvasClick', event)
        }
    })
}

// Initialize force simulation
const initializeSimulation = () => {
    if (simulationNodes.value.length === 0) return

    // Stop existing simulation
    if (simulation.value) {
        simulation.value.stop()
    }

    simulation.value = forceSimulation(simulationNodes.value as SimulationNodeDatum[])
        .force('link', forceLink(simulationLinks.value as SimulationLinkDatum<SimulationNodeDatum>[])
            .id((d: any) => d.id)
            .distance(props.linkDistance)
            .strength((d: any) => d.strength || 1)
        )
        .force('charge', forceManyBody().strength(props.forceStrength))
        .force('center', forceCenter(props.width / 2, props.height / 2).strength(props.centerForce))
        .force('collision', forceCollide().radius((d: any) => d.size + props.collisionRadius))
        .alphaDecay(props.alphaDecay)
        .on('tick', updatePositions)
        .on('end', () => {
            emit('simulationEnd')
        })
}

// Update node and link positions during simulation
const updatePositions = () => {
    if (!nodesGroupSelection || !linksGroupSelection) return

    // Update link positions
    linksGroupSelection.selectAll('.link')
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

    // Update node positions
    nodesGroupSelection.selectAll('.node')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
}

// Render links
const renderLinks = () => {
    if (!linksGroupSelection) return

    const linkSelection = linksGroupSelection
        .selectAll('.link')
        .data(simulationLinks.value, (d: any) => `${d.source}-${d.target}`)

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
            return props.highlightedNodes.has(sourceId) || props.highlightedNodes.has(targetId) ? 3 : 1.5
        })
        .attr('stroke', (d: any) => {
            const sourceId = typeof d.source === 'string' ? d.source : d.source.id
            const targetId = typeof d.target === 'string' ? d.target : d.target.id
            return props.highlightedNodes.has(sourceId) || props.highlightedNodes.has(targetId) ? '#007acc' : '#666'
        })
}

// Render nodes
const renderNodes = () => {
    if (!nodesGroupSelection) return

    const nodeSelection = nodesGroupSelection
        .selectAll('.node')
        .data(simulationNodes.value, (d: any) => d.id)

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
        .on('click', (event, d) => {
            event.stopPropagation()
            emit('nodeClick', d as GraphNode, event)
        })
        .on('dblclick', (event, d) => {
            event.stopPropagation()
            emit('nodeDoubleClick', d as GraphNode, event)
        })
        .on('mouseenter', (event, d) => {
            emit('nodeHover', d as GraphNode, event)
        })
        .on('mouseleave', (event) => {
            emit('nodeHover', null, event)
        })

    // Merge and update all nodes
    const nodeUpdate = nodeEnter.merge(nodeSelection as any)

    nodeUpdate
        .transition()
        .duration(300)
        .style('opacity', 1)

    // Update node appearance based on selection and highlighting
    nodeUpdate.select('circle')
        .attr('fill', (d: any) => {
            if (d.id === props.selectedNodeId) return '#ff6b35'
            if (props.highlightedNodes.has(d.id)) return '#007acc'
            return getNodeColor(d.type)
        })
        .attr('stroke-width', (d: any) => {
            return d.id === props.selectedNodeId ? 4 : 2
        })
        .attr('r', (d: any) => {
            const baseSize = d.size
            if (d.id === props.selectedNodeId) return baseSize * 1.2
            if (props.highlightedNodes.has(d.id)) return baseSize * 1.1
            return baseSize
        })

    nodeUpdate.select('text')
        .attr('fill', (d: any) => {
            if (d.id === props.selectedNodeId || props.highlightedNodes.has(d.id)) return '#fff'
            return '#333'
        })
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
    if (!svgSelection || !zoomBehavior.value || simulationNodes.value.length === 0) return

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

    const node = simulationNodes.value.find(n => n.id === nodeId)
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

// Get bounds of all nodes
const getBounds = () => {
    const nodes = simulationNodes.value.filter(n => n.x !== undefined && n.y !== undefined)
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

watch(() => [props.forceStrength, props.linkDistance, props.centerForce, props.collisionRadius], () => {
    initializeSimulation()
})

// Lifecycle
onMounted(() => {
    initializeD3()
    renderGraph()
})

onUnmounted(() => {
    if (simulation.value) {
        simulation.value.stop()
    }
})

// Expose public methods
defineExpose({
    zoomToFit,
    zoomToNode,
    resetZoom,
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
