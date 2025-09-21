/**
 * Native layout engine without D3 dependencies
 * Provides hierarchical and force-directed layout algorithms
 */

import { ref, type Ref } from 'vue'
import type { GraphNode, GraphLink, LayoutStats } from '@/types'
import { HierarchicalLayout } from '@/utils/hierarchical-layout'

export interface NativeLayoutOptions {
  width: number
  height: number
  nodeSpacing: number
  levelSpacing: number
  centerForce: number
  iterations: number
  layoutType: 'hierarchical' | 'force'
}

export interface UseNativeLayoutReturn {
  nodes: Ref<GraphNode[]>
  links: Ref<GraphLink[]>
  stats: Ref<LayoutStats>
  isRunning: Ref<boolean>
  initialize: (nodes: GraphNode[], links: GraphLink[]) => void
  start: () => void
  stop: () => void
  updateOptions: (options: Partial<NativeLayoutOptions>) => void
  onTick: (callback: (stats: LayoutStats) => void) => void
  onEnd: (callback: (stats: LayoutStats) => void) => void
}

const DEFAULT_OPTIONS: NativeLayoutOptions = {
  width: 800,
  height: 600,
  nodeSpacing: 80,
  levelSpacing: 220,
  centerForce: 0.1,
  iterations: 300,
  layoutType: 'hierarchical',
}

