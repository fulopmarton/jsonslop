import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  JSONNode,
  ValidationError,
  TreeState,
  ParseResult,
  GraphNode,
  GraphLink,
  GraphData,
  GraphState,
  LayoutType,
  ViewType,
} from '@/types'
import { parseJSON } from '@/utils/json-parser'
import { buildTree } from '@/utils/tree-builder'
import { GraphBuilder } from '@/utils/graph-builder'
import { validationService, type ValidationResult } from '@/services/validationService'

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  showLineNumbers: boolean
  autoFormat: boolean
  expandDepth: number
}

export const useJsonStore = defineStore('json', () => {
  // Core JSON data state
  const rawJsonInput = ref<string>('')
  const parsedJsonData = ref<unknown>(null)
  const jsonTree = ref<JSONNode[]>([])
  const isValidJson = ref<boolean>(false)

  // Validation state
  const validationErrors = ref<ValidationError[]>([])
  const validationWarnings = ref<ValidationError[]>([])
  const validationSuggestions = ref<string[]>([])
  const validationResult = ref<ValidationResult | null>(null)

  // Tree state management
  const treeState = ref<TreeState>({
    expandedNodes: new Set<string>(),
    selectedNode: null,
    searchResults: [],
    currentSearchIndex: -1,
  })

  // Graph state management
  const graphState = ref<GraphState>({
    nodes: [],
    links: [],
    selectedNodeId: null,
    highlightedNodes: new Set<string>(),
    layoutType: 'force',
    zoomTransform: {
      x: 0,
      y: 0,
      k: 1,
    },
  })

  // View state
  const currentView = ref<ViewType>('tree')

  // Search state
  const searchQuery = ref<string>('')
  const searchResults = computed(() => treeState.value.searchResults)
  const currentSearchIndex = computed(() => treeState.value.currentSearchIndex)
  const hasSearchResults = computed(() => searchResults.value.length > 0)

  // UI preferences with localStorage persistence
  const uiPreferences = ref<UIPreferences>({
    theme: 'auto',
    fontSize: 'medium',
    showLineNumbers: true,
    autoFormat: true,
    expandDepth: 2,
  })

  // Validation status
  const validationStatus = computed(() => {
    if (hasErrors.value) return 'invalid'
    if (hasWarnings.value) return 'warning'
    if (hasValidJson.value) return 'valid'
    if (rawJsonInput.value.trim()) return 'incomplete'
    return 'empty'
  })

  // Computed properties
  const hasValidJson = computed(() => isValidJson.value && parsedJsonData.value !== null)
  const hasErrors = computed(() => validationErrors.value.length > 0)
  const hasWarnings = computed(() => validationWarnings.value.length > 0)
  const totalNodes = computed(() => countNodes(jsonTree.value))
  const expandedNodeCount = computed(() => treeState.value.expandedNodes.size)

  // JSON fix computed properties
  const canFixJson = computed(() => {
    const result =
      validationResult.value?.fixResult?.canFix && validationResult.value?.fixResult?.isValid
    console.log('canFixJson computed:', {
      hasValidationResult: !!validationResult.value,
      hasFixResult: !!validationResult.value?.fixResult,
      canFix: validationResult.value?.fixResult?.canFix,
      isValid: validationResult.value?.fixResult?.isValid,
      result,
    })
    return result
  })
  const jsonFixSuggestions = computed(() => {
    const suggestions = validationResult.value?.fixResult?.fixes.map((fix) => fix.description) || []
    console.log('jsonFixSuggestions computed:', suggestions)
    return suggestions
  })

  // Graph computed properties
  const graphNodes = computed(() => graphState.value.nodes)
  const graphLinks = computed(() => graphState.value.links)
  const selectedGraphNode = computed(() =>
    graphState.value.selectedNodeId
      ? graphState.value.nodes.find((node) => node.id === graphState.value.selectedNodeId) || null
      : null,
  )
  const filteredGraphNodes = computed(() => {
    if (!searchQuery.value.trim()) {
      return graphState.value.nodes
    }

    const query = searchQuery.value.toLowerCase()
    return graphState.value.nodes.filter((node) => {
      const keyMatch = String(node.key).toLowerCase().includes(query)
      const valueMatch = String(node.value).toLowerCase().includes(query)
      return keyMatch || valueMatch
    })
  })

  const highlightedConnections = computed(() => {
    if (!graphState.value.selectedNodeId) {
      return new Set<string>()
    }

    const connections = new Set<string>()
    const selectedId = graphState.value.selectedNodeId

    // Find all links connected to the selected node
    graphState.value.links.forEach((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id

      if (sourceId === selectedId || targetId === selectedId) {
        connections.add(sourceId)
        connections.add(targetId)
      }
    })

    return connections
  })

  // Enhanced status indicators
  const statusMessage = computed(() => {
    switch (validationStatus.value) {
      case 'invalid':
        return `${validationErrors.value.length} error${validationErrors.value.length !== 1 ? 's' : ''} found`
      case 'warning':
        return `Valid JSON with ${validationWarnings.value.length} warning${validationWarnings.value.length !== 1 ? 's' : ''}`
      case 'valid':
        return `Valid JSON (${totalNodes.value} nodes)`
      case 'incomplete':
        return 'JSON appears incomplete'
      case 'empty':
        return 'Enter JSON to begin'
      default:
        return ''
    }
  })

  const statusColor = computed(() => {
    switch (validationStatus.value) {
      case 'invalid':
        return 'red'
      case 'warning':
        return 'yellow'
      case 'valid':
        return 'green'
      case 'incomplete':
        return 'gray'
      case 'empty':
        return 'gray'
      default:
        return 'gray'
    }
  })

  // Actions for updating JSON data
  const updateJsonInput = (input: string) => {
    rawJsonInput.value = input
    validateAndParseJson(input)
  }

  const applyJsonFix = () => {
    const validationResult = validationService.validate(rawJsonInput.value)
    if (validationResult.fixResult?.canFix && validationResult.fixResult.isValid) {
      updateJsonInput(validationResult.fixResult.fixedJSON)
    }
  }

  const validateAndParseJson = (input: string) => {
    console.log('validateAndParseJson called with:', input) // Debug log
    try {
      // Clear previous state
      validationErrors.value = []
      validationWarnings.value = []
      validationSuggestions.value = []

      // Validate JSON
      const currentValidationResult: ValidationResult = validationService.validate(input)
      console.log('Validation result:', currentValidationResult) // Debug log

      validationResult.value = currentValidationResult
      validationErrors.value = currentValidationResult.errors
      validationWarnings.value = currentValidationResult.warnings
      validationSuggestions.value = currentValidationResult.suggestions
      isValidJson.value = currentValidationResult.isValid

      if (currentValidationResult.isValid) {
        // Parse JSON data
        const parseResult: ParseResult = parseJSON(input)

        if (parseResult.isValid && parseResult.data !== undefined) {
          parsedJsonData.value = parseResult.data
          console.log('Parsed JSON data:', parseResult.data) // Debug log

          // Build tree structure
          jsonTree.value = buildTree(parseResult.data)
          console.log('Built tree:', jsonTree.value) // Debug log

          // Build graph structure
          const graphData = GraphBuilder.buildGraph(parseResult.data)
          console.log(
            'Built graph:',
            graphData.nodes.length,
            'nodes,',
            graphData.links.length,
            'links',
          )
          if (graphData.links.length > 0) {
            console.log('First few links:', graphData.links.slice(0, 3))
          }
          updateGraphData(graphData)

          // Auto-expand nodes based on preferences
          autoExpandNodes()

          // Clear search when new data is loaded
          clearSearch()
        } else {
          // Handle parsing errors
          parsedJsonData.value = null
          jsonTree.value = []
          validationErrors.value = parseResult.errors
          isValidJson.value = false
        }
      } else {
        // Invalid JSON
        parsedJsonData.value = null
        jsonTree.value = []
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      validationErrors.value = [
        {
          line: 1,
          column: 1,
          message: `Unexpected error: ${errorMessage}`,
          severity: 'error',
        },
      ]
      isValidJson.value = false
      parsedJsonData.value = null
      jsonTree.value = []
    }
  }

  // Tree state management actions
  const toggleNodeExpansion = (nodePath: string) => {
    if (treeState.value.expandedNodes.has(nodePath)) {
      treeState.value.expandedNodes.delete(nodePath)
    } else {
      treeState.value.expandedNodes.add(nodePath)
    }
  }

  const expandNode = (nodePath: string) => {
    treeState.value.expandedNodes.add(nodePath)
  }

  const collapseNode = (nodePath: string) => {
    treeState.value.expandedNodes.delete(nodePath)
  }

  const expandAllNodes = () => {
    const allPaths = getAllNodePaths(jsonTree.value)
    allPaths.forEach((path) => treeState.value.expandedNodes.add(path))
  }

  const collapseAllNodes = () => {
    treeState.value.expandedNodes.clear()
  }

  const autoExpandNodes = () => {
    const maxDepth = uiPreferences.value.expandDepth
    const pathsToExpand = getNodePathsUpToDepth(jsonTree.value, maxDepth)
    treeState.value.expandedNodes = new Set(pathsToExpand)
  }

  const selectNode = (nodePath: string | null) => {
    treeState.value.selectedNode = nodePath
  }

  // Search functionality
  const updateSearchQuery = (query: string) => {
    searchQuery.value = query
    if (query.trim()) {
      performSearch(query)
    } else {
      clearSearch()
    }
  }

  const performSearch = (query: string) => {
    const results = searchInTree(jsonTree.value, query.toLowerCase())
    treeState.value.searchResults = results
    treeState.value.currentSearchIndex = results.length > 0 ? 0 : -1

    // Auto-expand nodes that contain search results
    results.forEach((path) => {
      const parentPath = getParentPath(path)
      if (parentPath) {
        expandNode(parentPath)
      }
    })
  }

  const navigateToNextSearchResult = () => {
    if (treeState.value.searchResults.length > 0) {
      treeState.value.currentSearchIndex =
        (treeState.value.currentSearchIndex + 1) % treeState.value.searchResults.length
    }
  }

  const navigateToPreviousSearchResult = () => {
    if (treeState.value.searchResults.length > 0) {
      treeState.value.currentSearchIndex =
        treeState.value.currentSearchIndex <= 0
          ? treeState.value.searchResults.length - 1
          : treeState.value.currentSearchIndex - 1
    }
  }

  const clearSearch = () => {
    searchQuery.value = ''
    treeState.value.searchResults = []
    treeState.value.currentSearchIndex = -1
  }

  // Graph state management actions
  const updateGraphData = (graphData: GraphData) => {
    graphState.value.nodes = graphData.nodes
    graphState.value.links = graphData.links
    // Reset selection when new data is loaded
    graphState.value.selectedNodeId = null
    graphState.value.highlightedNodes.clear()
  }

  const selectGraphNode = (nodeId: string | null) => {
    graphState.value.selectedNodeId = nodeId

    // Update highlighted nodes based on selection
    if (nodeId) {
      const highlightedIds = new Set<string>()
      highlightedIds.add(nodeId)

      // Add connected nodes to highlights
      graphState.value.links.forEach((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id
        const targetId = typeof link.target === 'string' ? link.target : link.target.id

        if (sourceId === nodeId) {
          highlightedIds.add(targetId)
        } else if (targetId === nodeId) {
          highlightedIds.add(sourceId)
        }
      })

      graphState.value.highlightedNodes = highlightedIds
    } else {
      graphState.value.highlightedNodes.clear()
    }
  }

  const setLayoutType = (layoutType: LayoutType) => {
    graphState.value.layoutType = layoutType
  }

  const updateZoomTransform = (transform: { x: number; y: number; k: number }) => {
    graphState.value.zoomTransform = { ...transform }
  }

  const highlightGraphNodes = (nodeIds: string[]) => {
    graphState.value.highlightedNodes = new Set(nodeIds)
  }

  const clearGraphHighlights = () => {
    graphState.value.highlightedNodes.clear()
  }

  // View management actions
  const setCurrentView = (view: ViewType) => {
    currentView.value = view
    savePreferencesToStorage()
  }

  const getGraphNodeById = (nodeId: string): GraphNode | null => {
    return graphState.value.nodes.find((node) => node.id === nodeId) || null
  }

  const isGraphNodeSelected = (nodeId: string): boolean => {
    return graphState.value.selectedNodeId === nodeId
  }

  const isGraphNodeHighlighted = (nodeId: string): boolean => {
    return graphState.value.highlightedNodes.has(nodeId)
  }

  // UI preferences management
  const updateUIPreferences = (preferences: Partial<UIPreferences>) => {
    uiPreferences.value = { ...uiPreferences.value, ...preferences }
    savePreferencesToStorage()
  }

  const resetUIPreferences = () => {
    uiPreferences.value = {
      theme: 'auto',
      fontSize: 'medium',
      showLineNumbers: true,
      autoFormat: true,
      expandDepth: 2,
    }
    savePreferencesToStorage()
  }

  // Utility actions
  const clearAllData = () => {
    rawJsonInput.value = ''
    parsedJsonData.value = null
    jsonTree.value = []
    isValidJson.value = false
    validationErrors.value = []
    validationWarnings.value = []
    validationSuggestions.value = []
    clearSearch()
    treeState.value.expandedNodes.clear()
    treeState.value.selectedNode = null

    // Clear graph state
    graphState.value.nodes = []
    graphState.value.links = []
    graphState.value.selectedNodeId = null
    graphState.value.highlightedNodes.clear()
    graphState.value.zoomTransform = { x: 0, y: 0, k: 1 }

    // Reset view to tree
    currentView.value = 'tree'
  }

  const getNodeByPath = (path: string): JSONNode | null => {
    return findNodeByPath(jsonTree.value, path)
  }

  const isNodeExpanded = (nodePath: string): boolean => {
    return treeState.value.expandedNodes.has(nodePath)
  }

  const isNodeSelected = (nodePath: string): boolean => {
    return treeState.value.selectedNode === nodePath
  }

  const isNodeInSearchResults = (nodePath: string): boolean => {
    return treeState.value.searchResults.includes(nodePath)
  }

  // Persistence functions
  const savePreferencesToStorage = () => {
    try {
      const preferencesToSave = {
        ...uiPreferences.value,
        currentView: currentView.value,
      }
      localStorage.setItem('json-viz-preferences', JSON.stringify(preferencesToSave))
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error)
    }
  }

  const loadPreferencesFromStorage = () => {
    try {
      const stored = localStorage.getItem('json-viz-preferences')
      if (stored) {
        const parsed = JSON.parse(stored) as UIPreferences & { currentView?: ViewType }
        uiPreferences.value = { ...uiPreferences.value, ...parsed }
        // Only load currentView from storage if it exists, otherwise keep default 'tree'
        if (parsed.currentView) {
          currentView.value = parsed.currentView
        }
      }
      // Ensure tree is the default if no stored preference exists
      if (!stored) {
        currentView.value = 'tree'
      }
    } catch (error) {
      console.warn('Failed to load preferences from localStorage:', error)
      // Fallback to tree view on error
      currentView.value = 'tree'
    }
  }

  const saveTreeStateToStorage = () => {
    try {
      const stateToSave = {
        expandedNodes: Array.from(treeState.value.expandedNodes),
        selectedNode: treeState.value.selectedNode,
      }
      sessionStorage.setItem('json-viz-tree-state', JSON.stringify(stateToSave))
    } catch (error) {
      console.warn('Failed to save tree state to sessionStorage:', error)
    }
  }

  const loadTreeStateFromStorage = () => {
    try {
      const stored = sessionStorage.getItem('json-viz-tree-state')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.expandedNodes) {
          treeState.value.expandedNodes = new Set(parsed.expandedNodes)
        }
        if (parsed.selectedNode) {
          treeState.value.selectedNode = parsed.selectedNode
        }
      }
    } catch (error) {
      console.warn('Failed to load tree state from sessionStorage:', error)
    }
  }

  const initializeStore = () => {
    loadPreferencesFromStorage()
    loadTreeStateFromStorage()

    // Load default sample data if no JSON input exists
    if (!rawJsonInput.value.trim()) {
      const sampleData = {
        welcome: 'JsonSlop Demo! 🍲',
        description: 'This is some sample JSON to show off what JsonSlop can do',
        features: {
          visualization: {
            tree_view: true,
            graph_view: true,
            search: 'Hunt through your data like a pro',
          },
          interaction: {
            copy_values: 'Click any value to copy it',
            expand_collapse: 'Toggle nodes to explore',
            keyboard_nav: ['Arrow keys', 'Enter', 'Space'],
          },
        },
        sample_data: {
          users: [
            {
              id: 1,
              name: 'Alice Developer',
              email: 'alice@jsonslop.dev',
              skills: ['JavaScript', 'Vue.js', 'JSON wrangling'],
              active: true,
              projects: 42,
            },
            {
              id: 2,
              name: 'Bob DataWrangler',
              email: 'bob@jsonslop.dev',
              skills: ['Python', 'Data Analysis', 'API Design'],
              active: true,
              projects: 37,
            },
          ],
          config: {
            api_endpoint: 'https://api.jsonslop.dev/v1',
            timeout: 5000,
            retry_attempts: 3,
            features: {
              dark_mode: true,
              auto_save: false,
              notifications: {
                email: true,
                push: false,
                sms: null,
              },
            },
          },
        },
        meta: {
          version: '1.0.0',
          created: '2025-01-19T10:30:00Z',
          tags: ['demo', 'sample', 'json', 'slop'],
          nested_levels: 4,
          total_properties: 25,
        },
      }

      const sampleJson = JSON.stringify(sampleData, null, 2)
      updateJsonInput(sampleJson)
    }
  }

  // Watch for changes to save state
  watch(
    () => treeState.value.expandedNodes,
    () => saveTreeStateToStorage(),
    { deep: true },
  )

  watch(
    () => treeState.value.selectedNode,
    () => saveTreeStateToStorage(),
  )

  // Helper functions
  function countNodes(nodes: JSONNode[]): number {
    return nodes.reduce((count, node) => {
      return count + 1 + (node.children ? countNodes(node.children) : 0)
    }, 0)
  }

  function getAllNodePaths(nodes: JSONNode[]): string[] {
    const paths: string[] = []

    function traverse(nodeList: JSONNode[]) {
      for (const node of nodeList) {
        const path = node.path.join('.')
        paths.push(path)
        if (node.children) {
          traverse(node.children)
        }
      }
    }

    traverse(nodes)
    return paths
  }

  function getNodePathsUpToDepth(nodes: JSONNode[], maxDepth: number): string[] {
    const paths: string[] = []

    function traverse(nodeList: JSONNode[], currentDepth: number) {
      if (currentDepth >= maxDepth) return

      for (const node of nodeList) {
        if (node.isExpandable) {
          const path = node.path.join('.')
          paths.push(path)
          if (node.children && currentDepth < maxDepth - 1) {
            traverse(node.children, currentDepth + 1)
          }
        }
      }
    }

    traverse(nodes, 0)
    return paths
  }

  function searchInTree(nodes: JSONNode[], query: string): string[] {
    const results: string[] = []

    function traverse(nodeList: JSONNode[]) {
      for (const node of nodeList) {
        const keyMatch = String(node.key).toLowerCase().includes(query)
        const valueMatch = String(node.value).toLowerCase().includes(query)

        if (keyMatch || valueMatch) {
          results.push(node.path.join('.'))
        }

        if (node.children) {
          traverse(node.children)
        }
      }
    }

    traverse(nodes)
    return results
  }

  function findNodeByPath(nodes: JSONNode[], targetPath: string): JSONNode | null {
    const flattened = flattenTreeNodes(nodes)

    return (
      flattened.find((node) => {
        const nodePath = node.path.join('.')
        return nodePath === targetPath
      }) || null
    )
  }

  function flattenTreeNodes(nodes: JSONNode[]): JSONNode[] {
    const result: JSONNode[] = []

    function traverse(nodeList: JSONNode[]) {
      for (const node of nodeList) {
        result.push(node)
        if (node.children) {
          traverse(node.children)
        }
      }
    }

    traverse(nodes)
    return result
  }

  function getParentPath(path: string): string | null {
    const parts = path.split('.')
    return parts.length > 1 ? parts.slice(0, -1).join('.') : null
  }

  // Initialize store on creation
  initializeStore()

  return {
    // State
    rawJsonInput,
    parsedJsonData,
    jsonTree,
    isValidJson,
    validationErrors,
    validationWarnings,
    validationSuggestions,
    treeState,
    graphState,
    searchQuery,
    uiPreferences,
    currentView,

    // Computed
    hasValidJson,
    hasErrors,
    hasWarnings,
    totalNodes,
    expandedNodeCount,
    searchResults,
    currentSearchIndex,
    hasSearchResults,
    validationStatus,
    statusMessage,
    statusColor,
    canFixJson,
    jsonFixSuggestions,
    // Graph computed
    graphNodes,
    graphLinks,
    selectedGraphNode,
    filteredGraphNodes,
    highlightedConnections,

    // Actions
    updateJsonInput,
    applyJsonFix,
    validateAndParseJson,
    toggleNodeExpansion,
    expandNode,
    collapseNode,
    expandAllNodes,
    collapseAllNodes,
    autoExpandNodes,
    selectNode,
    updateSearchQuery,
    performSearch,
    navigateToNextSearchResult,
    navigateToPreviousSearchResult,
    clearSearch,
    updateUIPreferences,
    resetUIPreferences,
    clearAllData,
    getNodeByPath,
    isNodeExpanded,
    isNodeSelected,
    isNodeInSearchResults,
    initializeStore,
    // Graph actions
    updateGraphData,
    selectGraphNode,
    setLayoutType,
    updateZoomTransform,
    highlightGraphNodes,
    clearGraphHighlights,
    getGraphNodeById,
    isGraphNodeSelected,
    isGraphNodeHighlighted,
    // View actions
    setCurrentView,
  }
})
