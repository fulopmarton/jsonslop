<template>
    <g ref="nodeElement" :class="nodeClasses" :transform="`translate(${node.x || 0}, ${node.y || 0})`"
        @click="handleClick" @dblclick="handleDoubleClick" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave"
        @contextmenu="handleContextMenu" @keydown="handleKeyDown" @focus="handleFocus" @blur="handleBlur" :tabindex="0"
        role="button" :aria-label="`${node.type} node: ${node.key}`" :aria-selected="isSelected"
        :aria-expanded="node.type === 'object' || node.type === 'array' ? 'true' : undefined">
        <!-- Node background circle -->
        <circle :r="nodeRadius" :fill="nodeFill" :stroke="nodeStroke" :stroke-width="strokeWidth"
            class="node-background" />

        <!-- Node icon/symbol based on type -->
        <text :font-size="iconSize" text-anchor="middle" dominant-baseline="central" :fill="iconColor" class="node-icon"
            dy="0.1em">
            {{ nodeIcon }}
        </text>

        <!-- Node label -->
        <text v-if="showLabel" :x="0" :y="nodeRadius + 16" text-anchor="middle" :font-size="labelFontSize"
            :fill="labelColor" class="node-label">
            {{ nodeLabel }}
        </text>

        <!-- Tooltip -->
        <foreignObject v-if="showTooltip" :x="tooltipX" :y="tooltipY" :width="tooltipWidth" :height="tooltipHeight"
            class="tooltip-container">
            <div class="tooltip" xmlns="http://www.w3.org/1999/xhtml">
                <div class="tooltip-header">
                    <span class="tooltip-key">{{ node.key }}</span>
                    <span class="tooltip-type">{{ node.type }}</span>
                </div>
                <div class="tooltip-value">{{ tooltipValue }}</div>
                <div class="tooltip-path">{{ node.path.join('.') || 'root' }}</div>
            </div>
        </foreignObject>
    </g>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { select, drag, type D3Selection, type D3DragBehavior } from '@/utils/d3-imports'
import type { GraphNode } from '@/types'

// D3 drag event type
interface D3DragEvent {
    x: number
    y: number
    active: number
}

interface Props {
    node: GraphNode
    isSelected?: boolean
    isHighlighted?: boolean
    showLabels?: boolean
    simulation?: any // D3 simulation instance
}

interface Emits {
    (e: 'click', node: GraphNode, event: MouseEvent): void
    (e: 'doubleClick', node: GraphNode, event: MouseEvent): void
    (e: 'contextMenu', node: GraphNode, event: MouseEvent): void
    (e: 'dragStart', node: GraphNode): void
    (e: 'drag', node: GraphNode): void
    (e: 'dragEnd', node: GraphNode): void
    (e: 'focus', node: GraphNode): void
    (e: 'blur', node: GraphNode): void
}

const props = withDefaults(defineProps<Props>(), {
    isSelected: false,
    isHighlighted: false,
    showLabels: true,
})

const emit = defineEmits<Emits>()

// Reactive state
const isHovered = ref(false)
const showTooltip = ref(false)
const isDragging = ref(false)
const isFocused = ref(false)

// DOM reference for D3 integration
const nodeElement = ref<SVGGElement>()

// Computed properties for styling
const nodeClasses = computed(() => [
    'graph-node',
    `node-type-${props.node.type}`,
    {
        'node-selected': props.isSelected,
        'node-highlighted': props.isHighlighted,
        'node-hovered': isHovered.value,
        'node-dragging': isDragging.value,
        'node-focused': isFocused.value,
    },
])

const nodeRadius = computed(() => {
    const baseRadius = Math.max(8, Math.min(props.node.size, 30))
    const selectedBonus = props.isSelected ? 4 : 0
    const hoveredBonus = isHovered.value ? 2 : 0
    return baseRadius + selectedBonus + hoveredBonus
})

const nodeFill = computed(() => {
    const typeColors = {
        object: '#4f46e5', // Indigo
        array: '#059669', // Emerald
        string: '#dc2626', // Red
        number: '#ea580c', // Orange
        boolean: '#7c3aed', // Violet
        null: '#6b7280', // Gray
    }

    const baseColor = typeColors[props.node.type]

    if (props.isSelected) {
        return baseColor
    }

    if (props.isHighlighted) {
        return baseColor + 'dd' // Add transparency
    }

    if (isHovered.value) {
        return baseColor + 'cc'
    }

    return baseColor + '99'
})

const nodeStroke = computed(() => {
    if (props.isSelected) return '#1f2937'
    if (props.isHighlighted) return '#374151'
    if (isHovered.value) return '#4b5563'
    return '#6b7280'
})

const strokeWidth = computed(() => {
    if (props.isSelected) return 3
    if (props.isHighlighted) return 2
    if (isHovered.value) return 2
    return 1
})

const nodeIcon = computed(() => {
    const icons = {
        object: '{}',
        array: '[]',
        string: '"',
        number: '#',
        boolean: '?',
        null: '∅',
    }
    return icons[props.node.type]
})

