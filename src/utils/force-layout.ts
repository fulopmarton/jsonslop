/**
 * Force-directed layout implementation for JSON graph visualization
 * Provides configurable D3 force simulation with performance monitoring
 */

import type { GraphNode, GraphLink, LayoutType } from '@/types'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type D3Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from '@/utils/d3-imports'

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

export interface ForceParameters {
  object: Partial<ForceLayoutOptions>
  array: Partial<ForceLayoutOptions>
  primitive: Partial<ForceLayoutOptions>
  mixed: Partial<ForceLayoutOptions>
}

/**
 * Default force parameters optimized for different JSON structure types
 */
export const DEFAULT_FORCE_PARAMETERS: ForceParameters = {
  // Object-heavy structures: stronger center force, moderate repulsion
  object: {
    linkStrength: 0.8,
    chargeStrength: -200,
    centerStrength: 0.3,
    collisionStrength: 1.0,
    linkDistance: 60,
    collisionRadius: 25,
    alphaDecay: 0.02,
    velocityDecay: 0.4,
  },

  // Array-heavy structures: weaker center force, stronger links
  array: {
    linkStrength: 1.2,
    chargeStrength: -150,
    centerStrength: 0.2,
    collisionStrength: 0.8,
    linkDistance: 40,
    collisionRadius: 20,
    alphaDecay: 0.025,
    velocityDecay: 0.3,
  },

  // Primitive-heavy structures: stronger repulsion, weaker links
  primitive: {
    linkStrength: 0.6,
    chargeStrength: -300,
    centerStrength: 0.4,
    collisionStrength: 1.2,
    linkDistance: 80,
    collisionRadius: 30,
    alphaDecay: 0.015,
    velocityDecay: 0.5,
  },

  // Mixed structures: balanced parameters
  mixed: {
    linkStrength: 0.8,
    chargeStrength: -250,
    centerStrength: 0.3,
    collisionStrength: 1.0,
    linkDistance: 50,
    collisionRadius: 25,
    alphaDecay: 0.02,
    velocityDecay: 0.4,
  },
}

/**
 * Default layout options
 */
export const DEFAULT_LAYOUT_OPTIONS: ForceLayoutOptions = {
  linkStrength: 0.8,
  chargeStrength: -250,
  centerStrength: 0.3,
  collisionStrength: 1.0,
  linkDistance: 50,
  collisionRadius: 25,
  alphaDecay: 0.02,
  alphaMin: 0.001,
  velocityDecay: 0.4,
  width: 800,
  height: 600,
  maxIterations: 1000,
  convergenceThreshold: 0.01,
}

/**
 * Force-directed layout manager
 */
export class ForceLayout {
  private simulation: D3Simulation<GraphNode> | null = null
  private options: ForceLayoutOptions
  private stats: LayoutStats
  private tickCallbacks: Array<(stats: LayoutStats) => void> = []
  private endCallbacks: Array<(stats: LayoutStats) => void> = []
  private lastFrameTime = 0
  private frameCount = 0
  private frameRateWindow: number[] = []

  constructor(options: Partial<ForceLayoutOptions> = {}) {
    this.options = { ...DEFAULT_LAYOUT_OPTIONS, ...options }
    this.stats = this.initializeStats()
  }

  /**
   * Initialize layout statistics
   */
  private initializeStats(): LayoutStats {
    return {
      iterations: 0,
      alpha: 1,
      isConverged: false,
      averageVelocity: 0,
      maxVelocity: 0,
      frameRate: 0,
      lastTickTime: 0,
    }
  }

  /**
   * Analyze JSON structure to determine optimal force parameters
   */
  private analyzeStructure(nodes: GraphNode[]): keyof ForceParameters {
    if (nodes.length === 0) return 'mixed'

    const typeCounts = nodes.reduce(
      (counts, node) => {
        counts[node.type] = (counts[node.type] || 0) + 1
        return counts
      },
      {} as Record<GraphNode['type'], number>,
    )

    const objectCount = typeCounts.object || 0
    const arrayCount = typeCounts.array || 0
    const primitiveCount =
      (typeCounts.string || 0) +
      (typeCounts.number || 0) +
      (typeCounts.boolean || 0) +
      (typeCounts.null || 0)

    const total = nodes.length
    const objectRatio = objectCount / total
    const arrayRatio = arrayCount / total
    const primitiveRatio = primitiveCount / total

    // Determine dominant structure type
    if (objectRatio > 0.6) return 'object'
    if (arrayRatio > 0.6) return 'array'
    if (primitiveRatio > 0.6) return 'primitive'
    return 'mixed'
  }

