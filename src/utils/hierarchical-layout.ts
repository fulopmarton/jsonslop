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
  nodeSpacing: 60, // Reduced since we now use balanced columns
  levelSpacing: 250, // Increased to accommodate multiple columns
  nodeWidth: 150,
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
   * Position nodes level by level using balanced hierarchical layout
   */
  private positionNodesByLevel(nodesByLevel: Map<number, GraphNode[]>): GraphNode[] {
    const positionedNodes: GraphNode[] = []

    // Position root nodes first
    const rootNodes = nodesByLevel.get(0) || []
    if (rootNodes.length > 0) {
      this.positionRootNodes(rootNodes, positionedNodes)
    }

    // Position child nodes level by level
    for (let level = 1; level <= Math.max(...nodesByLevel.keys()); level++) {
      const levelNodes = nodesByLevel.get(level) || []
      this.positionLevelNodes(levelNodes, positionedNodes, level)
    }

    return positionedNodes
  }

  /**
   * Position root nodes
   */
  private positionRootNodes(rootNodes: GraphNode[], positionedNodes: GraphNode[]): void {
    const startY = this.options.padding.top
    let currentY = startY

    rootNodes.forEach((node, index) => {
      const nodeWidth = node.width || this.options.nodeWidth
      const nodeHeight = node.height || this.options.nodeHeight
      const nodeX = this.options.padding.left
      const nodeY = currentY

      const nodeLayout: NodeLayout = {
        node,
        x: nodeX,
        y: nodeY,
        width: nodeWidth,
        height: nodeHeight,
        level: 0,
        siblings: rootNodes.length,
        siblingIndex: index,
      }

      this.nodeLayouts.set(node.id, nodeLayout)

      const positionedNode: GraphNode = {
        ...node,
        x: nodeX,
        y: nodeY,
        width: nodeWidth,
        height: nodeHeight,
      }

      positionedNodes.push(positionedNode)
      currentY += nodeHeight + this.options.nodeSpacing
    })
  }

  /**
   * Position nodes at a specific level
   */
  private positionLevelNodes(
    levelNodes: GraphNode[],
    positionedNodes: GraphNode[],
    level: number,
  ): void {
    // Group level nodes by parent
    const nodesByParent = new Map<string, GraphNode[]>()
    levelNodes.forEach((node) => {
      const parentId = node.parent || 'root'
      if (!nodesByParent.has(parentId)) {
        nodesByParent.set(parentId, [])
      }
      nodesByParent.get(parentId)!.push(node)
    })

    // Position each group of siblings
    nodesByParent.forEach((siblings, parentId) => {
      const parentNode = positionedNodes.find((n) => n.id === parentId)
      if (!parentNode) return

      this.positionSiblings(siblings, parentNode, positionedNodes, level)
    })
  }

  /**
   * Position siblings in a balanced arrangement around their parent
   */
  private positionSiblings(
    siblings: GraphNode[],
    parentNode: GraphNode,
    positionedNodes: GraphNode[],
    level: number,
  ): void {
    if (siblings.length === 0) return

    const baseX = this.calculateLevelX(level)
    const parentY = parentNode.y || 0
    const parentHeight = parentNode.height || this.options.nodeHeight

    // For single child, center it with parent
    if (siblings.length === 1) {
      const node = siblings[0]
      const nodeWidth = node.width || this.options.nodeWidth
      const nodeHeight = node.height || this.options.nodeHeight

      const nodeX = this.findNonOverlappingXPosition(
        positionedNodes.filter((n) => n.depth === level),
        nodeWidth,
        nodeHeight,
        parentY + (parentHeight - nodeHeight) / 2,
        baseX,
      )

      this.addPositionedNode(
        node,
        nodeX,
        parentY + (parentHeight - nodeHeight) / 2,
        level,
        siblings.length,
        0,
        positionedNodes,
      )
      return
    }

    // For multiple children, arrange in balanced columns
    const maxChildrenPerColumn = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(siblings.length))))
    const columns = Math.ceil(siblings.length / maxChildrenPerColumn)

    let globalMinY = Infinity
    let globalMaxY = -Infinity

    // Calculate total height needed for all columns
    for (let col = 0; col < columns; col++) {
      const startIndex = col * maxChildrenPerColumn
      const endIndex = Math.min(startIndex + maxChildrenPerColumn, siblings.length)
      const columnNodes = siblings.slice(startIndex, endIndex)

      let columnHeight = 0
      columnNodes.forEach((node, index) => {
        const nodeHeight = node.height || this.options.nodeHeight
        columnHeight += nodeHeight
        if (index < columnNodes.length - 1) {
          columnHeight += this.options.nodeSpacing
        }
      })

      const columnStartY = parentY + (parentHeight - columnHeight) / 2
      globalMinY = Math.min(globalMinY, columnStartY)
      globalMaxY = Math.max(globalMaxY, columnStartY + columnHeight)
    }

    // Position nodes in each column
    for (let col = 0; col < columns; col++) {
      const startIndex = col * maxChildrenPerColumn
      const endIndex = Math.min(startIndex + maxChildrenPerColumn, siblings.length)
      const columnNodes = siblings.slice(startIndex, endIndex)

      // Calculate column height
      let columnHeight = 0
      columnNodes.forEach((node, index) => {
        const nodeHeight = node.height || this.options.nodeHeight
        columnHeight += nodeHeight
        if (index < columnNodes.length - 1) {
          columnHeight += this.options.nodeSpacing
        }
      })

      // Center column relative to parent
      const columnStartY = parentY + (parentHeight - columnHeight) / 2
      let currentY = columnStartY

      // Position each node in this column
      columnNodes.forEach((node, nodeIndex) => {
        const nodeWidth = node.width || this.options.nodeWidth
        const nodeHeight = node.height || this.options.nodeHeight
        const xOffset = col * 200 // Horizontal spacing between columns

        const nodeX = this.findNonOverlappingXPosition(
          positionedNodes.filter((n) => n.depth === level),
          nodeWidth,
          nodeHeight,
          currentY,
          baseX + xOffset,
        )

        this.addPositionedNode(
          node,
          nodeX,
          currentY,
          level,
          siblings.length,
          startIndex + nodeIndex,
          positionedNodes,
        )
        currentY += nodeHeight + this.options.nodeSpacing
      })
    }
  }

  /**
   * Helper method to add a positioned node
   */
  private addPositionedNode(
    node: GraphNode,
    x: number,
    y: number,
    level: number,
    siblings: number,
    siblingIndex: number,
    positionedNodes: GraphNode[],
  ): void {
    const nodeWidth = node.width || this.options.nodeWidth
    const nodeHeight = node.height || this.options.nodeHeight

    const nodeLayout: NodeLayout = {
      node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      level,
      siblings,
      siblingIndex,
    }

    this.nodeLayouts.set(node.id, nodeLayout)

    const positionedNode: GraphNode = {
      ...node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
    }

    positionedNodes.push(positionedNode)
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
    const horizontalSpacing = 25 // Minimum horizontal spacing between nodes
    const verticalBuffer = 10 // Buffer zone for vertical overlap detection

    // If no existing nodes, use base position
    if (existingNodesAtLevel.length === 0) {
      return baseX
    }

    // Sort existing nodes by X position for more efficient checking
    const sortedNodes = [...existingNodesAtLevel].sort((a, b) => (a.x || 0) - (b.x || 0))

    // Find all nodes that vertically overlap with the new node
    const verticallyOverlappingNodes = sortedNodes.filter((existingNode) => {
      const existingY = existingNode.y || 0
      const existingHeight = existingNode.height || this.options.nodeHeight

      // Check if there's vertical overlap with buffer zone
      return !(
        nodeY >= existingY + existingHeight + verticalBuffer || // New node is below existing (with buffer)
        nodeY + nodeHeight + verticalBuffer <= existingY // New node is above existing (with buffer)
      )
    })

    // If no vertical overlaps, we can use the base position
    if (verticallyOverlappingNodes.length === 0) {
      return baseX
    }

    // Try the base position first
    const candidateX = baseX
    let isValidPosition = false

    // Check if base position works
    isValidPosition = !verticallyOverlappingNodes.some((existingNode) => {
      const existingX = existingNode.x || 0
      const existingWidth = existingNode.width || this.options.nodeWidth

      return !(
        candidateX >= existingX + existingWidth + horizontalSpacing || // New node is to the right
        candidateX + nodeWidth + horizontalSpacing <= existingX // New node is to the left
      )
    })

    if (isValidPosition) {
      return candidateX
    }

    // Find the rightmost position among vertically overlapping nodes
    let rightmostX = baseX
    for (const existingNode of verticallyOverlappingNodes) {
      const existingX = existingNode.x || 0
      const existingWidth = existingNode.width || this.options.nodeWidth
      rightmostX = Math.max(rightmostX, existingX + existingWidth + horizontalSpacing)
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
