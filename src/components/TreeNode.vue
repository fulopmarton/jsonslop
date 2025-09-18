<template>
  <div ref="nodeRef" :class="[
    'tree-node',
    'relative',
    'flex',
    'items-start',
    'py-2',
    'px-3',
    'rounded-md',
    'tree-node-hover',
    'focus:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-blue-500',
    'focus-visible:ring-opacity-50',
    {
      'tree-node-selected': isSelected,
      'tree-node-highlighted': isHighlighted,
    },
  ]" :style="{ paddingLeft: `${depth * 24 + 12}px` }" :tabindex="isSelected ? 0 : -1" @click="handleNodeClick"
    @contextmenu="handleContextMenu" @mouseenter="isHovered = true" @mouseleave="isHovered = false"
    @keydown="handleKeyDown">
    <!-- Expand/Collapse Button -->
    <button v-if="node.isExpandable" :class="[
      'expand-button',
      'flex',
      'items-center',
      'justify-center',
      'w-5',
      'h-5',
      'mr-3',
      'mt-0.5',
      'rounded-md',
      'transition-all',
      'duration-200',
      'hover:bg-gray-200',
      'dark:hover:bg-gray-600',
      'focus:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-blue-500',
      'focus-visible:ring-opacity-50',
      {
        'rotate-90': isExpanded,
        'text-blue-600 dark:text-blue-400': isExpanded,
        'text-gray-500 dark:text-gray-400': !isExpanded,
      },
    ]" @click.stop="toggleExpansion" :aria-label="isExpanded ? 'Collapse' : 'Expand'" :aria-expanded="isExpanded">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </button>

    <!-- Non-expandable spacer -->
    <div v-else class="w-5 h-5 mr-3 mt-0.5"></div>

    <!-- Node Content -->
    <div class="flex-1 min-w-0">
      <!-- Key -->
      <span :class="[
        'node-key',
        'json-key',
        'cursor-pointer',
        'focus:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-blue-500',
        'focus-visible:ring-opacity-50',
        'rounded-md',
        'px-2',
        'py-1',
        '-mx-1',
        'hover:bg-gray-100',
        'dark:hover:bg-gray-700',
      ]" tabindex="0" @click.stop="copyKey" @keydown.enter.stop="copyKey" @keydown.space.stop="copyKey"
        :title="`Copy key: ${node.key}`" :aria-label="`Key: ${formatKey(node.key)}, press Enter to copy`">
        {{ formatKey(node.key) }}
      </span>

      <!-- Separator -->
      <span class="text-gray-500 dark:text-gray-400 mx-2 font-medium">:</span>

      <!-- Value -->
      <span v-if="!node.isExpandable" :class="[
        'node-value',
        'cursor-pointer',
        'hover:bg-gray-100',
        'dark:hover:bg-gray-700',
        'px-2',
        'py-1',
        '-mx-1',
        'rounded-md',
        'focus:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-blue-500',
        'focus-visible:ring-opacity-50',
        'break-all',
        getValueTypeClass(node.type),
      ]" tabindex="0" @click.stop="copyValue" @keydown.enter.stop="copyValue" @keydown.space.stop="copyValue"
        :title="`Copy value: ${formatValue(node.value)}`"
        :aria-label="`Value: ${formatValue(node.value)}, press Enter to copy`">
        {{ formatValue(node.value) }}
      </span>

      <!-- Expandable indicator -->
      <span v-else :class="[
        'expandable-indicator',
        'text-gray-500',
        'dark:text-gray-400',
        'font-mono',
        'text-sm',
        'font-medium',
        'px-2',
        'py-1',
        'bg-gray-100',
        'dark:bg-gray-700',
        'rounded-md',
        'border',
        'border-gray-200',
        'dark:border-gray-600',
      ]">
        {{ getExpandableIndicator() }}
      </span>

      <!-- Action buttons (visible on hover or focus) -->
      <div class="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1 transition-opacity duration-200"
        :class="{ 'opacity-100': isHovered || isSelected, 'opacity-0 pointer-events-none': !isHovered && !isSelected }">
        <!-- Copy button -->
        <button :class="[
          'copy-button',
          'p-2',
          'text-gray-400',
          'hover:text-blue-600',
          'dark:text-gray-500',
          'dark:hover:text-blue-400',
          'hover:bg-blue-50',
          'dark:hover:bg-blue-900/20',
          'transition-all',
          'duration-200',
          'focus:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-blue-500',
          'focus-visible:ring-opacity-50',
          'rounded-md',
          'hover-lift',
        ]" @click.stop="copyNodeData" :title="'Copy ' + (node.isExpandable ? 'subtree' : 'value')"
          :aria-label="'Copy ' + (node.isExpandable ? 'subtree' : 'value')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H14C15.1046 21 16 20.1046 16 19V18M8 5C8 3.89543 8.89543 3 10 3H18C19.1046 3 20 3.89543 20 5V15C20 16.1046 19.1046 17 18 17H16M8 5V7C8 8.10457 8.89543 9 10 9H16"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <!-- Context menu button -->
        <button :class="[
          'context-menu-button',
          'p-2',
          'text-gray-400',
          'hover:text-blue-600',
          'dark:text-gray-500',
          'dark:hover:text-blue-400',
          'hover:bg-blue-50',
          'dark:hover:bg-blue-900/20',
          'transition-all',
          'duration-200',
          'focus:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-blue-500',
          'focus-visible:ring-opacity-50',
          'rounded-md',
          'hover-lift',
        ]" @click.stop="showContextMenu" title="More options" aria-label="Show context menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path
              d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path
              d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Children (when expanded) -->
  <div v-if="node.isExpandable && isExpanded && node.children" class="children">
    <TreeNode v-for="child in node.children" :key="getChildKey(child)" :node="child" :depth="depth + 1"
      :is-expanded="isChildExpanded(child)" :is-selected="isChildSelected(child)"
      :is-highlighted="isChildHighlighted(child)" @toggle-expansion="$emit('toggle-expansion', $event)"
      @node-select="$emit('node-select', $event)" @copy-success="$emit('copy-success', $event)" />
  </div>

  <!-- Context Menu -->
  <ContextMenu :is-visible="contextMenuVisible" :x="contextMenuX" :y="contextMenuY" :items="contextMenuItems"
    @close="closeContextMenu" />
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useJsonStore } from '@/stores/json'
import { useClipboard } from '@/composables/useClipboard'
import ContextMenu, { type ContextMenuItem } from './ContextMenu.vue'
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
const nodeRef = ref<HTMLElement>()
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// Clipboard functionality
const { copyToClipboard } = useClipboard({
  onSuccess: (text) => {
    emit('copy-success', `Copied: ${text.length > 50 ? text.substring(0, 50) + '...' : text}`)
  },
  onError: (error) => {
    emit('copy-success', `Copy failed: ${error.message}`)
  },
})