  /**
   * Get optimized force parameters for the given structure
   */
  private getOptimizedParameters(nodes: GraphNode[]): ForceLayoutOptions {
    const structureType = this.analyzeStructure(nodes)
    const structureParams = DEFAULT_FORCE_PARAMETERS[structureType]

    return { ...this.options, ...structureParams }
  }

  /**
   * Calculate node velocities for convergence detection
   */
  private calculateVelocities(nodes: GraphNode[]): { average: number; max: number } {
    if (nodes.length === 0) return { average: 0, max: 0 }

    let totalVelocity = 0
    let maxVelocity = 0

    nodes.forEach((node) => {
      if (node.vx !== undefined && node.vy !== undefined) {
        const velocity = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
        totalVelocity += velocity
        maxVelocity = Math.max(maxVelocity, velocity)
      }
    })

    return {
      average: totalVelocity / nodes.length,
      max: maxVelocity,
    }
  }

  /**
   * Update frame rate calculation
   */
  private updateFrameRate(): void {
    const now = performance.now()
    if (this.lastFrameTime > 0) {
      const frameDuration = now - this.lastFrameTime
      const fps = 1000 / frameDuration

      this.frameRateWindow.push(fps)
      if (this.frameRateWindow.length > 10) {
        this.frameRateWindow.shift()
      }

      this.stats.frameRate =
        this.frameRateWindow.reduce((sum, fps) => sum + fps, 0) / this.frameRateWindow.length
    }
    this.lastFrameTime = now
    this.frameCount++
  }

  /**
   * Check if simulation has converged
   */
  private checkConvergence(nodes: GraphNode[]): boolean {
    const velocities = this.calculateVelocities(nodes)
    this.stats.averageVelocity = velocities.average
    this.stats.maxVelocity = velocities.max

    return velocities.average < this.options.convergenceThreshold && this.stats.iterations > 10 // Minimum iterations before convergence check
  }

  /**
   * Handle simulation tick
   */
  private handleTick = (simulationNodes: GraphNode[], originalNodes: GraphNode[]): void => {
    this.stats.iterations++
    this.stats.alpha = this.simulation?.alpha() || 0
    this.stats.lastTickTime = performance.now()

    // Sync positions from simulation nodes back to original nodes
    simulationNodes.forEach((simNode, index) => {
      if (originalNodes[index]) {
        originalNodes[index].x = simNode.x
        originalNodes[index].y = simNode.y
        originalNodes[index].vx = simNode.vx
        originalNodes[index].vy = simNode.vy
      }
    })

    this.updateFrameRate()

    // Check for convergence
    if (this.checkConvergence(simulationNodes)) {
      this.stats.isConverged = true
      this.simulation?.stop()
    }

    // Check for maximum iterations
    if (this.stats.iterations >= this.options.maxIterations) {
      this.simulation?.stop()
    }

    // Notify tick callbacks
    this.tickCallbacks.forEach((callback) => callback(this.stats))
  }

  /**
   * Handle simulation end
   */
  private handleEnd = (): void => {
    this.stats.isConverged = true
    this.endCallbacks.forEach((callback) => callback(this.stats))
  }

  /**
   * Initialize the force simulation
   */
  public initialize(nodes: GraphNode[], links: GraphLink[]): void {
    console.log('ForceLayout: Initializing with', nodes.length, 'nodes and', links.length, 'links')

    // Stop existing simulation
    this.stop()

    if (nodes.length === 0) {
      console.log('ForceLayout: No nodes provided, skipping initialization')
      return
    }

    // Get optimized parameters for this structure
    const optimizedOptions = this.getOptimizedParameters(nodes)
    this.options = optimizedOptions
    console.log('ForceLayout: Using options:', this.options)

    // Reset stats
    this.stats = this.initializeStats()
    this.frameCount = 0
    this.frameRateWindow = []
    this.lastFrameTime = 0

    // Prepare nodes with initial positions if not set
    const simulationNodes = nodes.map((node) => ({
      ...node,
      x: node.x ?? this.options.width / 2 + (Math.random() - 0.5) * 100,
      y: node.y ?? this.options.height / 2 + (Math.random() - 0.5) * 100,
    }))

    // Prepare links
    const simulationLinks = links.map((link) => ({
      ...link,
      source: typeof link.source === 'string' ? link.source : link.source.id,
      target: typeof link.target === 'string' ? link.target : link.target.id,
    }))

    // Create simulation
    this.simulation = forceSimulation(simulationNodes as SimulationNodeDatum[])
      .force(
        'link',
        forceLink(simulationLinks as SimulationLinkDatum<SimulationNodeDatum>[])
          .id((d: any) => d.id)
          .distance(this.options.linkDistance)
          .strength(this.options.linkStrength),
      )
      .force('charge', forceManyBody().strength(this.options.chargeStrength))
      .force(
        'center',
        forceCenter(this.options.width / 2, this.options.height / 2).strength(
          this.options.centerStrength,
        ),
      )
      .force(
        'collision',
        forceCollide()
          .radius((d: any) => (d.size || 20) + this.options.collisionRadius)
          .strength(this.options.collisionStrength),
      )
      .alphaDecay(this.options.alphaDecay)
      .alphaMin(this.options.alphaMin)
      .velocityDecay(this.options.velocityDecay)
      .on('tick', () => this.handleTick(simulationNodes, nodes))
      .on('end', this.handleEnd)

    console.log('ForceLayout: Simulation created, alpha:', this.simulation.alpha())
  }

