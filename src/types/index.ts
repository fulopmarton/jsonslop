// Type definitions for JSON Visualization App

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

export interface ParseResult {
  data: unknown
  errors: ValidationError[]
  isValid: boolean
}

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray
export interface JSONObject {
  [key: string]: JSONValue
}
export interface JSONArray extends Array<JSONValue> {}

// Graph-related types
export interface GraphNode {
  id: string
  key: string | number
  value: unknown
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  path: string[]
  x?: number
  y?: number
  fx?: number // Fixed position for dragging
  fy?: number
  children: string[] // Node IDs of children
  parent?: string // Node ID of parent
  depth: number
  size: number // Visual size based on content
}

export interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  type: 'parent-child' | 'array-item'
  strength?: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export type LayoutType = 'force' | 'hierarchical' | 'tree'

export interface GraphState {
  nodes: GraphNode[]
  links: GraphLink[]
  selectedNodeId: string | null
  highlightedNodes: Set<string>
  layoutType: LayoutType
  zoomTransform: {
    x: number
    y: number
    k: number
  }
}

// View types
export type ViewType = 'tree' | 'graph'
