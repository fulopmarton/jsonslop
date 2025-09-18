<template>
    <div class="graph-controls" :class="{ 'controls-expanded': isExpanded }">
        <!-- Toggle Button -->
        <button class="controls-toggle" @click="toggleExpanded"
            :aria-label="isExpanded ? 'Collapse controls' : 'Expand controls'" :aria-expanded="isExpanded">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4l-4 4h8l-4-4z" :class="{ 'rotated': isExpanded }" />
            </svg>
        </button>

        <!-- Controls Panel -->
        <div class="controls-panel" v-show="isExpanded">
            <!-- Zoom Controls -->
            <div class="control-group">
                <h4 class="control-title">Zoom</h4>
                <div class="control-buttons">
                    <button class="control-btn" @click="handleZoomIn" :disabled="zoomLevel >= maxZoom" title="Zoom In"
                        aria-label="Zoom in">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" fill="none" />
                        </svg>
                    </button>
                    <button class="control-btn" @click="handleZoomOut" :disabled="zoomLevel <= minZoom" title="Zoom Out"
                        aria-label="Zoom out">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 8h12" stroke="currentColor" stroke-width="2" fill="none" />
                        </svg>
                    </button>
                    <button class="control-btn" @click="handleZoomToFit" title="Zoom to Fit"
                        aria-label="Zoom to fit all nodes">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 2h4v4H2V2zm8 0h4v4h-4V2zM2 10h4v4H2v-4zm8 0h4v4h-4v-4z" />
                        </svg>
                    </button>
                    <button class="control-btn" @click="handleResetZoom" title="Reset Zoom"
                        aria-label="Reset zoom to default">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4v4H4l4 4 4-4H9V4H7z" />
                        </svg>
                    </button>
                </div>
                <div class="zoom-info">
                    <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
                </div>
            </div>

            <!-- Layout Controls -->
            <div class="control-group">
                <h4 class="control-title">Layout</h4>
                <div class="layout-selector">
                    <label class="layout-option">
                        <input type="radio" name="layout" value="force" :checked="layoutType === 'force'"
                            @change="handleLayoutChange('force')" />
                        <span class="layout-label">Force-Directed</span>
                    </label>
                    <label class="layout-option">
                        <input type="radio" name="layout" value="hierarchical" :checked="layoutType === 'hierarchical'"
                            @change="handleLayoutChange('hierarchical')" />
                        <span class="layout-label">Hierarchical</span>
                    </label>
                    <label class="layout-option">
                        <input type="radio" name="layout" value="tree" :checked="layoutType === 'tree'"
                            @change="handleLayoutChange('tree')" />
                        <span class="layout-label">Tree</span>
                    </label>
                </div>
                <button class="control-btn restart-btn" @click="handleRestartLayout" title="Restart Layout"
                    aria-label="Restart layout simulation">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z" />
                        <path
                            d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z" />
                    </svg>
                    Restart
                </button>
            </div>

            <!-- Minimap -->
            <div class="control-group" v-if="showMinimap">
                <h4 class="control-title">Minimap</h4>
                <div class="minimap-container">
                    <svg ref="minimapRef" class="minimap" :width="minimapWidth" :height="minimapHeight"
                        @click="handleMinimapClick">
                        <!-- Minimap background -->
                        <rect class="minimap-background" :width="minimapWidth" :height="minimapHeight" fill="#f8f9fa"
                            stroke="#dee2e6" />

                        <!-- Minimap nodes -->
                        <g class="minimap-nodes">
                            <circle v-for="node in visibleNodes" :key="node.id" :cx="getMinimapX(node.x || 0)"
                                :cy="getMinimapY(node.y || 0)" :r="getMinimapNodeSize(node)"
                                :fill="getMinimapNodeColor(node)" :opacity="isNodeHighlighted(node.id) ? 1 : 0.7" />
                        </g>

                        <!-- Viewport indicator -->
                        <rect class="viewport-indicator" :x="viewportX" :y="viewportY" :width="viewportWidth"
                            :height="viewportHeight" fill="none" stroke="#007acc" stroke-width="2" opacity="0.8" />
                    </svg>
                </div>
            </div>

            <!-- Performance Monitor -->
            <div class="control-group" v-if="showPerformanceMonitor">
                <h4 class="control-title">Performance</h4>
                <div class="performance-stats">
                    <div class="stat-item">
                        <span class="stat-label">Nodes:</span>
                        <span class="stat-value">{{ nodeCount }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Links:</span>
                        <span class="stat-value">{{ linkCount }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">FPS:</span>
                        <span class="stat-value" :class="getFrameRateClass(frameRate)">
                            {{ Math.round(frameRate) }}
                        </span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Iterations:</span>
                        <span class="stat-value">{{ iterations }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Status:</span>
                        <span class="stat-value" :class="getSimulationStatusClass(isConverged)">
                            {{ isConverged ? 'Converged' : 'Running' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { GraphNode, GraphLink, LayoutType, LayoutStats } from '@/types'

// Props
interface Props {
    layoutType: LayoutType
    zoomLevel: number
    nodes: GraphNode[]
    links: GraphLink[]
    canvasWidth: number
    canvasHeight: number
    highlightedNodes?: Set<string>
    layoutStats?: LayoutStats
    showMinimap?: boolean
    showPerformanceMonitor?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    highlightedNodes: () => new Set(),
    layoutStats: () => ({
        iterations: 0,
        alpha: 1,
        isConverged: false,
        averageVelocity: 0,
        maxVelocity: 0,
        frameRate: 0,
        lastTickTime: 0,
    }),
    showMinimap: true,
    showPerformanceMonitor: true,
})

// Emits
interface Emits {
    zoomIn: []
    zoomOut: []
    zoomToFit: []
    resetZoom: []
    layoutChange: [layoutType: LayoutType]
    restartLayout: []
    minimapClick: [x: number, y: number]
}

const emit = defineEmits<Emits>()

// State
const isExpanded = ref(false)
const minimapRef = ref<SVGSVGElement>()

// Constants
const minZoom = 0.1
const maxZoom = 10
const minimapWidth = 120
const minimapHeight = 80

// Computed properties
const nodeCount = computed(() => props.nodes.length)
const linkCount = computed(() => props.links.length)
const frameRate = computed(() => props.layoutStats.frameRate)
const iterations = computed(() => props.layoutStats.iterations)
const isConverged = computed(() => props.layoutStats.isConverged)

// Visible nodes for minimap (filter out nodes without positions)
const visibleNodes = computed(() =>
    props.nodes.filter(node => node.x !== undefined && node.y !== undefined)
)

// Minimap scaling
const minimapScaleX = computed(() => {
    if (props.canvasWidth === 0) return 1
    return minimapWidth / props.canvasWidth
})

const minimapScaleY = computed(() => {
    if (props.canvasHeight === 0) return 1
    return minimapHeight / props.canvasHeight
})

// Viewport indicator for minimap
const viewportX = computed(() => {
    // This would be calculated based on current zoom transform
    // For now, showing center viewport
    return (minimapWidth - viewportWidth.value) / 2
})

const viewportY = computed(() => {
    return (minimapHeight - viewportHeight.value) / 2
})

const viewportWidth = computed(() => {
    return Math.min(minimapWidth, minimapWidth / props.zoomLevel)
})

const viewportHeight = computed(() => {
    return Math.min(minimapHeight, minimapHeight / props.zoomLevel)
})

// Methods
const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value
}

const handleZoomIn = () => {
    emit('zoomIn')
}

const handleZoomOut = () => {
    emit('zoomOut')
}

const handleZoomToFit = () => {
    emit('zoomToFit')
}

const handleResetZoom = () => {
    emit('resetZoom')
}

const handleLayoutChange = (newLayout: LayoutType) => {
    emit('layoutChange', newLayout)
}

const handleRestartLayout = () => {
    emit('restartLayout')
}

const handleMinimapClick = (event: MouseEvent) => {
    if (!minimapRef.value) return

    const rect = minimapRef.value.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Convert minimap coordinates to canvas coordinates
    const canvasX = x / minimapScaleX.value
    const canvasY = y / minimapScaleY.value

    emit('minimapClick', canvasX, canvasY)
}

// Minimap helper functions
const getMinimapX = (x: number): number => {
    return x * minimapScaleX.value
}

const getMinimapY = (y: number): number => {
    return y * minimapScaleY.value
}

const getMinimapNodeSize = (node: GraphNode): number => {
    const baseSize = Math.max(1, (node.size || 20) * Math.min(minimapScaleX.value, minimapScaleY.value))
    return Math.min(baseSize, 3) // Cap at 3px for readability
}

const getMinimapNodeColor = (node: GraphNode): string => {
    const colors = {
        object: '#4CAF50',
        array: '#2196F3',
        string: '#FF9800',
        number: '#9C27B0',
        boolean: '#F44336',
        null: '#607D8B'
    }
    return colors[node.type] || '#666'
}

const isNodeHighlighted = (nodeId: string): boolean => {
    return props.highlightedNodes.has(nodeId)
}

// Performance indicator classes
const getFrameRateClass = (fps: number): string => {
    if (fps >= 50) return 'fps-good'
    if (fps >= 30) return 'fps-ok'
    return 'fps-poor'
}

const getSimulationStatusClass = (converged: boolean): string => {
    return converged ? 'status-converged' : 'status-running'
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
    if (!isExpanded.value) return

    switch (event.key) {
        case '+':
        case '=':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault()
                handleZoomIn()
            }
            break
        case '-':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault()
                handleZoomOut()
            }
            break
        case '0':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault()
                handleResetZoom()
            }
            break
        case 'f':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault()
                handleZoomToFit()
            }
            break
        case 'r':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault()
                handleRestartLayout()
            }
            break
    }
}

