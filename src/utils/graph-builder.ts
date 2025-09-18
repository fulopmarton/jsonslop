// Graph data transformation utilities

import type { JSONValue } from '@/types'

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

/**
 * Converts a path array to a unique node ID
 */
export const pathToId = (path: string[]): string => {
  if (path.length === 0) return 'root'
  return path.join('.')
}

/**
 * Converts a node ID back to a path array
 */
export const idToPath = (id: string): string[] => {
  if (id === 'root') return []
  return id.split('.')
}

/**
 * Determines the data type of a value
 */
export const getDataType = (value: unknown): GraphNode['type'] => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'string' // fallback
}

/**
 * Calculates the visual size of a node based on its content
 */
export const calculateNodeSize = (value: unknown): number => {
  const baseSize = 20
  const type = getDataType(value)

  switch (type) {
    case 'object':
      if (value && typeof value === 'object') {
        const keyCount = Object.keys(value as Record<string, unknown>).length
        return baseSize + Math.min(keyCount * 2, 30) // Max additional size of 30
      }
      return baseSize

    case 'array':
      if (Array.isArray(value)) {
        return baseSize + Math.min(value.length * 1.5, 25) // Max additional size of 25
      }
      return baseSize

    case 'string':
      if (typeof value === 'string') {
        return baseSize + Math.min(value.length * 0.5, 20) // Max additional size of 20
      }
      return baseSize

    case 'number':
    case 'boolean':
    case 'null':
    default:
      return baseSize
  }
}

/**
 * Main class for building graph data from JSON
 */
export class GraphBuilder {
  /**
   * Converts JSON data to graph nodes and links
   */
  static buildGraph(jsonData: unknown): GraphData {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    if (jsonData === null || jsonData === undefined) {
      return { nodes, links }
    }

    // Start traversal from root
    this.traverse(jsonData, [], null, 0, nodes, links)

    return { nodes, links }
  }

  /**
   * Recursively traverses JSON data to build graph nodes and links
   */
  private static traverse(
    data: unknown,
    path: string[],
    parent: GraphNode | null,
    depth: number,
    nodes: GraphNode[],
    links: GraphLink[],
  ): void {
    const nodeId = pathToId(path)
    const key = path.length === 0 ? 'root' : path[path.length - 1]

    const node: GraphNode = {
      id: nodeId,
      key,
      value: data,
      type: getDataType(data),
      path: [...path],
      depth,
      size: calculateNodeSize(data),
      children: [],
      parent: parent?.id,
    }

    nodes.push(node)

    // Create link to parent if exists
    if (parent) {
      const linkType = Array.isArray(parent.value) ? 'array-item' : 'parent-child'
      links.push({
        source: parent.id,
        target: nodeId,
        type: linkType,
        strength: this.calculateLinkStrength(linkType, depth),
      })
      parent.children.push(nodeId)
    }

    // Recursively process children
    if (data !== null && typeof data === 'object') {
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          this.traverse(item, [...path, String(index)], node, depth + 1, nodes, links)
        })
      } else {
        Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
          this.traverse(value, [...path, key], node, depth + 1, nodes, links)
        })
      }
    }
  }

  /**
   * Calculates link strength based on type and depth
   */
  private static calculateLinkStrength(linkType: GraphLink['type'], depth: number): number {
    const baseStrength = linkType === 'array-item' ? 0.8 : 1.0
    // Reduce strength for deeper nodes to prevent overcrowding
    const depthFactor = Math.max(0.3, 1 - depth * 0.1)
    return baseStrength * depthFactor
  }

  /**
   * Builds a subgraph starting from a specific node
   */
  static buildSubgraph(jsonData: unknown, startPath: string[]): GraphData {
    const fullGraph = this.buildGraph(jsonData)
    const startId = pathToId(startPath)

    // Find the starting node
    const startNode = fullGraph.nodes.find((node) => node.id === startId)
    if (!startNode) {
      return { nodes: [], links: [] }
    }

    // Get all descendant nodes
    const descendantIds = new Set<string>()
    const collectDescendants = (nodeId: string) => {
      descendantIds.add(nodeId)
      const node = fullGraph.nodes.find((n) => n.id === nodeId)
      if (node) {
        node.children.forEach((childId) => collectDescendants(childId))
      }
    }

    collectDescendants(startId)

    // Filter nodes and links
    const nodes = fullGraph.nodes.filter((node) => descendantIds.has(node.id))
    const links = fullGraph.links.filter((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id
      const targetId = typeof link.target === 'string' ? link.target : link.target.id
      return descendantIds.has(sourceId) && descendantIds.has(targetId)
    })

    return { nodes, links }
  }

  /**
   * Gets statistics about the graph structure
   */
  static getGraphStats(graphData: GraphData): {
    nodeCount: number
    linkCount: number
    maxDepth: number
    nodesByType: Record<GraphNode['type'], number>
    avgChildrenPerNode: number
  } {
    const { nodes, links } = graphData
    const nodesByType: Record<GraphNode['type'], number> = {
      object: 0,
      array: 0,
      string: 0,
      number: 0,
      boolean: 0,
      null: 0,
    }

    let maxDepth = 0
    let totalChildren = 0

    nodes.forEach((node) => {
      nodesByType[node.type]++
      maxDepth = Math.max(maxDepth, node.depth)
      totalChildren += node.children.length
    })

    return {
      nodeCount: nodes.length,
      linkCount: links.length,
      maxDepth,
      nodesByType,
      avgChildrenPerNode: nodes.length > 0 ? totalChildren / nodes.length : 0,
    }
  }
}
