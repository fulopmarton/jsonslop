import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Mock D3 imports before importing the component
vi.mock('@/utils/d3-imports', () => ({
  select: vi.fn(() => ({
    call: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    enter: vi.fn().mockReturnThis(),
    exit: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    merge: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  })),
  forceSimulation: vi.fn(() => ({
    force: vi.fn().mockReturnThis(),
    alphaDecay: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    nodes: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
  })),
  forceLink: vi.fn(() => ({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
    strength: vi.fn().mockReturnThis(),
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn().mockReturnThis(),
  })),
  forceCenter: vi.fn(() => ({
    strength: vi.fn().mockReturnThis(),
  })),
  forceCollide: vi.fn(() => ({
    radius: vi.fn().mockReturnThis(),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transform: vi.fn(),
  })),
  zoomIdentity: {
    translate: vi.fn().mockReturnThis(),
    scale: vi.fn().mockReturnThis(),
    toString: vi.fn(() => 'translate(0,0) scale(1)'),
  },
}))

import GraphCanvas from '../GraphCanvas.vue'

describe('GraphCanvas Component', () => {
  it('renders without crashing', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: [],
        links: [],
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('renders basic SVG structure', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: [],
        links: [],
      },
    })

    expect(wrapper.find('.graph-canvas').exists()).toBe(true)
    expect(wrapper.find('.graph-svg').exists()).toBe(true)
    expect(wrapper.find('.zoom-container').exists()).toBe(true)
    expect(wrapper.find('.links-group').exists()).toBe(true)
    expect(wrapper.find('.nodes-group').exists()).toBe(true)
  })

  it('applies width and height props', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: [],
        links: [],
        width: 1000,
        height: 800,
      },
    })

    const svg = wrapper.find('.graph-svg')
    expect(svg.attributes('width')).toBe('1000')
    expect(svg.attributes('height')).toBe('800')
  })

  it('includes SVG defs with arrowhead marker', () => {
    const wrapper = mount(GraphCanvas, {
      props: {
        nodes: [],
        links: [],
      },
    })

    expect(wrapper.find('defs').exists()).toBe(true)
    expect(wrapper.find('marker#arrowhead').exists()).toBe(true)
  })
})