const iconSize = computed(() => {
    return Math.max(10, nodeRadius.value * 0.6)
})

const iconColor = computed(() => {
    return props.isSelected || isHovered.value ? '#ffffff' : '#f9fafb'
})

const showLabel = computed(() => {
    return props.showLabels && !isDragging.value
})

const nodeLabel = computed(() => {
    const key = String(props.node.key)
    return key.length > 12 ? key.substring(0, 12) + '...' : key
})

const labelFontSize = computed(() => {
    return Math.max(10, nodeRadius.value * 0.4)
})

const labelColor = computed(() => {
    return props.isSelected || props.isHighlighted ? '#1f2937' : '#4b5563'
})

// Tooltip properties
const tooltipX = computed(() => nodeRadius.value + 10)
const tooltipY = computed(() => -nodeRadius.value - 10)
const tooltipWidth = computed(() => 200)
const tooltipHeight = computed(() => 80)

const tooltipValue = computed(() => {
    const value = props.node.value
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

// Event handlers
const handleClick = (event: MouseEvent) => {
    event.stopPropagation()
    emit('click', props.node, event)
}

const handleDoubleClick = (event: MouseEvent) => {
    event.stopPropagation()
    emit('doubleClick', props.node, event)
}

const handleMouseEnter = () => {
    isHovered.value = true
    showTooltip.value = true
}

const handleMouseLeave = () => {
    isHovered.value = false
    showTooltip.value = false
}

const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    emit('contextMenu', props.node, event)
}

const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
        case 'Enter':
        case ' ':
            event.preventDefault()
            handleClick(event as unknown as MouseEvent)
            break
        case 'Escape':
            event.preventDefault()
            if (nodeElement.value) {
                nodeElement.value.blur()
            }
            break
    }
}

const handleFocus = () => {
    isFocused.value = true
    emit('focus', props.node)
}

const handleBlur = () => {
    isFocused.value = false
    emit('blur', props.node)
}

// D3 drag behavior setup
const setupDragBehavior = () => {
    if (!nodeElement.value || !props.simulation) return

    const dragBehavior = drag()
        .on('start', (event: D3DragEvent) => {
            isDragging.value = true
            showTooltip.value = false
            emit('dragStart', props.node)

            if (!event.active) {
                props.simulation.alphaTarget(0.3).restart()
            }

            // Fix the node position
            props.node.fx = props.node.x
            props.node.fy = props.node.y
        })
        .on('drag', (event: D3DragEvent) => {
            // Update node position
            props.node.fx = event.x
            props.node.fy = event.y
            emit('drag', props.node)
        })
        .on('end', (event: D3DragEvent) => {
            isDragging.value = false
            emit('dragEnd', props.node)

            if (!event.active) {
                props.simulation.alphaTarget(0)
            }

            // Release the fixed position (allow simulation to take over)
            props.node.fx = undefined
            props.node.fy = undefined
        })

    // Apply drag behavior to the node element
    select(nodeElement.value).call(dragBehavior)
}

// Lifecycle hooks
onMounted(() => {
    if (props.simulation) {
        setupDragBehavior()
    }
})

onUnmounted(() => {
    // Clean up D3 event listeners
    if (nodeElement.value) {
        select(nodeElement.value).on('.drag', null)
    }
})
</script>

<style scoped>
.graph-node {
    cursor: pointer;
    transition: all 0.2s ease;
}

.graph-node:hover {
    filter: brightness(1.1);
}

.node-background {
    transition: all 0.2s ease;
}

.node-icon {
    pointer-events: none;
    font-family: 'Courier New', monospace;
    font-weight: bold;
}

.node-label {
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 11px;
    font-weight: 500;
}

.node-selected .node-background {
    filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.3));
}

.node-highlighted .node-background {
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.2));
}

.node-dragging {
    cursor: grabbing;
}

.node-dragging .node-background {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.node-focused {
    outline: 2px solid #007acc;
    outline-offset: 2px;
}

.node-focused .node-background {
    filter: drop-shadow(0 0 6px rgba(0, 122, 204, 0.4));
}

/* Tooltip styles */
.tooltip-container {
    pointer-events: none;
    z-index: 1000;
}

.tooltip {
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 180px;
    word-wrap: break-word;
}

.tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-weight: 600;
}

.tooltip-key {
    color: #fbbf24;
    font-family: 'Courier New', monospace;
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
    font-family: 'Courier New', monospace;
    font-size: 11px;
}

.tooltip-path {
    color: #9ca3af;
    font-size: 10px;
    font-style: italic;
}

/* Type-specific styling */
.node-type-object .node-background {
    stroke-dasharray: none;
}

.node-type-array .node-background {
    stroke-dasharray: 3, 2;
}

.node-type-string .node-background {
    stroke-dasharray: none;
}

.node-type-number .node-background {
    stroke-dasharray: none;
}

.node-type-boolean .node-background {
    stroke-dasharray: 1, 1;
}

.node-type-null .node-background {
    stroke-dasharray: 5, 5;
    opacity: 0.7;
}
</style>
