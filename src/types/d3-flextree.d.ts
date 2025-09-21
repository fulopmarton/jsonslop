declare module 'd3-flextree' {
  import { HierarchyNode } from 'd3'

  export interface FlextreeLayout<Datum> {
    (root: HierarchyNode<Datum>): HierarchyNode<Datum>
    nodeSize<T>(size: [number, number] | ((node: HierarchyNode<T>) => [number, number])): FlextreeLayout<T>
    spacing<T>(spacing: number | ((nodeA: HierarchyNode<T>, nodeB: HierarchyNode<T>) => number)): FlextreeLayout<T>
  }

  export function flextree<Datum>(): FlextreeLayout<Datum>
}
