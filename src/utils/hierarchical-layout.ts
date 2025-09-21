/**
 * JSONCrack-style hierarchical layout engine using d3-flextree
 * Implements left-to-right hierarchical positioning with proper spacing
 */

import { hierarchy } from 'd3'
import type { HierarchyNode } from 'd3'
import { flextree } from 'd3-flextree'
import type { GraphNode } from '@/types'

// Re-export the class name so it can be imported by other modules
export type { GraphNode } from '@/types'

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
  nodeSpacing: 15, // Vertical spacing between siblings
  levelSpacing: 120, // Horizontal spacing between parent and child
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
 * Convert a flat array of nodes into a hierarchical structure for d3
 */
function buildHierarchy(nodes: GraphNode[]): HierarchyNode<GraphNode> {
  // Create a map for quick lookup
  const nodeMap = new Map<string, GraphNode>()
  nodes.forEach(node => nodeMap.set(node.id, node))

  // Find the root node
  const root = nodes.find(node => !node.parent)
  if (!root) throw new Error('No root node found')

  // Build the hierarchy using d3.hierarchy
  return hierarchy(root, node => {
    // Get children based on the children array in the node
    return (node.children || [])
      .map(childId => nodeMap.get(childId))
      .filter((child): child is GraphNode => child !== undefined)
  })
}

/**
 * Hierarchical layout engine for JSONCrack-style positioning using d3-flextree
 */
export class HierarchicalLayout {
  private options: HierarchicalLayoutOptions
  private canvasWidth: number = 800
  private canvasHeight: number = 600
  private nodeLayouts: Map<string, NodeLayout> = new Map()

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
   * Calculate positions for all nodes using d3-flextree layout
   */
  calculatePositions(nodes: GraphNode[]): GraphNode[] {
    if (nodes.length === 0) return []

    // Reset internal state
    this.nodeLayouts.clear()

    // Build hierarchy for d3
    const root = buildHierarchy(nodes)

    // Create flextree layout
    const layout = flextree<GraphNode>()
      .nodeSize((d: HierarchyNode<GraphNode>) => {
        const node = d.data
        // For horizontal layout (left-to-right):
        // - First dimension (x) controls vertical separation
        // - Second dimension (y) controls horizontal separation
        if (this.options.direction === 'horizontal') {
          return [
            // First dimension: height determines vertical space
            (node.height || this.options.nodeHeight) + this.options.nodeSpacing,
            // Second dimension: width affects horizontal space
            (node.width || this.options.nodeWidth) + this.options.levelSpacing
          ]
        } else {
          // For vertical layout (top-to-bottom):
          return [
            (node.width || this.options.nodeWidth) + this.options.nodeSpacing,
            (node.height || this.options.nodeHeight) + this.options.levelSpacing
          ]
        }
      })
      // Add spacing between nodes
      .spacing((a: HierarchyNode<GraphNode>, b: HierarchyNode<GraphNode>) => {
        // If nodes are siblings, use minimal spacing
        if (a.parent === b.parent) {
          return this.options.direction === 'horizontal' 
            ? this.options.nodeSpacing * 0.2  // Minimal vertical spacing for siblings
            : this.options.levelSpacing // Horizontal spacing for vertical layout
        }
        // If nodes are not siblings, use slightly increased spacing
        return this.options.direction === 'horizontal'
          ? this.options.nodeSpacing * 0.4
          : this.options.levelSpacing
      })

    // Run the layout
    const layoutRoot = layout(root as HierarchyNode<GraphNode>)

    // Transform the coordinates to match JSONCrack style (left-to-right)
    layoutRoot.each((node: HierarchyNode<GraphNode>) => {
      const data = node.data
      const level = node.depth
      const siblings = node.parent?.children?.length || 1
      const siblingIndex = node.parent?.children?.indexOf(node) || 0
      
      // Calculate node dimensions
      const width = data.width || this.options.nodeWidth
      const height = data.height || this.options.nodeHeight
      
      // For horizontal layout, we swap x and y coordinates
      const nodeY = node.x || 0
      const nodeX = node.y || 0

      // Create node layout info
      const nodeLayout: NodeLayout = {
        node: data,
        // Center the node on its position, accounting for node dimensions
        x: nodeX + this.options.padding.left + width / 2,
        y: nodeY - height / 2 + this.canvasHeight / 2,
        width,
        height,
        level,
        siblings,
        siblingIndex
      }

      // Store layout info
      this.nodeLayouts.set(data.id, nodeLayout)

      // Update node with new position
      data.x = nodeLayout.x
      data.y = nodeLayout.y
      data.width = nodeLayout.width
      data.height = nodeLayout.height
    })

    return nodes
  }

  /**
   * Get the bounds of the entire layout
   */
  getLayoutBounds(nodes: GraphNode[]): LayoutBounds {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    nodes.forEach(node => {
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
      height: maxY - minY
    }
  }

  /**
   * Update layout options
   */
  updateOptions(options: Partial<HierarchicalLayoutOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get layout information for a specific node
   */
  getNodeLayout(nodeId: string): NodeLayout | undefined {
    return this.nodeLayouts.get(nodeId)
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
    const levels = new Set(nodes.map(n => n.depth)).size

    return {
      totalNodes: nodes.length,
      levels,
      averageNodesPerLevel: levels > 0 ? nodes.length / levels : 0,
      layoutBounds: bounds,
      spacing: {
        nodeSpacing: this.options.nodeSpacing,
        levelSpacing: this.options.levelSpacing
      }
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
