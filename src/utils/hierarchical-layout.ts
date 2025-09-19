/**
 * JSONCrack-style hierarchical layout engine
 * Implements left-to-right hierarchical positioning with proper spacing
 */

import type { GraphNode } from '@/types'

export interface HierarchicalLayoutOptions {
  nodeSpacing: number // Vertical spacing between nodes at the same level
  levelSpacing: number // Horizontal spacing between levels
  nodeWidth: number // Default node width
  nodeHeight: number // Default node height
  direction: 'horizontal' | 'vertical' // Layout direction (JSONCrack uses horizontal)
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface LayoutBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface NodeLayout {
  node: GraphNode
  x: number
  y: number
  width: number
  height: number
  level: number
  siblings: number
  siblingIndex: number
}

const DEFAULT_OPTIONS: HierarchicalLayoutOptions = {
  nodeSpacing: 60, // Reduced for more compact vertical spacing
  levelSpacing: 200, // Reasonable horizontal level spacing
  nodeWidth: 160,
  nodeHeight: 80,
  direction: 'horizontal',
  padding: {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50,
  },
}

/**
 * Hierarchical layout engine for JSONCrack-style positioning
 */
export class HierarchicalLayout {
  private options: HierarchicalLayoutOptions
  private nodeLayouts: Map<string, NodeLayout> = new Map()
  private levelHeights: Map<number, number> = new Map()
  private levelNodeCounts: Map<number, number> = new Map()
  private canvasWidth: number = 800
  private canvasHeight: number = 600

