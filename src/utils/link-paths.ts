/**
 * Utilities for calculating curved link paths between graph nodes
 */

import type { GraphNode, GraphLink, NodeProperty } from '@/types'

export interface LinkPath {
  path: string
  sourcePoint: { x: number; y: number }
  targetPoint: { x: number; y: number }
}

export interface ConnectionPoint {
  x: number
  y: number
  propertyIndex?: number
  property?: NodeProperty
}

/**
 * Calculate the connection point for a specific property in a node
 */
export function getPropertyConnectionPoint(
  node: GraphNode,
  propertyKey: string | number,
  nodeWidth: number = 160,
  headerHeight: number = 24,
  propertyHeight: number = 20,
): ConnectionPoint | null {
  if (!node.properties) return null

  const propertyIndex = node.properties.findIndex((p) => p.key === propertyKey)
  if (propertyIndex === -1) return null

  const property = node.properties[propertyIndex]
  if (!property.hasChildNode) return null

  const x = (node.x || 0) + nodeWidth
  const y = (node.y || 0) + headerHeight + propertyIndex * propertyHeight + propertyHeight / 2

  return {
    x,
    y,
    propertyIndex,
    property,
  }
}

/**
 * Calculate the entry point for a target node (left edge, center)
 */
export function getNodeEntryPoint(
  node: GraphNode,
  nodeWidth: number = 160,
  nodeHeight: number = 80,
): ConnectionPoint {
  const x = node.x || 0
  const y = (node.y || 0) + nodeHeight / 2

  return { x, y }
}

/**
 * Find the source connection point for a link by matching the target node's key
 */
export function findSourceConnectionPoint(
  sourceNode: GraphNode,
  targetNode: GraphNode,
  nodeWidth: number = 160,
  headerHeight: number = 24,
  propertyHeight: number = 20,
): ConnectionPoint | null {
  // Find the property in the source node that connects to the target node
  const targetKey = targetNode.path[targetNode.path.length - 1]
  return getPropertyConnectionPoint(sourceNode, targetKey, nodeWidth, headerHeight, propertyHeight)
}

/**
 * Generate a curved SVG path between two points
 */
export function generateCurvedPath(
  source: ConnectionPoint,
  target: ConnectionPoint,
  curvature: number = 0.5,
): string {
  const dx = target.x - source.x
  const dy = target.y - source.y

  // Calculate control points for a smooth curve
  // For horizontal layouts, we want the curve to go right then down/up
  const controlPoint1X = source.x + Math.abs(dx) * curvature
  const controlPoint1Y = source.y

  const controlPoint2X = target.x - Math.abs(dx) * curvature
  const controlPoint2Y = target.y

  // Create cubic Bezier curve
  return `M ${source.x} ${source.y} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${target.x} ${target.y}`
}

/**
 * Calculate the complete link path for a graph link
 */
export function calculateLinkPath(
  link: GraphLink,
  nodes: GraphNode[],
  options: {
    nodeWidth?: number
    nodeHeight?: number
    headerHeight?: number
    propertyHeight?: number
    curvature?: number
  } = {},
): LinkPath | null {
  const {
    nodeWidth = 160,
    nodeHeight = 80,
    headerHeight = 24,
    propertyHeight = 20,
    curvature = 0.5,
  } = options

  // Find source and target nodes
  const sourceId = typeof link.source === 'string' ? link.source : link.source.id
  const targetId = typeof link.target === 'string' ? link.target : link.target.id

  const sourceNode = nodes.find((n) => n.id === sourceId)
  const targetNode = nodes.find((n) => n.id === targetId)

  if (!sourceNode || !targetNode) return null

  // Calculate connection points
  const sourcePoint = findSourceConnectionPoint(
    sourceNode,
    targetNode,
    nodeWidth,
    headerHeight,
    propertyHeight,
  )
  const targetPoint = getNodeEntryPoint(targetNode, nodeWidth, nodeHeight)

  if (!sourcePoint) {
    // Fallback to node center if no specific property connection found
    const fallbackSource = {
      x: (sourceNode.x || 0) + nodeWidth,
      y: (sourceNode.y || 0) + nodeHeight / 2,
    }

    return {
      path: generateCurvedPath(fallbackSource, targetPoint, curvature),
      sourcePoint: fallbackSource,
      targetPoint,
    }
  }

  return {
    path: generateCurvedPath(sourcePoint, targetPoint, curvature),
    sourcePoint,
    targetPoint,
  }
}

/**
 * Calculate link paths for multiple links
 */
export function calculateLinkPaths(
  links: GraphLink[],
  nodes: GraphNode[],
  options: {
    nodeWidth?: number
    nodeHeight?: number
    headerHeight?: number
    propertyHeight?: number
    curvature?: number
  } = {},
): Map<string, LinkPath> {
  const linkPaths = new Map<string, LinkPath>()

  links.forEach((link) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id
    const targetId = typeof link.target === 'string' ? link.target : link.target.id
    const linkKey = `${sourceId}-${targetId}`

    const linkPath = calculateLinkPath(link, nodes, options)
    if (linkPath) {
      linkPaths.set(linkKey, linkPath)
    }
  })

  return linkPaths
}

/**
 * Get the midpoint of a curved path for label positioning
 */
export function getCurvePathMidpoint(linkPath: LinkPath): { x: number; y: number } {
  const { sourcePoint, targetPoint } = linkPath

  // For a cubic Bezier curve, approximate the midpoint
  const midX = (sourcePoint.x + targetPoint.x) / 2
  const midY = (sourcePoint.y + targetPoint.y) / 2

  return { x: midX, y: midY }
}

/**
 * Calculate the angle of the path at a given point for arrow rotation
 */
export function getPathAngleAtEnd(linkPath: LinkPath): number {
  const { sourcePoint, targetPoint } = linkPath

  // Calculate angle from source to target
  const dx = targetPoint.x - sourcePoint.x
  const dy = targetPoint.y - sourcePoint.y

  return Math.atan2(dy, dx) * (180 / Math.PI)
}