// Computed properties
const nodePath = computed(() => props.node.path.join('.'))

// Methods
const toggleExpansion = () => {
  if (props.node.isExpandable) {
    emit('toggle-expansion', nodePath.value)
  }
}

const handleNodeClick = async () => {
  emit('node-select', nodePath.value)
  // Focus the node for keyboard navigation
  await nextTick()
  if (nodeRef.value) {
    nodeRef.value.focus()
  }
}

const focusNode = () => {
  if (nodeRef.value) {
    nodeRef.value.focus()
  }
}

const scrollIntoView = () => {
  if (nodeRef.value) {
    nodeRef.value.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    })
  }
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
  const baseClasses = 'font-mono text-sm transition-colors duration-200'

  switch (type) {
    case 'string':
      return `${baseClasses} json-string`
    case 'number':
      return `${baseClasses} json-number`
    case 'boolean':
      return `${baseClasses} json-boolean`
    case 'null':
      return `${baseClasses} json-null`
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

// Copy functions
const copyKey = async () => {
  await copyToClipboard(String(props.node.key))
}

const copyValue = async () => {
  await copyToClipboard(formatValue(props.node.value))
}

const copyNodeData = async () => {
  let textToCopy: string

  if (props.node.isExpandable) {
    // Copy the entire subtree as JSON
    textToCopy = JSON.stringify(props.node.value, null, 2)
  } else {
    // Copy just the value
    textToCopy = formatValue(props.node.value)
  }

  await copyToClipboard(textToCopy)
}

const copyPath = async () => {
  const path = props.node.path.join('.')
  await copyToClipboard(path)
}

// Context menu functionality
const contextMenuItems = computed((): ContextMenuItem[] => [
  {
    label: 'Copy Key',
    action: copyKey,
    shortcut: 'Ctrl+K',
    disabled: false,
  },
  {
    label: props.node.isExpandable ? 'Copy Subtree' : 'Copy Value',
    action: copyNodeData,
    shortcut: 'Ctrl+C',
    disabled: false,
  },
  {
    label: 'Copy Path',
    action: copyPath,
    shortcut: 'Ctrl+P',
    disabled: false,
  },
  {
    label: props.isExpanded ? 'Collapse' : 'Expand',
    action: toggleExpansion,
    shortcut: 'Space',
    disabled: !props.node.isExpandable,
  },
])

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

const showContextMenu = (event?: MouseEvent) => {
  if (event) {
    contextMenuX.value = event.clientX
    contextMenuY.value = event.clientY
  } else if (nodeRef.value) {
    // Show context menu relative to the node when triggered by keyboard
    const rect = nodeRef.value.getBoundingClientRect()
    contextMenuX.value = rect.left + rect.width / 2
    contextMenuY.value = rect.top + rect.height / 2
  }
  contextMenuVisible.value = true
}

const closeContextMenu = () => {
  contextMenuVisible.value = false
}

// Expose methods for parent components
defineExpose({
  focusNode,
  scrollIntoView,
})

// Keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (props.node.isExpandable) {
        toggleExpansion()
      }
      break
    case 'c':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        copyNodeData()
      }
      break
    case 'k':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        copyKey()
      }
      break
    case 'p':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        copyPath()
      }
      break
    case 'F10':
      if (event.shiftKey) {
        event.preventDefault()
        showContextMenu()
      }
      break
    case 'ContextMenu':
      event.preventDefault()
      showContextMenu()
      break
  }
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.tree-node:hover .inline-flex {
  opacity: 1;
}