// Lifecycle
onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
})

// Auto-collapse on mobile
watch(() => props.canvasWidth, (newWidth) => {
    if (newWidth < 768) {
        isExpanded.value = false
    }
})
</script>

<style scoped>
.graph-controls {
    position: absolute;
    top: 16px;
    right: 16px;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 200px;
    max-width: 280px;
}

.controls-toggle {
    width: 100%;
    padding: 12px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #495057;
    transition: all 0.2s ease;
}

.controls-toggle:hover {
    background: #f8f9fa;
    color: #007acc;
}

.controls-toggle svg path {
    transition: transform 0.2s ease;
}

.controls-toggle svg path.rotated {
    transform: rotate(180deg);
    transform-origin: center;
}

.controls-panel {
    border-top: 1px solid #dee2e6;
    padding: 16px;
    max-height: 400px;
    overflow-y: auto;
}

.control-group {
    margin-bottom: 20px;
}

.control-group:last-child {
    margin-bottom: 0;
}

.control-title {
    font-size: 14px;
    font-weight: 600;
    color: #495057;
    margin: 0 0 8px 0;
}

.control-buttons {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
}

.control-btn {
    padding: 8px;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    cursor: pointer;
    color: #495057;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.control-btn:hover:not(:disabled) {
    background: #e9ecef;
    border-color: #adb5bd;
    color: #007acc;
}

