import { ref, onMounted, onUnmounted } from 'vue'
import { useJsonStore } from '@/stores/json'

export interface KeyboardNavigationOptions {
  onCopy?: (text: string) => void
  onToggleExpansion?: (nodePath: string) => void
  onSelectNode?: (nodePath: string) => void
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const jsonStore = useJsonStore()
  const isActive = ref(false)

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive.value || !jsonStore.hasValidJson) return

    const selectedNode = jsonStore.treeState.selectedNode
    if (!selectedNode) return

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
        if (jsonStore.isNodeExpanded(selectedNode)) {
          jsonStore.collapseNode(selectedNode)
          options.onToggleExpansion?.(selectedNode)
        } else {
          navigateToParent()
        }
        break
      case 'ArrowRight':
        event.preventDefault()
        if (!jsonStore.isNodeExpanded(selectedNode)) {
          const node = jsonStore.getNodeByPath(selectedNode)
          if (node?.isExpandable) {
            jsonStore.expandNode(selectedNode)
            options.onToggleExpansion?.(selectedNode)
          }
        } else {
          navigateToFirstChild()
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        const node = jsonStore.getNodeByPath(selectedNode)
        if (node?.isExpandable) {
          jsonStore.toggleNodeExpansion(selectedNode)
          options.onToggleExpansion?.(selectedNode)
        }
        break
      case 'C':
        if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
          event.preventDefault()
          copySelectedNode()
        }
        break
      case 'Escape':
        event.preventDefault()
        jsonStore.selectNode(null)
        break
    }
  }

  const navigateUp = () => {
    const selectedNode = jsonStore.treeState.selectedNode
    if (!selectedNode) return

    const allVisibleNodes = getAllVisibleNodePaths()
    const currentIndex = allVisibleNodes.indexOf(selectedNode)

    if (currentIndex > 0) {
      const previousNode = allVisibleNodes[currentIndex - 1]
      jsonStore.selectNode(previousNode)
      options.onSelectNode?.(previousNode)
    }
  }

  const navigateDown = () => {
    const selectedNode = jsonStore.treeState.selectedNode
    if (!selectedNode) return

    const allVisibleNodes = getAllVisibleNodePaths()
    const currentIndex = allVisibleNodes.indexOf(selectedNode)

    if (currentIndex < allVisibleNodes.length - 1) {
      const nextNode = allVisibleNodes[currentIndex + 1]
      jsonStore.selectNode(nextNode)
      options.onSelectNode?.(nextNode)
    }
  }

  const navigateToParent = () => {
    const selectedNode = jsonStore.treeState.selectedNode
    if (!selectedNode) return

    const pathParts = selectedNode.split('.')
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join('.')
      jsonStore.selectNode(parentPath)
      options.onSelectNode?.(parentPath)
    }
  }

  const navigateToFirstChild = () => {
    const selectedNode = jsonStore.treeState.selectedNode
    if (!selectedNode) return

    const node = jsonStore.getNodeByPath(selectedNode)
    if (node?.children && node.children.length > 0) {
      const firstChildPath = node.children[0].path.join('.')
      jsonStore.selectNode(firstChildPath)
      options.onSelectNode?.(firstChildPath)
    }
  }

  const copySelectedNode = () => {
    const selectedNode = jsonStore.treeState.selectedNode
    if (!selectedNode) return

    const node = jsonStore.getNodeByPath(selectedNode)
    if (!node) return

    let textToCopy: string
    if (node.isExpandable) {
      textToCopy = JSON.stringify(node.value, null, 2)
    } else {
      textToCopy = formatValue(node.value)
    }

    options.onCopy?.(textToCopy)
  }

  const getAllVisibleNodePaths = (): string[] => {
    const paths: string[] = []

    const traverse = (nodes: any[], currentPath: string[] = []) => {
      for (const node of nodes) {
        const nodePath = node.path.join('.')
        paths.push(nodePath)

        if (node.isExpandable && jsonStore.isNodeExpanded(nodePath) && node.children) {
          traverse(node.children, [...currentPath, String(node.key)])
        }
      }
    }

    traverse(jsonStore.jsonTree)
    return paths
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
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
  })

  return {
    isActive,
    activate,
    deactivate,
    navigateUp,
    navigateDown,
    navigateToParent,
    navigateToFirstChild,
    copySelectedNode,
  }
}