  /**
   * Start or restart the simulation
   */
  public start(): void {
    if (this.simulation) {
      this.simulation.restart()
      this.stats.isConverged = false
    }
  }

  /**
   * Stop the simulation
   */
  public stop(): void {
    if (this.simulation) {
      this.simulation.stop()
      this.stats.isConverged = true
    }
  }

  /**
   * Update simulation forces with new parameters
   */
  public updateForces(options: Partial<ForceLayoutOptions>): void {
    this.options = { ...this.options, ...options }

    if (!this.simulation) return

    // Update existing forces
    const linkForce = this.simulation.force('link') as any
    if (linkForce) {
      linkForce.distance(this.options.linkDistance).strength(this.options.linkStrength)
    }

    const chargeForce = this.simulation.force('charge') as any
    if (chargeForce) {
      chargeForce.strength(this.options.chargeStrength)
    }

    const centerForce = this.simulation.force('center') as unknown
    if (centerForce) {
      centerForce.strength(this.options.centerStrength)
    }

    const collisionForce = this.simulation.force('collision') as unknown
    if (collisionForce) {
      collisionForce
        .radius((d: unknown) => (d.size || 20) + this.options.collisionRadius)
        .strength(this.options.collisionStrength)
    }

    // Update simulation parameters
    this.simulation
      .alphaDecay(this.options.alphaDecay)
      .alphaMin(this.options.alphaMin)
      .velocityDecay(this.options.velocityDecay)

    // Restart simulation with new parameters
    this.simulation.alpha(0.3).restart()
  }

  /**
   * Update layout dimensions
   */
  public updateDimensions(width: number, height: number): void {
    this.options.width = width
    this.options.height = height

    if (this.simulation) {
      const centerForce = this.simulation.force('center') as unknown
      if (centerForce) {
        centerForce.x(width / 2).y(height / 2)
      }
    }
  }

  /**
   * Add a callback for simulation ticks
   */
  public onTick(callback: (stats: LayoutStats) => void): void {
    this.tickCallbacks.push(callback)
  }

  /**
   * Add a callback for simulation end
   */
  public onEnd(callback: (stats: LayoutStats) => void): void {
    this.endCallbacks.push(callback)
  }

  /**
   * Remove all callbacks
   */
  public clearCallbacks(): void {
    this.tickCallbacks = []
    this.endCallbacks = []
  }

  /**
   * Get current simulation statistics
   */
  public getStats(): LayoutStats {
    return { ...this.stats }
  }

  /**
   * Get current options
   */
  public getOptions(): ForceLayoutOptions {
    return { ...this.options }
  }

  /**
   * Check if simulation is running
   */
  public isRunning(): boolean {
    if (!this.simulation) return false

    // Check if simulation is actively running (alpha > alphaMin and not manually stopped)
    const alpha = this.simulation.alpha()
    return alpha > this.options.alphaMin && !this.stats.isConverged
  }

  /**
   * Get the underlying D3 simulation (for advanced usage)
   */
  public getSimulation(): D3Simulation<GraphNode> | null {
    return this.simulation
  }

  /**
   * Dispose of the layout and clean up resources
   */
  public dispose(): void {
    this.stop()
    this.clearCallbacks()
    this.simulation = null
  }
}

/**
 * Utility function to create a force layout with optimal parameters for JSON structure
 */
export function createForceLayout(
  nodes: GraphNode[],
  links: GraphLink[],
  options: Partial<ForceLayoutOptions> = {},
): ForceLayout {
  const layout = new ForceLayout(options)
  layout.initialize(nodes, links)
  return layout
}

/**
 * Utility function to get recommended parameters for a specific structure type
 */
export function getRecommendedParameters(
  structureType: keyof ForceParameters,
  baseOptions: Partial<ForceLayoutOptions> = {},
): ForceLayoutOptions {
  const structureParams = DEFAULT_FORCE_PARAMETERS[structureType]
  return { ...DEFAULT_LAYOUT_OPTIONS, ...baseOptions, ...structureParams }
}
