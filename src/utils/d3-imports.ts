/**
 * D3.js imports configured for optimal tree-shaking
 * Only import the specific D3 modules needed for graph visualization
 */

// Import from main d3 package for better compatibility
import * as d3 from 'd3'

// Re-export specific functions for tree-shaking
export const select = d3.select
export const selectAll = d3.selectAll

export const scaleOrdinal = d3.scaleOrdinal
export const scaleLinear = d3.scaleLinear
export const schemeCategory10 = d3.schemeCategory10

export const forceSimulation = d3.forceSimulation
export const forceLink = d3.forceLink
export const forceManyBody = d3.forceManyBody
export const forceCenter = d3.forceCenter
export const forceCollide = d3.forceCollide
export const forceX = d3.forceX
export const forceY = d3.forceY

export const zoom = d3.zoom
export const zoomIdentity = d3.zoomIdentity

export const drag = d3.drag

export const hierarchy = d3.hierarchy
export const tree = d3.tree

export const transition = d3.transition

export const easeCubicInOut = d3.easeCubicInOut
export const easeLinear = d3.easeLinear

export const interpolate = d3.interpolate
export const interpolateNumber = d3.interpolateNumber

// Re-export commonly used types for convenience
export type D3Selection = d3.Selection<any, any, any, any>
export type D3Simulation<NodeDatum extends d3.SimulationNodeDatum> = d3.Simulation<
  NodeDatum,
  undefined
>
export type D3ZoomBehavior = d3.ZoomBehavior<Element, unknown>
export type D3DragBehavior<GElement extends Element> = d3.DragBehavior<GElement, unknown, unknown>
export type SimulationNodeDatum = d3.SimulationNodeDatum
export type SimulationLinkDatum<NodeDatum extends d3.SimulationNodeDatum> =
  d3.SimulationLinkDatum<NodeDatum>
export type ZoomTransform = d3.ZoomTransform
export type HierarchyNode<Datum> = d3.HierarchyNode<Datum>
export type HierarchyPointNode<Datum> = d3.HierarchyPointNode<Datum>
