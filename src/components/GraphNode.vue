<template>
    <g ref="nodeElement" :class="nodeClasses" :transform="`translate(${node.x || 0}, ${node.y || 0})`"
        @click="handleClick" @dblclick="handleDoubleClick" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave"
        @contextmenu="handleContextMenu" @keydown="handleKeyDown" @focus="handleFocus" @blur="handleBlur"
        @mousedown="handleMouseDown" :tabindex="0" role="button" :aria-label="`${node.type} node: ${node.key}`"
        :aria-selected="isSelected"
        :aria-expanded="node.type === 'object' || node.type === 'array' ? 'true' : undefined">

        <!-- Node background rectangle -->
        <rect :width="nodeWidth" :height="nodeHeight" :fill="nodeFill" :stroke="nodeStroke" :stroke-width="strokeWidth"
            :rx="4" :ry="4" class="node-background" />

        <!-- Node header -->
        <rect :width="nodeWidth" :height="headerHeight" :fill="headerFill" :stroke="nodeStroke"
            :stroke-width="strokeWidth" :rx="4" :ry="4" class="node-header" />

        <!-- Node header text -->
        <text :x="8" :y="headerHeight / 2" dominant-baseline="central" :font-size="headerFontSize"
            :fill="headerTextColor" class="node-header-text" font-weight="600">
            {{ nodeHeaderText }}
        </text>

        <!-- Node type badge -->
        <text :x="nodeWidth - 8" :y="headerHeight / 2" text-anchor="end" dominant-baseline="central"
            :font-size="typeFontSize" :fill="typeTextColor" class="node-type-badge">
            {{ nodeTypeText }}
        </text>

        <!-- Property rows -->
        <g v-for="(property, index) in node.properties" :key="`${property.key}-${index}`"
            :class="['property-row', { 'has-child': property.hasChildNode }]">

            <!-- Property background (for hover effects) -->
            <rect :x="0" :y="headerHeight + (index * propertyHeight)" :width="nodeWidth" :height="propertyHeight"
                :fill="getPropertyBgColor(property, index)" class="property-background" />

            <!-- Property key -->
            <text :x="8" :y="headerHeight + (index * propertyHeight) + (propertyHeight / 2)" dominant-baseline="central"
                :font-size="propertyFontSize" :fill="propertyKeyColor" class="property-key" font-weight="500">
                {{ formatPropertyKey(property.key) }}:
            </text>

            <!-- Property value -->
            <text :x="keyColumnWidth" :y="headerHeight + (index * propertyHeight) + (propertyHeight / 2)"
                dominant-baseline="central" :font-size="propertyFontSize" :fill="getPropertyValueColor(property)"
                class="property-value" :font-family="getPropertyValueFont(property)">
                {{ formatPropertyValue(property.value, property.type) }}
            </text>

            <!-- Connection point for child nodes -->
            <circle v-if="property.hasChildNode" :cx="nodeWidth"
                :cy="headerHeight + (index * propertyHeight) + (propertyHeight / 2)" :r="3" :fill="connectionPointColor"
                :stroke="nodeStroke" :stroke-width="1" class="connection-point" />
        </g>

        <!-- Tooltip -->
        <foreignObject v-if="showTooltip" :x="tooltipX" :y="tooltipY" :width="tooltipWidth" :height="tooltipHeight"
            class="tooltip-container">
            <div class="tooltip" xmlns="http://www.w3.org/1999/xhtml">
                <div class="tooltip-header">
                    <span class="tooltip-key">{{ node.key }}</span>
                    <span class="tooltip-type">{{ node.type.toUpperCase() }}</span>
                </div>
                <div class="tooltip-value">{{ tooltipValue }}</div>
                <div class="tooltip-path">{{ node.path.join('.') || 'root' }}</div>
                <div class="tooltip-properties">{{ node.properties.length }} properties</div>
            </div>
        </foreignObject>
    </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GraphNode, NodeProperty } from '@/types'
import { formatPropertyValue } from '@/utils/graph-builder'