  constructor(options: Partial<HierarchicalLayoutOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Set canvas dimensions for better centering
   */
  setCanvasDimensions(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
  }

  /**
   * Calculate positions for all nodes using hierarchical layout
   */
  calculatePositions(nodes: GraphNode[]): GraphNode[] {
    if (nodes.length === 0) return []

    // Reset internal state
    this.nodeLayouts.clear()
    this.levelHeights.clear()
    this.levelNodeCounts.clear()

    // Group nodes by depth level
    const nodesByLevel = this.groupNodesByLevel(nodes)

    // Calculate level statistics
    this.calculateLevelStatistics(nodesByLevel)

    // Position nodes level by level
    const positionedNodes = this.positionNodesByLevel(nodesByLevel)

    return positionedNodes
  }

  /**
   * Get the bounds of the entire layout
   */
  getLayoutBounds(nodes: GraphNode[]): LayoutBounds {
    if (nodes.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
      }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    nodes.forEach((node) => {
      const x = node.x || 0
      const y = node.y || 0
      const width = node.width || this.options.nodeWidth
      const height = node.height || this.options.nodeHeight

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + width)
      maxY = Math.max(maxY, y + height)
    })

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  /**
   * Update layout options
   */
  updateOptions(options: Partial<HierarchicalLayoutOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Group nodes by their depth level
   */
  private groupNodesByLevel(nodes: GraphNode[]): Map<number, GraphNode[]> {
    const nodesByLevel = new Map<number, GraphNode[]>()

    nodes.forEach((node) => {
      const level = node.depth
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(node)
    })

    // Sort nodes within each level by their path for consistent ordering
    nodesByLevel.forEach((levelNodes) => {
      levelNodes.sort((a, b) => {
        // Sort by path length first, then alphabetically
        if (a.path.length !== b.path.length) {
          return a.path.length - b.path.length
        }
        return a.path.join('.').localeCompare(b.path.join('.'))
      })
    })

    return nodesByLevel
  }

  /**
   * Calculate statistics for each level (height requirements, node counts)
   */
  private calculateLevelStatistics(nodesByLevel: Map<number, GraphNode[]>): void {
    nodesByLevel.forEach((levelNodes, level) => {
      // Calculate total height needed for this level with proper spacing
      let totalHeight = 0
      let maxNodeHeight = 0

      levelNodes.forEach((node, index) => {
        const nodeHeight = node.height || this.options.nodeHeight
        maxNodeHeight = Math.max(maxNodeHeight, nodeHeight)
        totalHeight += nodeHeight

        // Add spacing between nodes, but account for potential horizontal arrangement
        if (index < levelNodes.length - 1) {
          // Use dynamic spacing based on node content
          const spacing = Math.max(this.options.nodeSpacing, nodeHeight * 0.2)
          totalHeight += spacing
        }
      })

      // Store both total height and max height for layout calculations
      this.levelHeights.set(level, totalHeight)
      this.levelNodeCounts.set(level, levelNodes.length)
    })
  }

  /**
   * Position nodes level by level using JSONCrack-style left-to-right layout
   */
  private positionNodesByLevel(nodesByLevel: Map<number, GraphNode[]>): GraphNode[] {
    const positionedNodes: GraphNode[] = []

    // Calculate total height needed for each level to enable vertical centering
    const levelHeights = new Map<number, number>()
    nodesByLevel.forEach((levelNodes, level) => {
      let totalHeight = 0
      levelNodes.forEach((node, index) => {
        const nodeHeight = node.height || this.options.nodeHeight
        totalHeight += nodeHeight
        if (index < levelNodes.length - 1) {
          totalHeight += this.options.nodeSpacing
        }
      })
      levelHeights.set(level, totalHeight)
    })

    // Position nodes level by level, handling both vertical and horizontal spacing
    nodesByLevel.forEach((levelNodes, level) => {
      const levelX = this.calculateLevelX(level)
      const totalLevelHeight = levelHeights.get(level) || 0

      // Calculate starting Y position to center this level's nodes vertically
      const startY = Math.max(this.options.padding.top, (this.canvasHeight - totalLevelHeight) / 2)

      let currentY = startY
      let maxXInLevel = levelX

      levelNodes.forEach((node, siblingIndex) => {
        const nodeWidth = node.width || this.options.nodeWidth
        const nodeHeight = node.height || this.options.nodeHeight

        // Calculate position for this node
        let nodeX = levelX
        const nodeY = currentY

        // Add horizontal spacing if there are multiple nodes at this level
        if (siblingIndex > 0) {
          // Find a position that doesn't overlap with existing nodes at this level
          nodeX = this.findNonOverlappingXPosition(
            positionedNodes.filter((n) => n.depth === level),
            nodeWidth,
            nodeHeight,
            nodeY,
            levelX,
          )
        }

        // Create node layout info
        const nodeLayout: NodeLayout = {
          node,
          x: nodeX,
          y: nodeY,
          width: nodeWidth,
          height: nodeHeight,
          level,
          siblings: levelNodes.length,
          siblingIndex,
        }

        this.nodeLayouts.set(node.id, nodeLayout)

        // Create positioned node
        const positionedNode: GraphNode = {
          ...node,
          x: nodeX,
          y: nodeY,
          width: nodeWidth,
          height: nodeHeight,
        }

        positionedNodes.push(positionedNode)

        // Update positions for next node
        maxXInLevel = Math.max(maxXInLevel, nodeX + nodeWidth)
        currentY += nodeHeight + this.options.nodeSpacing
      })
    })

    return positionedNodes
  }

  /**
   * Calculate X position for a given level (JSONCrack style: left-to-right)
   */
  private calculateLevelX(level: number): number {
    return this.options.padding.left + level * this.options.levelSpacing
  }

  /**
   * Find a non-overlapping X position for a node at a given level
   */
  private findNonOverlappingXPosition(
    existingNodesAtLevel: GraphNode[],
    nodeWidth: number,
    nodeHeight: number,
    nodeY: number,
    baseX: number,
  ): number {
    const horizontalSpacing = 20 // Minimum horizontal spacing between nodes

    // If no existing nodes, use base position
    if (existingNodesAtLevel.length === 0) {
      return baseX
    }

    // Find the rightmost position of existing nodes that might overlap vertically
    let rightmostX = baseX

    for (const existingNode of existingNodesAtLevel) {
      const existingY = existingNode.y || 0
      const existingHeight = existingNode.height || this.options.nodeHeight
      const existingX = existingNode.x || 0
      const existingWidth = existingNode.width || this.options.nodeWidth

      // Check if there's vertical overlap
      const verticalOverlap = !(
        nodeY >= existingY + existingHeight || // New node is below existing
        nodeY + nodeHeight <= existingY // New node is above existing
      )

      if (verticalOverlap) {
        // There's vertical overlap, so we need horizontal separation
        rightmostX = Math.max(rightmostX, existingX + existingWidth + horizontalSpacing)
      }
    }

    return rightmostX
  }

  /**
   * Get layout information for a specific node
   */
  getNodeLayout(nodeId: string): NodeLayout | undefined {
    return this.nodeLayouts.get(nodeId)
  }

  /**
   * Calculate optimal spacing based on node content and relationships
   */
  calculateOptimalSpacing(nodes: GraphNode[]): {
    nodeSpacing: number
    levelSpacing: number
  } {
    if (nodes.length === 0) {
      return {
        nodeSpacing: this.options.nodeSpacing,
        levelSpacing: this.options.levelSpacing,
      }
    }

    // Calculate statistics about node dimensions
    const heights = nodes.map((n) => n.height || this.options.nodeHeight)
    const widths = nodes.map((n) => n.width || this.options.nodeWidth)

    const avgNodeHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length
    const maxNodeHeight = Math.max(...heights)
    const avgNodeWidth = widths.reduce((sum, w) => sum + w, 0) / widths.length
    const maxNodeWidth = Math.max(...widths)

    // Calculate node density per level
    const nodesByLevel = new Map<number, number>()
    nodes.forEach((node) => {
      const level = node.depth
      nodesByLevel.set(level, (nodesByLevel.get(level) || 0) + 1)
    })
    const maxNodesPerLevel = Math.max(...nodesByLevel.values())

    // Adjust spacing based on content and density
    // More spacing needed for larger nodes and denser levels
    const nodeSpacing = Math.max(
      30, // Minimum spacing
      avgNodeHeight * 0.4, // Base on average height
      maxNodeHeight * 0.2, // Account for largest nodes
    )

    const levelSpacing = Math.max(
      200, // Minimum level spacing
      avgNodeWidth * 1.3, // Base on average width
      maxNodeWidth * 1.1, // Account for largest nodes
      maxNodesPerLevel * 20, // More spacing for denser levels
    )

    return {
      nodeSpacing,
      levelSpacing,
    }
  }

  /**
   * Validate layout to ensure no overlaps
   */
  validateLayout(nodes: GraphNode[]): {
    isValid: boolean
    overlaps: Array<{ nodeA: string; nodeB: string }>
    issues: string[]
  } {
    const overlaps: Array<{ nodeA: string; nodeB: string }> = []
    const issues: string[] = []

    // Check for node overlaps
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]

        if (this.nodesOverlap(nodeA, nodeB)) {
          overlaps.push({ nodeA: nodeA.id, nodeB: nodeB.id })
        }
      }
    }

