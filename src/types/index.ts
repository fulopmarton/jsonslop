// Type definitions for JSON Visualization App
// Will be implemented in subsequent tasks

export interface JSONNode {
  key: string | number
  value: unknown
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  children?: JSONNode[]
  path: string[]
  isExpandable: boolean
}

export interface ValidationError {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}

export interface TreeState {
  expandedNodes: Set<string>
  selectedNode: string | null
  searchResults: string[]
  currentSearchIndex: number
}