interface Props {
    node: GraphNode
    isSelected?: boolean
    isHighlighted?: boolean
    showLabels?: boolean
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

// DOM reference
const nodeElement = ref<SVGGElement>()

// Drag state
let dragStartX = 0
let dragStartY = 0
let nodeStartX = 0
let nodeStartY = 0

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

// Node dimensions
const nodeWidth = computed(() => props.node.width || 150)
const nodeHeight = computed(() => props.node.height || 80)
const headerHeight = computed(() => 24)
const propertyHeight = computed(() => 20)
const keyColumnWidth = computed(() => nodeWidth.value * 0.4)

// Colors and styling
const typeColors = {
    object: '#4f46e5', // Indigo
    array: '#059669', // Emerald
    string: '#dc2626', // Red
    number: '#ea580c', // Orange
    boolean: '#7c3aed', // Violet
    null: '#6b7280', // Gray
}

const nodeFill = computed(() => {
    const baseColor = '#ffffff'
    if (props.isSelected) return '#f8fafc'
    if (props.isHighlighted) return '#f1f5f9'
    if (isHovered.value) return '#f8fafc'
    return baseColor
})

const headerFill = computed(() => {
    const baseColor = typeColors[props.node.type]
    if (props.isSelected) return baseColor
    if (props.isHighlighted) return baseColor + 'dd'
    if (isHovered.value) return baseColor + 'cc'
    return baseColor + '99'
})

const nodeStroke = computed(() => {
    if (props.isSelected) return typeColors[props.node.type]
    if (props.isHighlighted) return '#374151'
    if (isHovered.value) return '#4b5563'
    return '#d1d5db'
})

const strokeWidth = computed(() => {
    if (props.isSelected) return 2
    if (props.isHighlighted) return 2
    if (isHovered.value) return 1
    return 1
})

// Header styling
const nodeHeaderText = computed(() => {
    const key = String(props.node.key)
    return key.length > 15 ? key.substring(0, 15) + '...' : key
})

const nodeTypeText = computed(() => {
    const typeLabels = {
        object: 'OBJ',
        array: 'ARR',
        string: 'STR',
        number: 'NUM',
        boolean: 'BOOL',
        null: 'NULL',
    }
    return typeLabels[props.node.type]
})

const headerFontSize = computed(() => 12)
const typeFontSize = computed(() => 10)
const propertyFontSize = computed(() => 11)

const headerTextColor = computed(() => {
    return props.isSelected || isHovered.value ? '#ffffff' : '#f9fafb'
})

const typeTextColor = computed(() => {
    return props.isSelected || isHovered.value ? '#ffffff' : '#e5e7eb'
})

const propertyKeyColor = computed(() => '#374151')

const connectionPointColor = computed(() => typeColors[props.node.type])

// Helper functions
const formatPropertyKey = (key: string | number): string => {
    const keyStr = String(key)
    return keyStr.length > 12 ? keyStr.substring(0, 12) + '...' : keyStr
}

const getPropertyValueColor = (property: NodeProperty): string => {
    if (property.hasChildNode) return '#6b7280'

    const colors = {
        string: '#dc2626',
        number: '#ea580c',
        boolean: '#7c3aed',
        null: '#6b7280',
        object: '#4f46e5',
        array: '#059669',
    }
    return colors[property.type]
}

const getPropertyValueFont = (property: NodeProperty): string => {
    return property.type === 'string' || property.type === 'number' ? 'Monaco, Consolas, monospace' : 'system-ui, sans-serif'
}

const getPropertyBgColor = (property: NodeProperty, index: number): string => {
    if (isHovered.value && hoveredPropertyIndex.value === index) {
        return '#f3f4f6'
    }
    return 'transparent'
}

// Tooltip properties
const tooltipX = computed(() => nodeWidth.value + 10)
const tooltipY = computed(() => -10)
const tooltipWidth = computed(() => 220)
const tooltipHeight = computed(() => 100)

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

// Property hover state
const hoveredPropertyIndex = ref<number | null>(null)

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

const handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return // Only left mouse button

    isDragging.value = true
    showTooltip.value = false

    // Store initial positions
    dragStartX = event.clientX
    dragStartY = event.clientY
    nodeStartX = props.node.x || 0
    nodeStartY = props.node.y || 0

    emit('dragStart', props.node)

    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    event.preventDefault()
}

const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging.value) return

    const deltaX = event.clientX - dragStartX
    const deltaY = event.clientY - dragStartY

    // Update node position
    const newX = nodeStartX + deltaX
    const newY = nodeStartY + deltaY

    // Create a new node object to avoid prop mutation
    const updatedNode = { ...props.node, x: newX, y: newY }
    emit('drag', updatedNode)
}

const handleMouseUp = () => {
    if (!isDragging.value) return

    isDragging.value = false

    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)

    emit('dragEnd', props.node)
}
</script>

<style scoped>
.graph-node {
    cursor: pointer;
    transition: all 0.2s ease;
}

.graph-node:hover {
    filter: brightness(1.02);
}

.node-background {
    transition: all 0.2s ease;
}

.node-header {
    transition: all 0.2s ease;
}

.node-header-text {
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
    user-select: none;
}

.node-type-badge {
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 600;
    user-select: none;
}

.property-row {
    transition: all 0.1s ease;
}

.property-background {
    transition: all 0.1s ease;
}

.property-key {
    pointer-events: none;
    font-family: system-ui, -apple-system, sans-serif;
    user-select: none;
}

.property-value {
    pointer-events: none;
    user-select: none;
}

.connection-point {
    transition: all 0.2s ease;
}

.property-row.has-child .connection-point {
    opacity: 0.8;
}

.property-row.has-child:hover .connection-point {
    opacity: 1;
    transform: scale(1.2);
}

.node-selected .node-background {
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
}

.node-selected .node-header {
    filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.1));
}

.node-highlighted .node-background {
    filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.1));
}

.node-dragging {
    cursor: grabbing;
}

.node-dragging .node-background {
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
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

/* Type-specific styling */
.node-type-object .node-header {
    /* Object nodes have solid headers */
}

.node-type-array .node-header {
    /* Array nodes have slightly different styling */
    opacity: 0.95;
}

.node-type-string .node-background,
.node-type-number .node-background,
.node-type-boolean .node-background {
    /* Primitive nodes have simpler styling */
}

.node-type-null .node-background {
    opacity: 0.8;
}

.node-type-null .node-header {
    opacity: 0.7;
}

/* Responsive adjustments */
@media (max-width: 768px) {

    .node-header-text,
    .property-key,
    .property-value {
        font-size: 10px;
    }

    .node-type-badge {
        font-size: 9px;
    }
}
</style>
