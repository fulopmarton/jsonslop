import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GraphNode } from '@/types'
import { useClipboard } from './useClipboard'

export interface GraphKeyboardNavigationOptions {
  onNodeSelect?: (node: GraphNode) => void
  onNodeFocus?: (node: GraphNode) => void
  onCopy?: (text: string) => void
  onZoomToFit?: () => void
  onResetZoom?: () => void
}

export function useGraphKeyboardNavigation(
  nodes: () => GraphNode[],
  selectedNodeId: () => string | null,
  options: GraphKeyboardNavigationOptions = {},
) {
  const isActive = ref(false)
  const focusedNodeId = ref<string | null>(null)
  const { copyToClipboard } = useClipboard({
    onSuccess: (text) => options.onCopy?.(text),
  })

  // Get currently focused or selected node
  const currentNode = computed(() => {
    const nodeId = focusedNodeId.value || selectedNodeId()
    return nodeId ? nodes().find((n) => n.id === nodeId) || null : null
  })

  // Get nodes sorted by position for navigation
  const sortedNodes = computed(() => {
    return [...nodes()].sort((a, b) => {
      // Sort by y position first (top to bottom), then by x position (left to right)
      const yDiff = (a.y || 0) - (b.y || 0)
      if (Math.abs(yDiff) > 50) {
        // Group nodes by approximate rows
        return yDiff
      }
      return (a.x || 0) - (b.x || 0)
    })
  })

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive.value || nodes().length === 0) return

    // Don't handle keys if user is typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return
    }

    const current = currentNode.value

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        navigateUp()
        break
      case 'ArrowDown':
        event.preventDefault()
        navigateDown()
        break
      case 'ArrowLeft':
        event.preventDefault()
        navigateLeft()
        break
      case 'ArrowRight':
        event.preventDefault()
        navigateRight()
        break
      case 'Tab':
        event.preventDefault()
        if (event.shiftKey) {
          navigateToPrevious()
        } else {
          navigateToNext()
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (current) {
          selectCurrentNode()
        }
        break
      case 'Home':
        event.preventDefault()
        navigateToFirst()
        break
      case 'End':
        event.preventDefault()
        navigateToLast()
        break
      case 'C':
        if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
          event.preventDefault()
          copyCurrentNode()
        }
        break
      case 'f':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          options.onZoomToFit?.()
        }
        break
      case '0':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          options.onResetZoom?.()
        }
        break
      case 'Escape':
        event.preventDefault()
        clearFocus()
        break
    }
  }

  const navigateUp = () => {
    const current = currentNode.value
    if (!current) {
      focusFirstNode()
      return
    }

    const currentY = current.y || 0
    const currentX = current.x || 0

    // Find nodes above the current node
    const nodesAbove = nodes()
      .filter((node) => (node.y || 0) < currentY - 25) // 25px threshold
      .sort((a, b) => {
        // Sort by distance from current position
        const aDist = Math.sqrt(
          Math.pow((a.x || 0) - currentX, 2) + Math.pow((a.y || 0) - currentY, 2),
        )
        const bDist = Math.sqrt(
          Math.pow((b.x || 0) - currentX, 2) + Math.pow((b.y || 0) - currentY, 2),
        )
        return aDist - bDist
      })

    if (nodesAbove.length > 0) {
      focusNode(nodesAbove[0])
    }
  }

  const navigateDown = () => {
    const current = currentNode.value
    if (!current) {
      focusFirstNode()
      return
    }

    const currentY = current.y || 0
    const currentX = current.x || 0

    // Find nodes below the current node
    const nodesBelow = nodes()
      .filter((node) => (node.y || 0) > currentY + 25) // 25px threshold
      .sort((a, b) => {
        // Sort by distance from current position
        const aDist = Math.sqrt(
          Math.pow((a.x || 0) - currentX, 2) + Math.pow((a.y || 0) - currentY, 2),
        )
        const bDist = Math.sqrt(
          Math.pow((b.x || 0) - currentX, 2) + Math.pow((b.y || 0) - currentY, 2),
        )
        return aDist - bDist
      })

    if (nodesBelow.length > 0) {
      focusNode(nodesBelow[0])
    }
  }

  const navigateLeft = () => {
    const current = currentNode.value
    if (!current) {
      focusFirstNode()
      return
    }

    const currentY = current.y || 0
    const currentX = current.x || 0

    // Find nodes to the left of the current node
    const nodesLeft = nodes()
      .filter((node) => (node.x || 0) < currentX - 25) // 25px threshold
      .sort((a, b) => {
        // Sort by distance from current position
        const aDist = Math.sqrt(
          Math.pow((a.x || 0) - currentX, 2) + Math.pow((a.y || 0) - currentY, 2),
        )
        const bDist = Math.sqrt(
          Math.pow((b.x || 0) - currentX, 2) + Math.pow((b.y || 0) - currentY, 2),
        )
        return aDist - bDist
      })

    if (nodesLeft.length > 0) {
      focusNode(nodesLeft[0])
    }
  }

  const navigateRight = () => {
    const current = currentNode.value
    if (!current) {
      focusFirstNode()
      return
    }

    const currentY = current.y || 0
    const currentX = current.x || 0

    // Find nodes to the right of the current node
    const nodesRight = nodes()
      .filter((node) => (node.x || 0) > currentX + 25) // 25px threshold
      .sort((a, b) => {
        // Sort by distance from current position
        const aDist = Math.sqrt(
          Math.pow((a.x || 0) - currentX, 2) + Math.pow((a.y || 0) - currentY, 2),
        )
        const bDist = Math.sqrt(
          Math.pow((b.x || 0) - currentX, 2) + Math.pow((b.y || 0) - currentY, 2),
        )
        return aDist - bDist
      })

    if (nodesRight.length > 0) {
      focusNode(nodesRight[0])
    }
  }

  const navigateToNext = () => {
    const current = currentNode.value
    const sorted = sortedNodes.value

    if (!current || sorted.length === 0) {
      focusFirstNode()
      return
    }

    const currentIndex = sorted.findIndex((node) => node.id === current.id)
    const nextIndex = (currentIndex + 1) % sorted.length
    focusNode(sorted[nextIndex])
  }

  const navigateToPrevious = () => {
    const current = currentNode.value
    const sorted = sortedNodes.value

    if (!current || sorted.length === 0) {
      focusLastNode()
      return
    }

    const currentIndex = sorted.findIndex((node) => node.id === current.id)
    const prevIndex = currentIndex <= 0 ? sorted.length - 1 : currentIndex - 1
    focusNode(sorted[prevIndex])
  }

  const navigateToFirst = () => {
    focusFirstNode()
  }

  const navigateToLast = () => {
    focusLastNode()
  }

  const focusFirstNode = () => {
    const sorted = sortedNodes.value
    if (sorted.length > 0) {
      focusNode(sorted[0])
    }
  }

  const focusLastNode = () => {
    const sorted = sortedNodes.value
    if (sorted.length > 0) {
      focusNode(sorted[sorted.length - 1])
    }
  }

  const focusNode = (node: GraphNode) => {
    focusedNodeId.value = node.id
    options.onNodeFocus?.(node)

    // Focus the actual DOM element
    const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`) as HTMLElement
    if (nodeElement) {
      nodeElement.focus()
    }
  }

  const selectCurrentNode = () => {
    const current = currentNode.value
    if (current) {
      options.onNodeSelect?.(current)
    }
  }

  const copyCurrentNode = async () => {
    const current = currentNode.value
    if (!current) return

    let textToCopy: string
    if (current.type === 'object' || current.type === 'array') {
      textToCopy = JSON.stringify(current.value, null, 2)
    } else {
      textToCopy = formatValue(current.value)
    }

    await copyToClipboard(textToCopy)
  }

  const clearFocus = () => {
    focusedNodeId.value = null
    // Remove focus from any focused element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'number') return String(value)
    return String(value)
  }

  const activate = () => {
    isActive.value = true
  }

  const deactivate = () => {
    isActive.value = false
    clearFocus()
  }

  // Set up event listeners
  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    isActive,
    focusedNodeId,
    currentNode,
    activate,
    deactivate,
    focusNode,
    selectCurrentNode,
    copyCurrentNode,
    clearFocus,
    navigateUp,
    navigateDown,
    navigateLeft,
    navigateRight,
    navigateToNext,
    navigateToPrevious,
    navigateToFirst,
    navigateToLast,
    focusFirstNode,
    focusLastNode,
  }
}