.node-key,
.node-value {
  word-break: break-all;
}

/* Enhanced visual hierarchy */
.tree-node {
  position: relative;
}

.tree-node::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
  transition: background-color 0.2s ease-in-out;
}

.tree-node:hover::before {
  background: var(--interactive-primary);
  opacity: 0.3;
}

.tree-node-selected::before {
  background: var(--interactive-primary);
  opacity: 1;
}

/* Smooth expand/collapse animation */
.expand-button {
  transform-origin: center;
}

/* Action buttons fade in/out with absolute positioning */
.tree-node .absolute {
  z-index: 10;
}

/* Enhanced focus styles */
.expand-button:focus-visible,
.copy-button:focus-visible,
.context-menu-button:focus-visible {
  outline: 2px solid var(--interactive-primary);
  outline-offset: 2px;
  border-radius: 6px;
}

/* Improved spacing for nested levels */
.children {
  position: relative;
}

.children::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border-primary);
  opacity: 0.5;
}

/* High contrast mode adjustments */
@media (prefers-contrast: high) {
  .tree-node::before {
    width: 3px;
  }

  .tree-node:hover::before,
  .tree-node-selected::before {
    opacity: 1;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {

  .expand-button,
  .inline-flex,
  .tree-node::before {
    transition: none;
  }
}
</style>
