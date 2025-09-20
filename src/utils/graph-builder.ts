// Graph data transformation utilities

import type { JSONValue, GraphNode, NodeProperty } from '@/types'

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
 * Calculates the width of a rectangular node based on its properties
 */
export const calculateNodeWidth = (properties: NodeProperty[]): number => {
  const minWidth = 120
  const maxWidth = 300
  const padding = 20

  // Calculate width based on longest property text
  let maxTextLength = 0
  properties.forEach((prop) => {
    const keyText = String(prop.key)
    const valueText = formatPropertyValue(prop.value, prop.type)
    const combinedLength = keyText.length + valueText.length + 3 // +3 for ": " separator
    maxTextLength = Math.max(maxTextLength, combinedLength)
  })

  const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, maxTextLength * 8 + padding))
  return calculatedWidth
}

/**
 * Calculates the height of a rectangular node based on its properties
 */
export const calculateNodeHeight = (properties: NodeProperty[]): number => {
  const headerHeight = 24 // Height for node header (key/type)
  const propertyHeight = 20 // Height per property row
  const padding = 16 // Top and bottom padding

  return headerHeight + properties.length * propertyHeight + padding
}

/**
 * Formats a property value for display in the node
 */
export const formatPropertyValue = (value: unknown, type: NodeProperty['type']): string => {
  switch (type) {
    case 'string':
      const str = String(value)
      return str.length > 20 ? `"${str.substring(0, 20)}..."` : `"${str}"`
    case 'number':
    case 'boolean':
      return String(value)
    case 'null':
      return 'null'
    case 'object':
      return '{...}'
    case 'array':
      return Array.isArray(value) ? `[${value.length}]` : '[...]'
    default:
      return String(value)
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
    const properties: NodeProperty[] = []
    const children: string[] = []

    // For objects and arrays, create properties for all key-value pairs
    if (data !== null && typeof data === 'object') {
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          const valueType = getDataType(item)
          const isContainer = valueType === 'object' || valueType === 'array'

          if (isContainer) {
            // This property will connect to a child node
            const childNodeId = [...path, String(index)].join('.')
            properties.push({
              key: index,
              value: item,
              type: valueType,
              hasChildNode: true,
              childNodeId,
            })
            children.push(childNodeId)
          } else {
            // This property is displayed inline (primitive value)
            properties.push({
              key: index,
              value: item,
              type: valueType,
              hasChildNode: false,
            })
          }
        })
      } else {
        // Sort object keys alphabetically before processing
        const sortedEntries = Object.entries(data as Record<string, unknown>).sort(
          ([keyA], [keyB]) => keyA.localeCompare(keyB),
        )

        sortedEntries.forEach(([key, value]) => {
          const valueType = getDataType(value)
          const isContainer = valueType === 'object' || valueType === 'array'

          if (isContainer) {
            // This property will connect to a child node
            const childNodeId = [...path, key].join('.')
            properties.push({
              key,
              value,
              type: valueType,
              hasChildNode: true,
              childNodeId,
            })
            children.push(childNodeId)
          } else {
            // This property is displayed inline (primitive value)
            properties.push({
              key,
              value,
              type: valueType,
              hasChildNode: false,
            })
          }
        })
      }
    } else {
      // For primitive values, create a single property
      properties.push({
        key: key || 'value',
        value: data,
        type: getDataType(data),
        hasChildNode: false,
      })
    }

    const node: GraphNode = {
      id: nodeId,
      key,
      value: data,
      type: getDataType(data),
      path: [...path],
      depth,
      size: calculateNodeSize(data),
      width: calculateNodeWidth(properties),
      height: calculateNodeHeight(properties),
      children,
      parent: parent?.id,
      isExpanded: true,
      hasChildren: children.length > 0,
      properties,
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
      // Don't add to parent.children here - it's already populated when the parent was created
    }

    // Recursively process child nodes (only for container types)
    children.forEach((childId) => {
      const childPath = idToPath(childId)
      const childKey = childPath[childPath.length - 1]
      let childValue: unknown

      if (Array.isArray(data)) {
        childValue = data[parseInt(childKey)]
      } else if (data && typeof data === 'object') {
        childValue = (data as Record<string, unknown>)[childKey]
      }

      this.traverse(childValue, childPath, node, depth + 1, nodes, links)
    })
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