.control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.restart-btn {
    width: 100%;
    gap: 6px;
    font-size: 12px;
    margin-top: 8px;
}

.zoom-info {
    text-align: center;
}

.zoom-level {
    font-size: 12px;
    color: #6c757d;
    font-weight: 500;
}

.layout-selector {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.layout-option {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 0;
}

.layout-option input[type="radio"] {
    margin: 0;
}

.layout-label {
    font-size: 13px;
    color: #495057;
}

.minimap-container {
    border: 1px solid #dee2e6;
    border-radius: 4px;
    overflow: hidden;
}

.minimap {
    display: block;
    cursor: pointer;
}

.minimap-background {
    transition: fill 0.2s ease;
}

.minimap:hover .minimap-background {
    fill: #f1f3f4;
}

.viewport-indicator {
    pointer-events: none;
}

.performance-stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
}

.stat-label {
    color: #6c757d;
}

.stat-value {
    font-weight: 500;
    color: #495057;
}

.fps-good {
    color: #28a745;
}

.fps-ok {
    color: #ffc107;
}

.fps-poor {
    color: #dc3545;
}

.status-converged {
    color: #28a745;
}

.status-running {
    color: #007acc;
}

/* Responsive design */
@media (max-width: 768px) {
    .graph-controls {
        top: 8px;
        right: 8px;
        min-width: 160px;
        max-width: 200px;
    }

    .controls-panel {
        padding: 12px;
        max-height: 300px;
    }

    .control-title {
        font-size: 13px;
    }

    .layout-label {
        font-size: 12px;
    }

    .minimap {
        width: 100px;
        height: 66px;
    }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    .graph-controls {
        background: #2d3748;
        border-color: #4a5568;
        color: #e2e8f0;
    }

    .controls-toggle {
        color: #e2e8f0;
    }

    .controls-toggle:hover {
        background: #4a5568;
        color: #63b3ed;
    }

    .controls-panel {
        border-color: #4a5568;
    }

    .control-title {
        color: #e2e8f0;
    }

    .control-btn {
        background: #4a5568;
        border-color: #718096;
        color: #e2e8f0;
    }

    .control-btn:hover:not(:disabled) {
        background: #718096;
        border-color: #a0aec0;
        color: #63b3ed;
    }

    .layout-label {
        color: #e2e8f0;
    }

    .stat-label {
        color: #a0aec0;
    }

    .stat-value {
        color: #e2e8f0;
    }

    .minimap-background {
        fill: #4a5568;
        stroke: #718096;
    }

    .minimap:hover .minimap-background {
        fill: #2d3748;
    }
}
</style>
