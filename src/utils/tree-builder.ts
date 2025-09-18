// Tree building utilities

import type { JSONNode, JSONValue } from '@/types'

/**
 * Builds a tree structure from parsed JSON data
 */
export const buildTree = (data: unknown, rootKey = 'root'): JSONNode[] => {
  if (data === null || data === undefined) {
    return []
  }

  const rootNode = createNode(rootKey, data, [])
  return [rootNode]
}

/**
 * Creates a JSONNode from a key-value pair
 */
export const createNode = (key: string | number, value: unknown, path: string[]): JSONNode => {
  const currentPath = [...path, String(key)]
  const type = getValueType(value)
  const isExpandable = type === 'object' || type === 'array'

  const node: JSONNode = {
    key,
    value,
    type,
    path: currentPath,
    isExpandable,
  }

  if (isExpandable) {
    node.children = createChildren(value as JSONValue, currentPath)
  }

  return node
}

/**
 * Creates child nodes for objects and arrays
 */
export const createChildren = (value: JSONValue, path: string[]): JSONNode[] => {
  if (Array.isArray(value)) {
    return value.map((item, index) => createNode(index, item, path))
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value).map(([key, val]) => createNode(key, val, path))
  }

  return []
}

/**
 * Determines the type of a JSON value
 */
export const getValueType = (value: unknown): JSONNode['type'] => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'string' // fallback
}

/**
 * Flattens a tree structure into a list of nodes
 */
export const flattenTree = (nodes: JSONNode[]): JSONNode[] => {
  const result: JSONNode[] = []

  const traverse = (nodeList: JSONNode[]) => {
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

/**
 * Finds a node by its path
 */
export const findNodeByPath = (nodes: JSONNode[], targetPath: string[]): JSONNode | null => {
  const flattened = flattenTree(nodes)
  return (
    flattened.find(
      (node) =>
        node.path.length === targetPath.length &&
        node.path.every((segment, index) => segment === targetPath[index]),
    ) || null
  )
}

/**
 * Gets the string representation of a node's path
 */
export const getPathString = (path: string[]): string => {
  return path.join('.')
}

/**
 * Counts total nodes in a tree
 */
export const countNodes = (nodes: JSONNode[]): number => {
  return flattenTree(nodes).length
}

/**
 * Gets the maximum depth of a tree
 */
export const getMaxDepth = (nodes: JSONNode[]): number => {
  let maxDepth = 0

  const traverse = (nodeList: JSONNode[], depth: number) => {
    maxDepth = Math.max(maxDepth, depth)
    for (const node of nodeList) {
      if (node.children) {
        traverse(node.children, depth + 1)
      }
    }
  }

  traverse(nodes, 0)
  return maxDepth
}
