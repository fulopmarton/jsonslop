import { ref, computed } from 'vue'
import type { GraphNode } from '@/types'
import type { ContextMenuItem } from '@/components/ContextMenu.vue'
import { useClipboard } from './useClipboard'

export interface GraphInteractionOptions {
  onNodeSelect?: (node: GraphNode) => void
  onNodeDoubleClick?: (node: GraphNode) => void
  onCopySuccess?: (text: string) => void
  onCopyError?: (error: Error) => void
}

export function useGraphInteractions(options: GraphInteractionOptions = {}) {
  const { copyToClipboard } = useClipboard({
    onSuccess: options.onCopySuccess,
    onError: options.onCopyError,
  })

  // Context menu state
  const contextMenu = ref({
    isVisible: false,
    x: 0,
    y: 0,
    node: null as GraphNode | null,
  })

  // Selection and highlighting state
  const selectedNodeId = ref<string | null>(null)
  const highlightedNodes = ref<Set<string>>(new Set())
  const hoveredNodeId = ref<string | null>(null)

  // Computed properties
  const selectedNode = computed(() => {
    return selectedNodeId.value ? { id: selectedNodeId.value } : null
  })

  const contextMenuItems = computed((): ContextMenuItem[] => {
    const node = contextMenu.value.node
    if (!node) return []

    const items: ContextMenuItem[] = []

    // Copy node value
    items.push({
      label: 'Copy Value',
      action: () => copyNodeValue(node),
      shortcut: 'Ctrl+Shift+C',
    })

    // Copy node path
    items.push({
      label: 'Copy Path',
      action: () => copyNodePath(node),
    })

    // Copy node key
    if (node.key !== 'root') {
      items.push({
        label: 'Copy Key',
        action: () => copyNodeKey(node),
      })
    }

    // Separator
    items.push({
      label: '',
      action: () => {},
      separator: true,
    })

    // Copy as JSON (for objects and arrays)
    if (node.type === 'object' || node.type === 'array') {
      items.push({
        label: 'Copy as JSON',
        action: () => copyNodeAsJSON(node),
      })
    }

    // Copy formatted value
    items.push({
      label: 'Copy Formatted',
      action: () => copyNodeFormatted(node),
    })

    return items
  })

  // Event handlers
  const handleNodeClick = (node: GraphNode, event: MouseEvent) => {
    event.stopPropagation()
    selectNode(node.id)
    options.onNodeSelect?.(node)
  }

  const handleNodeDoubleClick = (node: GraphNode, event: MouseEvent) => {
    event.stopPropagation()
    options.onNodeDoubleClick?.(node)
  }

  const handleNodeContextMenu = (node: GraphNode, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    showContextMenu(node, event.clientX, event.clientY)
  }

  const handleNodeHover = (node: GraphNode | null) => {
    hoveredNodeId.value = node?.id || null
  }

  const handleNodeFocus = (node: GraphNode) => {
    // Optional: could add focus-specific behavior here
  }

  const handleNodeBlur = (node: GraphNode) => {
    // Optional: could add blur-specific behavior here
  }

  const handleCanvasClick = (event: MouseEvent) => {
    // Clear selection when clicking on empty canvas
    clearSelection()
    hideContextMenu()
  }

  // Selection management
  const selectNode = (nodeId: string | null) => {
    selectedNodeId.value = nodeId
  }

  const clearSelection = () => {
    selectedNodeId.value = null
    highlightedNodes.value.clear()
  }

  const highlightNodes = (nodeIds: string[]) => {
    highlightedNodes.value = new Set(nodeIds)
  }

  const addHighlightedNode = (nodeId: string) => {
    highlightedNodes.value.add(nodeId)
  }

  const removeHighlightedNode = (nodeId: string) => {
    highlightedNodes.value.delete(nodeId)
  }

  const clearHighlights = () => {
    highlightedNodes.value.clear()
  }

  const isNodeSelected = (nodeId: string): boolean => {
    return selectedNodeId.value === nodeId
  }

  const isNodeHighlighted = (nodeId: string): boolean => {
    return highlightedNodes.value.has(nodeId)
  }

  const isNodeHovered = (nodeId: string): boolean => {
    return hoveredNodeId.value === nodeId
  }

  // Context menu management
  const showContextMenu = (node: GraphNode, x: number, y: number) => {
    contextMenu.value = {
      isVisible: true,
      x,
      y,
      node,
    }
  }

  const hideContextMenu = () => {
    contextMenu.value = {
      isVisible: false,
      x: 0,
      y: 0,
      node: null,
    }
  }

  // Copy functions
  const copyNodeValue = async (node: GraphNode) => {
    const value = formatNodeValue(node.value)
    await copyToClipboard(value)
    hideContextMenu()
  }

  const copyNodePath = async (node: GraphNode) => {
    const path = node.path.join('.')
    await copyToClipboard(path || 'root')
    hideContextMenu()
  }

  const copyNodeKey = async (node: GraphNode) => {
    await copyToClipboard(String(node.key))
    hideContextMenu()
  }

  const copyNodeAsJSON = async (node: GraphNode) => {
    if (node.type === 'object' || node.type === 'array') {
      const json = JSON.stringify(node.value, null, 2)
      await copyToClipboard(json)
    } else {
      await copyNodeValue(node)
    }
    hideContextMenu()
  }

  const copyNodeFormatted = async (node: GraphNode) => {
    let formatted: string

    switch (node.type) {
      case 'object':
        formatted = `${node.key}: ${JSON.stringify(node.value, null, 2)}`
        break
      case 'array':
        formatted = `${node.key}: [${(node.value as unknown[]).length} items]`
        break
      case 'string':
        formatted = `${node.key}: "${node.value}"`
        break
      case 'number':
      case 'boolean':
        formatted = `${node.key}: ${node.value}`
        break
      case 'null':
        formatted = `${node.key}: null`
        break
      default:
        formatted = `${node.key}: ${node.value}`
    }

    await copyToClipboard(formatted)
    hideContextMenu()
  }

  // Helper functions
  const formatNodeValue = (value: unknown): string => {
    if (value === null) return 'null'
    if (typeof value === 'string') return value
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const getConnectedNodeIds = (
    nodeId: string,
    links: { source: string | GraphNode; target: string | GraphNode }[],
  ): string[] => {
    const connected = new Set<string>()

    links.forEach((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id

      if (sourceId === nodeId) {
        connected.add(targetId)
      } else if (targetId === nodeId) {
        connected.add(sourceId)
      }
    })

    return Array.from(connected)
  }

  const highlightConnectedNodes = (
    nodeId: string,
    links: { source: string | GraphNode; target: string | GraphNode }[],
  ) => {
    const connectedIds = getConnectedNodeIds(nodeId, links)
    connectedIds.push(nodeId) // Include the selected node itself
    highlightNodes(connectedIds)
  }

  return {
    // State
    contextMenu,
    selectedNodeId,
    highlightedNodes,
    hoveredNodeId,

    // Computed
    selectedNode,
    contextMenuItems,

    // Event handlers
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodeContextMenu,
    handleNodeHover,
    handleNodeFocus,
    handleNodeBlur,
    handleCanvasClick,

    // Selection management
    selectNode,
    clearSelection,
    highlightNodes,
    addHighlightedNode,
    removeHighlightedNode,
    clearHighlights,
    isNodeSelected,
    isNodeHighlighted,
    isNodeHovered,

    // Context menu management
    showContextMenu,
    hideContextMenu,

    // Copy functions
    copyNodeValue,
    copyNodePath,
    copyNodeKey,
    copyNodeAsJSON,
    copyNodeFormatted,

    // Helper functions
    getConnectedNodeIds,
    highlightConnectedNodes,
  }
}
