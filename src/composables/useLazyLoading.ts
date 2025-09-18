import { ref, computed, watchEffect, nextTick } from 'vue'
import type { JSONNode } from '@/types'

export interface LazyLoadingOptions {
  maxDepth?: number
  chunkSize?: number
  loadDelay?: number
  threshold?: number
}

export interface LazyLoadedNode extends JSONNode {
  isLoaded: boolean
  isLoading: boolean
  loadedChildren?: JSONNode[]
}

export function useLazyLoading(
  nodes: JSONNode[],
  expandedNodes: Set<string>,
  options: LazyLoadingOptions = {},
) {
  const { maxDepth = 3, chunkSize = 50, loadDelay = 100, threshold = 100 } = options

  // State
  const loadedNodes = ref(new Map<string, JSONNode[]>())
  const loadingNodes = ref(new Set<string>())
  const loadingPromises = ref(new Map<string, Promise<void>>())

  // Check if a node should be lazy loaded
  const shouldLazyLoad = (node: JSONNode): boolean => {
    if (!node.isExpandable || !node.children) return false

    const depth = node.path.length
    const childrenCount = node.children.length

    return depth >= maxDepth || childrenCount > threshold
  }

  // Load children for a node
  const loadNodeChildren = async (nodePath: string, children: JSONNode[]): Promise<void> => {
    if (loadingNodes.value.has(nodePath) || loadedNodes.value.has(nodePath)) {
      return loadingPromises.value.get(nodePath) || Promise.resolve()
    }

    loadingNodes.value.add(nodePath)

    const loadPromise = new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          // Simulate processing time for large datasets
          const chunks: JSONNode[][] = []
          for (let i = 0; i < children.length; i += chunkSize) {
            chunks.push(children.slice(i, i + chunkSize))
          }

          // Load chunks progressively
          const loadedChildren: JSONNode[] = []
          for (const chunk of chunks) {
            loadedChildren.push(...chunk)

            // Allow UI to update between chunks
            if (chunks.length > 1) {
              await nextTick()
            }
          }

          loadedNodes.value.set(nodePath, loadedChildren)
        } finally {
          loadingNodes.value.delete(nodePath)
          loadingPromises.value.delete(nodePath)
          resolve()
        }
      }, loadDelay)
    })

    loadingPromises.value.set(nodePath, loadPromise)
    return loadPromise
  }

  // Get processed nodes with lazy loading applied
  const processedNodes = computed(() => {
    const processNode = (node: JSONNode): LazyLoadedNode => {
      const nodePath = node.path.join('.')
      const isExpanded = expandedNodes.has(nodePath)
      const shouldLazy = shouldLazyLoad(node)

      if (!shouldLazy || !node.children) {
        return {
          ...node,
          isLoaded: true,
          isLoading: false,
          loadedChildren: node.children,
        }
      }

      const isLoading = loadingNodes.value.has(nodePath)
      const loadedChildren = loadedNodes.value.get(nodePath)
      const isLoaded = loadedChildren !== undefined

      // Trigger loading if expanded but not loaded
      if (isExpanded && !isLoaded && !isLoading) {
        loadNodeChildren(nodePath, node.children)
      }

      return {
        ...node,
        isLoaded,
        isLoading,
        loadedChildren: isLoaded ? loadedChildren : undefined,
        children: isLoaded ? loadedChildren?.map(processNode) : undefined,
      }
    }

    return nodes.map(processNode)
  })

  // Preload nodes that are likely to be expanded
  const preloadNode = async (nodePath: string, node: JSONNode) => {
    if (shouldLazyLoad(node) && node.children && !loadedNodes.value.has(nodePath)) {
      await loadNodeChildren(nodePath, node.children)
    }
  }

  // Preload visible nodes
  const preloadVisibleNodes = async (visibleNodes: JSONNode[]) => {
    const preloadPromises = visibleNodes
      .filter((node) => shouldLazyLoad(node))
      .map((node) => {
        const nodePath = node.path.join('.')
        return preloadNode(nodePath, node)
      })

    await Promise.all(preloadPromises)
  }

  // Clear loaded data for memory management
  const clearLoadedData = (nodePath?: string) => {
    if (nodePath) {
      loadedNodes.value.delete(nodePath)
      loadingNodes.value.delete(nodePath)
      loadingPromises.value.delete(nodePath)
    } else {
      loadedNodes.value.clear()
      loadingNodes.value.clear()
      loadingPromises.value.clear()
    }
  }

  // Get loading state for a node
  const isNodeLoading = (nodePath: string): boolean => {
    return loadingNodes.value.has(nodePath)
  }

  // Get loaded state for a node
  const isNodeLoaded = (nodePath: string): boolean => {
    return loadedNodes.value.has(nodePath)
  }

  // Watch for collapsed nodes to potentially clear their data
  watchEffect(() => {
    const expandedPaths = Array.from(expandedNodes)
    const loadedPaths = Array.from(loadedNodes.value.keys())

    // Clear data for nodes that are no longer expanded (memory optimization)
    loadedPaths.forEach((path) => {
      if (!expandedPaths.includes(path)) {
        // Keep recently collapsed nodes for a while in case they're re-expanded
        setTimeout(() => {
          if (!expandedNodes.has(path)) {
            clearLoadedData(path)
          }
        }, 5000) // 5 second delay before cleanup
      }
    })
  })

  return {
    // State
    processedNodes,
    loadingNodes: computed(() => loadingNodes.value),
    loadedNodes: computed(() => loadedNodes.value),

    // Methods
    loadNodeChildren,
    preloadNode,
    preloadVisibleNodes,
    clearLoadedData,
    isNodeLoading,
    isNodeLoaded,
    shouldLazyLoad,
  }
}
