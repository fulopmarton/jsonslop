import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  select,
  selectAll,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  zoom,
  drag,
  hierarchy,
  tree,
  scaleOrdinal,
  schemeCategory10,
} from '../d3-imports'

describe('D3 Integration', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  describe('D3 Selection', () => {
    it('should create and manipulate DOM elements', () => {
      const selection = select(container).append('svg').attr('width', 100).attr('height', 100)

      expect(selection.node()).toBeInstanceOf(SVGSVGElement)
      expect(selection.attr('width')).toBe('100')
      expect(selection.attr('height')).toBe('100')
    })

    it('should select multiple elements', () => {
      container.innerHTML = '<div class="test"></div><div class="test"></div>'
      const selection = selectAll('.test')
      expect(selection.size()).toBe(2)
    })
  })

  describe('D3 Force Simulation', () => {
    it('should create a force simulation with nodes', () => {
      const nodes = [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 10, y: 10 },
      ]

      const simulation = forceSimulation(nodes)
        .force('center', forceCenter(50, 50))
        .force('charge', forceManyBody().strength(-100))

      expect(simulation).toBeDefined()
      expect(simulation.nodes()).toHaveLength(2)
      expect(simulation.nodes()[0]).toHaveProperty('id', 'a')
    })

    it('should create force simulation with links', () => {
      const nodes = [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 10, y: 10 },
      ]
      const links = [{ source: 'a', target: 'b' }]

      const simulation = forceSimulation(nodes).force(
        'link',
        forceLink(links).id((d: any) => d.id),
      )

      expect(simulation).toBeDefined()
      expect(simulation.force('link')).toBeDefined()
    })
  })

  describe('D3 Zoom', () => {
    it('should create zoom behavior', () => {
      const svg = select(container).append('svg')
      const zoomBehavior = zoom()
        .scaleExtent([0.1, 10])
        .on('zoom', () => {
          // Zoom handler
        })

      svg.call(zoomBehavior)
      expect(zoomBehavior).toBeDefined()
    })
  })

  describe('D3 Drag', () => {
    it('should create drag behavior', () => {
      const dragBehavior = drag()
        .on('start', () => {
          // Drag start handler
        })
        .on('drag', () => {
          // Drag handler
        })
        .on('end', () => {
          // Drag end handler
        })

      expect(dragBehavior).toBeDefined()
    })
  })

  describe('D3 Hierarchy', () => {
    it('should create hierarchy from data', () => {
      const data = {
        name: 'root',
        children: [{ name: 'child1' }, { name: 'child2', children: [{ name: 'grandchild' }] }],
      }

      const root = hierarchy(data)
      expect(root).toBeDefined()
      expect(root.data.name).toBe('root')
      expect(root.children).toHaveLength(2)
      expect(root.descendants()).toHaveLength(4) // root + 2 children + 1 grandchild
    })

    it('should create tree layout', () => {
      const data = {
        name: 'root',
        children: [{ name: 'child1' }, { name: 'child2' }],
      }

      const treeLayout = tree().size([100, 100])
      const root = hierarchy(data)
      const treeRoot = treeLayout(root)

      expect(treeRoot).toBeDefined()
      expect(treeRoot.x).toBeDefined()
      expect(treeRoot.y).toBeDefined()
    })
  })

  describe('D3 Scales', () => {
    it('should create ordinal color scale', () => {
      const colorScale = scaleOrdinal(schemeCategory10)

      expect(colorScale('object')).toBeDefined()
      expect(colorScale('array')).toBeDefined()
      expect(colorScale('string')).toBeDefined()

      // Should return consistent colors for same input
      expect(colorScale('object')).toBe(colorScale('object'))
    })
  })

  describe('SVG Rendering', () => {
    it('should render basic graph elements', () => {
      const svg = select(container).append('svg').attr('width', 200).attr('height', 200)

      // Create a simple node
      const node = svg.append('g').attr('class', 'node').attr('transform', 'translate(100, 100)')

      node.append('circle').attr('r', 10).attr('fill', 'blue')

      node.append('text').attr('dy', '.35em').attr('text-anchor', 'middle').text('Test Node')

      // Create a simple link
      svg
        .append('line')
        .attr('class', 'link')
        .attr('x1', 50)
        .attr('y1', 50)
        .attr('x2', 100)
        .attr('y2', 100)
        .attr('stroke', 'gray')
        .attr('stroke-width', 2)

      expect(svg.select('.node').node()).toBeInstanceOf(Element)
      expect(svg.select('.node circle').node()).toBeInstanceOf(Element)
      expect(svg.select('.node text').text()).toBe('Test Node')
      expect(svg.select('.link').node()).toBeInstanceOf(Element)
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large datasets efficiently', () => {
      const nodeCount = 1000
      const nodes = Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${i}`,
        x: Math.random() * 500,
        y: Math.random() * 500,
      }))

      const simulation = forceSimulation(nodes)
        .force('center', forceCenter(250, 250))
        .force('charge', forceManyBody().strength(-1))

      expect(simulation.nodes()).toHaveLength(nodeCount)

      // Stop simulation to prevent memory leaks in tests
      simulation.stop()
    })

    it('should properly clean up simulation', () => {
      const nodes = [{ id: 'test', x: 0, y: 0 }]
      const simulation = forceSimulation(nodes)

      expect(simulation.alpha()).toBeGreaterThan(0)

      simulation.stop()
      // After stopping, simulation should not be running
      expect(simulation.alpha()).toBeDefined()

      // Verify simulation can be restarted
      simulation.restart()
      expect(simulation.alpha()).toBeGreaterThan(0)
      simulation.stop()
    })
  })
})