    // Check for nodes outside reasonable bounds
    nodes.forEach((node) => {
      if ((node.x || 0) < 0 || (node.y || 0) < 0) {
        issues.push(`Node ${node.id} has negative coordinates`)
      }
    })

    return {
      isValid: overlaps.length === 0 && issues.length === 0,
      overlaps,
      issues,
    }
  }

  /**
   * Check if two nodes overlap
   */
  private nodesOverlap(nodeA: GraphNode, nodeB: GraphNode): boolean {
    const aX = nodeA.x || 0
    const aY = nodeA.y || 0
    const aWidth = nodeA.width || this.options.nodeWidth
    const aHeight = nodeA.height || this.options.nodeHeight

    const bX = nodeB.x || 0
    const bY = nodeB.y || 0
    const bWidth = nodeB.width || this.options.nodeWidth
    const bHeight = nodeB.height || this.options.nodeHeight

    // Check for overlap using axis-aligned bounding box collision
    return !(
      aX + aWidth <= bX || // A is to the left of B
      bX + bWidth <= aX || // B is to the left of A
      aY + aHeight <= bY || // A is above B
      bY + bHeight <= aY // B is above A
    )
  }

  /**
   * Get statistics about the current layout
   */
  getLayoutStats(nodes: GraphNode[]): {
    totalNodes: number
    levels: number
    averageNodesPerLevel: number
    layoutBounds: LayoutBounds
    spacing: {
      nodeSpacing: number
      levelSpacing: number
    }
  } {
    const bounds = this.getLayoutBounds(nodes)
    const levels = new Set(nodes.map((n) => n.depth)).size

    return {
      totalNodes: nodes.length,
      levels,
      averageNodesPerLevel: levels > 0 ? nodes.length / levels : 0,
      layoutBounds: bounds,
      spacing: {
        nodeSpacing: this.options.nodeSpacing,
        levelSpacing: this.options.levelSpacing,
      },
    }
  }
}

/**
 * Utility function to create a hierarchical layout with default options
 */
export function createHierarchicalLayout(
  nodes: GraphNode[],
  options: Partial<HierarchicalLayoutOptions> = {},
): GraphNode[] {
  const layout = new HierarchicalLayout(options)
  return layout.calculatePositions(nodes)
}

/**
 * Utility function to calculate optimal layout bounds for a container
 */
export function calculateLayoutBounds(
  nodes: GraphNode[],
  options: Partial<HierarchicalLayoutOptions> = {},
): LayoutBounds {
  const layout = new HierarchicalLayout(options)
  return layout.getLayoutBounds(nodes)
}
