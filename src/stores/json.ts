import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type { JSONNode, ValidationError, TreeState, ParseResult } from '@/types'
import { parseJSON } from '@/utils/json-parser'
import { buildTree } from '@/utils/tree-builder'
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

  // Tree state management
  const treeState = ref<TreeState>({
    expandedNodes: new Set<string>(),
    selectedNode: null,
    searchResults: [],
    currentSearchIndex: -1,
  })

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

  const validateAndParseJson = (input: string) => {
    console.log('validateAndParseJson called with:', input) // Debug log
    try {
      // Clear previous state
      validationErrors.value = []
      validationWarnings.value = []
      validationSuggestions.value = []

      // Validate JSON
      const validationResult: ValidationResult = validationService.validate(input)
      console.log('Validation result:', validationResult) // Debug log

      validationErrors.value = validationResult.errors
      validationWarnings.value = validationResult.warnings
      validationSuggestions.value = validationResult.suggestions
      isValidJson.value = validationResult.isValid

      if (validationResult.isValid) {
        // Parse JSON data
        const parseResult: ParseResult = parseJSON(input)

        if (parseResult.isValid && parseResult.data !== undefined) {
          parsedJsonData.value = parseResult.data
          console.log('Parsed JSON data:', parseResult.data) // Debug log

          // Build tree structure
          jsonTree.value = buildTree(parseResult.data)
          console.log('Built tree:', jsonTree.value) // Debug log

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
      localStorage.setItem('json-viz-preferences', JSON.stringify(uiPreferences.value))
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error)
    }
  }

  const loadPreferencesFromStorage = () => {
    try {
      const stored = localStorage.getItem('json-viz-preferences')
      if (stored) {
        const parsed = JSON.parse(stored) as UIPreferences
        uiPreferences.value = { ...uiPreferences.value, ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load preferences from localStorage:', error)
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
    searchQuery,
    uiPreferences,

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

    // Actions
    updateJsonInput,
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
  }
})