export function useNativeLayout(options: Partial<NativeLayoutOptions> = {}): UseNativeLayoutReturn {
  const layoutOptions = ref({ ...DEFAULT_OPTIONS, ...options })
  const nodes = ref<GraphNode[]>([])
  const links = ref<GraphLink[]>([])
  const isRunning = ref(false)

  const stats = ref<LayoutStats>({
    iterations: 0,
    alpha: 1,
    isConverged: false,
    averageVelocity: 0,
    maxVelocity: 0,
    frameRate: 0,
    lastTickTime: 0,
  })

  // Callbacks
  const tickCallbacks: Array<(stats: LayoutStats) => void> = []
  const endCallbacks: Array<(stats: LayoutStats) => void> = []

  // Animation frame tracking
  let animationId: number | null = null
  let startTime = 0
  let lastFrameTime = 0

  // Hierarchical layout engine
  const hierarchicalLayout = new HierarchicalLayout({
    nodeSpacing: layoutOptions.value.nodeSpacing,
    levelSpacing: layoutOptions.value.levelSpacing,
    nodeWidth: 150,
    nodeHeight: 80,
    direction: 'horizontal',
    padding: {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    },
  })

  // Calculate hierarchical layout positions using the dedicated engine
  const calculateHierarchicalLayout = (nodeList: GraphNode[]): GraphNode[] => {
    if (nodeList.length === 0) return []

    // Set canvas dimensions for proper centering
    hierarchicalLayout.setCanvasDimensions(layoutOptions.value.width, layoutOptions.value.height)

    // Update hierarchical layout options
    hierarchicalLayout.updateOptions({
      nodeSpacing: layoutOptions.value.nodeSpacing,
      levelSpacing: layoutOptions.value.levelSpacing,
    })

    // Calculate positions using the hierarchical layout engine
    const positionedNodes = hierarchicalLayout.calculatePositions(nodeList)

    // Initialize velocity properties for potential force simulation
    return positionedNodes.map((node) => ({
      ...node,
      vx: 0,
      vy: 0,
    }))
  }

  // Simple force simulation step
  const simulationStep = (nodeList: GraphNode[], linkList: GraphLink[]): GraphNode[] => {
    const alpha = Math.max(0, 1 - stats.value.iterations / layoutOptions.value.iterations)
    const updatedNodes = [...nodeList]

    // Apply center force
    const centerX = layoutOptions.value.width / 2
    const centerY = layoutOptions.value.height / 2

    updatedNodes.forEach((node) => {
      if (node.x !== undefined && node.y !== undefined) {
        const dx = centerX - node.x
        const dy = centerY - node.y

        node.vx = (node.vx || 0) + dx * layoutOptions.value.centerForce * alpha
        node.vy = (node.vy || 0) + dy * layoutOptions.value.centerForce * alpha
      }
    })

    // Apply link forces
    linkList.forEach((link) => {
      const sourceNode = updatedNodes.find(
        (n) => n.id === (typeof link.source === 'string' ? link.source : link.source.id),
      )
      const targetNode = updatedNodes.find(
        (n) => n.id === (typeof link.target === 'string' ? link.target : link.target.id),
      )

      if (
        sourceNode &&
        targetNode &&
        sourceNode.x !== undefined &&
        sourceNode.y !== undefined &&
        targetNode.x !== undefined &&
        targetNode.y !== undefined
      ) {
        const dx = targetNode.x - sourceNode.x
        const dy = targetNode.y - sourceNode.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        const targetDistance = 100

        const force = ((distance - targetDistance) / distance) * alpha * 0.1
        const fx = dx * force
        const fy = dy * force

        sourceNode.vx = (sourceNode.vx || 0) + fx
        sourceNode.vy = (sourceNode.vy || 0) + fy
        targetNode.vx = (targetNode.vx || 0) - fx
        targetNode.vy = (targetNode.vy || 0) - fy
      }
    })

    // Apply repulsion between nodes
    for (let i = 0; i < updatedNodes.length; i++) {
      for (let j = i + 1; j < updatedNodes.length; j++) {
        const nodeA = updatedNodes[i]
        const nodeB = updatedNodes[j]

        if (
          nodeA.x !== undefined &&
          nodeA.y !== undefined &&
          nodeB.x !== undefined &&
          nodeB.y !== undefined
        ) {
          const dx = nodeB.x - nodeA.x
          const dy = nodeB.y - nodeA.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1

          if (distance < 150) {
            const force = ((150 - distance) / distance) * alpha * 0.05
            const fx = dx * force
            const fy = dy * force

            nodeA.vx = (nodeA.vx || 0) - fx
            nodeA.vy = (nodeA.vy || 0) - fy
            nodeB.vx = (nodeB.vx || 0) + fx
            nodeB.vy = (nodeB.vy || 0) + fy
          }
        }
      }
    }

    // Update positions and apply damping
    let totalVelocity = 0
    let maxVelocity = 0

    updatedNodes.forEach((node) => {
      if (node.vx !== undefined && node.vy !== undefined) {
        // Apply damping
        node.vx *= 0.9
        node.vy *= 0.9

        // Update position
        if (node.x !== undefined && node.y !== undefined) {
          node.x += node.vx
          node.y += node.vy
        }

        // Calculate velocity for stats
        const velocity = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
        totalVelocity += velocity
        maxVelocity = Math.max(maxVelocity, velocity)
      }
    })

    // Update stats
    stats.value = {
      ...stats.value,
      alpha,
      averageVelocity: totalVelocity / updatedNodes.length,
      maxVelocity,
      isConverged: alpha < 0.01 || stats.value.averageVelocity < 0.1,
    }

    return updatedNodes
  }

  // Animation loop
  const animate = () => {
    if (!isRunning.value) return

    const now = performance.now()
    if (startTime === 0) startTime = now

    // Calculate frame rate
    if (lastFrameTime > 0) {
      const frameDuration = now - lastFrameTime
      stats.value.frameRate = 1000 / frameDuration
    }
    lastFrameTime = now

    stats.value.iterations++
    stats.value.lastTickTime = now

    // Run simulation step
    nodes.value = simulationStep(nodes.value, links.value)

    // Notify tick callbacks
    tickCallbacks.forEach((callback) => callback(stats.value))

    // Check for completion
    if (stats.value.iterations >= layoutOptions.value.iterations || stats.value.isConverged) {
      stop()
      endCallbacks.forEach((callback) => callback(stats.value))
      return
    }

    // Continue animation
    animationId = requestAnimationFrame(animate)
  }

  // Initialize layout with nodes and links
  const initialize = (nodeList: GraphNode[], linkList: GraphLink[]) => {
    stop() // Stop any running animation

    // Reset stats
    stats.value = {
      iterations: 0,
      alpha: 1,
      isConverged: false,
      averageVelocity: 0,
      maxVelocity: 0,
      frameRate: 0,
      lastTickTime: 0,
    }

    // Choose layout algorithm based on options
    if (layoutOptions.value.layoutType === 'hierarchical') {
      // Use hierarchical layout (JSONCrack style) - no animation needed
      nodes.value = calculateHierarchicalLayout(nodeList)
      links.value = [...linkList]

      // Mark as converged immediately for hierarchical layout
      stats.value.isConverged = true
      stats.value.alpha = 0
    } else {
      // Use force-directed layout with animation
      nodes.value = calculateHierarchicalLayout(nodeList) // Start with hierarchical positions
      links.value = [...linkList]
    }

    startTime = 0
    lastFrameTime = 0
  }

  // Start animation
  const start = () => {
    if (isRunning.value) return

    // For hierarchical layout, no animation is needed
    if (layoutOptions.value.layoutType === 'hierarchical') {
      // Immediately call end callbacks since layout is already complete
      endCallbacks.forEach((callback) => callback(stats.value))
      return
    }

    isRunning.value = true
    stats.value.isConverged = false
    animationId = requestAnimationFrame(animate)
  }

  // Stop animation
  const stop = () => {
    isRunning.value = false
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }

  // Update layout options
  const updateOptions = (newOptions: Partial<NativeLayoutOptions>) => {
    layoutOptions.value = { ...layoutOptions.value, ...newOptions }

    // Update hierarchical layout options if they changed
    if (newOptions.nodeSpacing !== undefined || newOptions.levelSpacing !== undefined) {
      hierarchicalLayout.updateOptions({
        nodeSpacing: layoutOptions.value.nodeSpacing,
        levelSpacing: layoutOptions.value.levelSpacing,
      })
    }

    // Update canvas dimensions if width or height changed
    if (newOptions.width !== undefined || newOptions.height !== undefined) {
      hierarchicalLayout.setCanvasDimensions(layoutOptions.value.width, layoutOptions.value.height)
    }
  }

  // Add tick callback
  const onTick = (callback: (stats: LayoutStats) => void) => {
    tickCallbacks.push(callback)
  }

  // Add end callback
  const onEnd = (callback: (stats: LayoutStats) => void) => {
    endCallbacks.push(callback)
  }

  return {
    nodes,
    links,
    stats,
    isRunning,
    initialize,
    start,
    stop,
    updateOptions,
    onTick,
    onEnd,
  }
}
