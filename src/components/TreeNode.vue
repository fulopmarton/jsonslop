<template>
  <div :class="[
    'tree-node',
    'flex',
    'items-start',
    'py-1',
    'px-2',
    'rounded',
    'transition-all',
    'duration-200',
    'hover:bg-gray-50',
    'dark:hover:bg-gray-800',
    {
      'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-400': isSelected,
      'bg-yellow-50 dark:bg-yellow-900/20': isHighlighted,
    },
  ]" :style="{ paddingLeft: `${depth * 20 + 8}px` }" @click="handleNodeClick" @mouseenter="isHovered = true"
    @mouseleave="isHovered = false">
    <!-- Expand/Collapse Button -->
    <button v-if="node.isExpandable" :class="[
      'expand-button',
      'flex',
      'items-center',
      'justify-center',
      'w-4',
      'h-4',
      'mr-2',
      'mt-0.5',
      'text-gray-500',
      'hover:text-gray-700',
      'dark:text-gray-400',
      'dark:hover:text-gray-200',
      'transition-transform',
      'duration-200',
      {
        'rotate-90': isExpanded,
      },
    ]" @click.stop="toggleExpansion" :aria-label="isExpanded ? 'Collapse' : 'Expand'">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </button>

    <!-- Non-expandable spacer -->
    <div v-else class="w-4 h-4 mr-2 mt-0.5"></div>

    <!-- Node Content -->
    <div class="flex-1 min-w-0">
      <!-- Key -->
      <span :class="[
        'node-key',
        'font-medium',
        'text-gray-700',
        'dark:text-gray-300',
        'cursor-pointer',
        'hover:text-blue-600',
        'dark:hover:text-blue-400',
      ]" @click.stop="copyToClipboard(String(node.key))" :title="`Copy key: ${node.key}`">
        {{ formatKey(node.key) }}
      </span>

      <!-- Separator -->
      <span class="text-gray-500 dark:text-gray-400 mx-1">:</span>

      <!-- Value -->
      <span v-if="!node.isExpandable" :class="[
        'node-value',
        'cursor-pointer',
        'hover:bg-gray-100',
        'dark:hover:bg-gray-700',
        'px-1',
        'rounded',
        getValueTypeClass(node.type),
      ]" @click.stop="copyToClipboard(formatValue(node.value))" :title="`Copy value: ${formatValue(node.value)}`">
        {{ formatValue(node.value) }}
      </span>

      <!-- Expandable indicator -->
      <span v-else :class="[
        'expandable-indicator',
        'text-gray-500',
        'dark:text-gray-400',
        'font-mono',
        'text-sm',
      ]">
        {{ getExpandableIndicator() }}
      </span>

      <!-- Copy button (visible on hover) -->
      <button v-if="isHovered" :class="[
        'copy-button',
        'ml-2',
        'p-1',
        'text-gray-400',
        'hover:text-gray-600',
        'dark:text-gray-500',
        'dark:hover:text-gray-300',
        'transition-colors',
        'duration-200',
      ]" @click.stop="copyNodeData" :title="'Copy ' + (node.isExpandable ? 'subtree' : 'value')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H14C15.1046 21 16 20.1046 16 19V18M8 5C8 3.89543 8.89543 3 10 3H18C19.1046 3 20 3.89543 20 5V15C20 16.1046 19.1046 17 18 17H16M8 5V7C8 8.10457 8.89543 9 10 9H16"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Children (when expanded) -->
  <div v-if="node.isExpandable && isExpanded && node.children" class="children">
    <TreeNode v-for="child in node.children" :key="getChildKey(child)" :node="child" :depth="depth + 1"
      :is-expanded="isChildExpanded(child)" :is-selected="isChildSelected(child)"
      :is-highlighted="isChildHighlighted(child)" @toggle-expansion="$emit('toggle-expansion', $event)"
      @node-select="$emit('node-select', $event)" @copy-success="$emit('copy-success', $event)" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useJsonStore } from '@/stores/json'
import type { JSONNode } from '@/types'

interface Props {
  node: JSONNode
  depth?: number
  isExpanded?: boolean
  isSelected?: boolean
  isHighlighted?: boolean
}

interface Emits {
  (e: 'toggle-expansion', nodePath: string): void
  (e: 'node-select', nodePath: string): void
  (e: 'copy-success', message: string): void
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  isExpanded: false,
  isSelected: false,
  isHighlighted: false,
})

const emit = defineEmits<Emits>()

// Store
const jsonStore = useJsonStore()

// Local state
const isHovered = ref(false)

// Computed properties
const nodePath = computed(() => props.node.path.join('.'))

// Methods
const toggleExpansion = () => {
  if (props.node.isExpandable) {
    emit('toggle-expansion', nodePath.value)
  }
}

const handleNodeClick = () => {
  emit('node-select', nodePath.value)
}

const isChildExpanded = (child: JSONNode): boolean => {
  const childPath = child.path.join('.')
  return jsonStore.isNodeExpanded(childPath)
}

const isChildSelected = (child: JSONNode): boolean => {
  const childPath = child.path.join('.')
  return jsonStore.isNodeSelected(childPath)
}

const isChildHighlighted = (child: JSONNode): boolean => {
  const childPath = child.path.join('.')
  return jsonStore.isNodeInSearchResults(childPath)
}

const getChildKey = (child: JSONNode): string => {
  return child.path.join('.')
}

const formatKey = (key: string | number): string => {
  if (typeof key === 'number') {
    return `[${key}]`
  }
  return `"${key}"`
}

const formatValue = (value: unknown): string => {
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  return String(value)
}

const getValueTypeClass = (type: JSONNode['type']): string => {
  const baseClasses = 'font-mono text-sm'

  switch (type) {
    case 'string':
      return `${baseClasses} text-green-600 dark:text-green-400`
    case 'number':
      return `${baseClasses} text-blue-600 dark:text-blue-400`
    case 'boolean':
      return `${baseClasses} text-purple-600 dark:text-purple-400`
    case 'null':
      return `${baseClasses} text-gray-500 dark:text-gray-400 italic`
    default:
      return `${baseClasses} text-gray-700 dark:text-gray-300`
  }
}

const getExpandableIndicator = (): string => {
  if (props.node.type === 'array') {
    const length = props.node.children?.length || 0
    return `Array(${length})`
  }
  if (props.node.type === 'object') {
    const length = props.node.children?.length || 0
    return `Object{${length}}`
  }
  return ''
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    emit('copy-success', `Copied: ${text}`)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    // Fallback for older browsers
    fallbackCopyToClipboard(text)
  }
}

const copyNodeData = async () => {
  try {
    let textToCopy: string

    if (props.node.isExpandable) {
      // Copy the entire subtree as JSON
      textToCopy = JSON.stringify(props.node.value, null, 2)
    } else {
      // Copy just the value
      textToCopy = formatValue(props.node.value)
    }

    await copyToClipboard(textToCopy)
  } catch (error) {
    console.error('Failed to copy node data:', error)
  }
}

const fallbackCopyToClipboard = (text: string) => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-999999px'
  textArea.style.top = '-999999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    document.execCommand('copy')
    emit('copy-success', `Copied: ${text}`)
  } catch (error) {
    console.error('Fallback copy failed:', error)
  } finally {
    document.body.removeChild(textArea)
  }
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.node-key,
.node-value {
  word-break: break-all;
}

.expand-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.copy-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>
