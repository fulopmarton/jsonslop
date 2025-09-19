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
export interface NodeProperty {
  key: string | number
  value: any
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  hasChildNode: boolean // True if this property connects to a child node
  childNodeId?: string // ID of connected child node if hasChildNode is true
}

export interface GraphNode {
  id: string
  key: string | number
  value: unknown
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  path: string[]
  x?: number
  y?: number
  width?: number // Width of rectangular node
  height?: number // Height of rectangular node
  vx?: number // Velocity x for simulation
  vy?: number // Velocity y for simulation
  fx?: number // Fixed position for dragging
  fy?: number
  children: string[] // Node IDs of children
  parent?: string // Node ID of parent
  depth: number
  size: number // Visual size based on content
  isExpanded: boolean
  hasChildren: boolean
  properties: NodeProperty[] // All key-value pairs displayed in this node
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

// Force layout types (re-exported from force-layout utility)
export interface ForceLayoutOptions {
  // Force strengths
  linkStrength: number
  chargeStrength: number
  centerStrength: number
  collisionStrength: number

  // Distance parameters
  linkDistance: number
  collisionRadius: number

  // Simulation parameters
  alphaDecay: number
  alphaMin: number
  velocityDecay: number

  // Layout dimensions
  width: number
  height: number

  // Performance settings
  maxIterations: number
  convergenceThreshold: number
}

export interface LayoutStats {
  iterations: number
  alpha: number
  isConverged: boolean
  averageVelocity: number
  maxVelocity: number
  frameRate: number
  lastTickTime: number
}
