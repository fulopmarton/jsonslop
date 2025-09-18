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
