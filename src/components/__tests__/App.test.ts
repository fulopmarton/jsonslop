import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../../App.vue'

// Mock Monaco Editor
vi.mock('@monaco-editor/loader', () => ({
  default: {
    config: vi.fn(),
    init: vi.fn(() =>
      Promise.resolve({
        editor: {
          create: vi.fn(() => ({
            getValue: vi.fn(() => ''),
            setValue: vi.fn(),
            onDidChangeModelContent: vi.fn(),
            onDidChangeCursorPosition: vi.fn(),
            deltaDecorations: vi.fn(),
            updateOptions: vi.fn(),
            dispose: vi.fn(),
            focus: vi.fn(),
            getAction: vi.fn(() => ({ run: vi.fn() })),
          })),
          setTheme: vi.fn(),
          MinimapPosition: { Inline: 1 },
        },
        Range: vi.fn(),
        languages: {
          json: {
            jsonDefaults: {
              setDiagnosticsOptions: vi.fn(),
            },
          },
        },
      }),
    ),
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('App Layout', () => {
  it('renders the main layout structure', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    })

    // Check if header is present
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('JSON Visualization App')

    // Check if main content area exists
    expect(wrapper.find('main').exists()).toBe(true)

    // Check if both panels are present
    const panels = wrapper.findAll('[class*="flex flex-col"]')
    expect(panels.length).toBeGreaterThan(0)

    // Check if resizer is present
    expect(wrapper.find('.cursor-col-resize').exists()).toBe(true)
  })

  it('has proper responsive structure', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    })

    // Check if mobile notice is present
    expect(wrapper.find('.md\\:hidden').exists()).toBe(true)

    // Check if the main app has proper classes for full height
    expect(wrapper.find('#app').classes()).toContain('h-screen')
    expect(wrapper.find('#app').classes()).toContain('flex')
    expect(wrapper.find('#app').classes()).toContain('flex-col')
  })

  it('initializes with default panel width', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
      },
    })

    // The left panel should have a default width style
    const leftPanel = wrapper.find('[style*="width"]')
    expect(leftPanel.exists()).toBe(true)
  })
})
