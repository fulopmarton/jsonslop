import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import JSONInputPanel from '../JSONInputPanel.vue'
import { useJsonStore } from '@/stores/json'
import type { ValidationError } from '@/types'

// Mock Monaco Editor
const mockEditor = {
  getValue: vi.fn(() => ''),
  setValue: vi.fn(),
  onDidChangeModelContent: vi.fn(),
  onDidChangeCursorPosition: vi.fn(),
  deltaDecorations: vi.fn(),
  updateOptions: vi.fn(),
  dispose: vi.fn(),
  focus: vi.fn(),
  getAction: vi.fn(() => ({ run: vi.fn() })),
}

const mockMonaco = {
  editor: {
    create: vi.fn(() => mockEditor),
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
}

// Mock Monaco loader
vi.mock('@monaco-editor/loader', () => ({
  default: {
    config: vi.fn(),
    init: vi.fn(() => Promise.resolve(mockMonaco)),
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

describe('JSONInputPanel', () => {
  let wrapper: VueWrapper<any>
  let store: ReturnType<typeof useJsonStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useJsonStore()

    // Reset mocks
    vi.clearAllMocks()

    wrapper = mount(JSONInputPanel, {
      global: {
        plugins: [createPinia()],
      },
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('renders the component with correct structure', () => {
      expect(wrapper.find('.json-input-panel').exists()).toBe(true)
      expect(wrapper.find('h2').text()).toBe('JSON Input')
      expect(wrapper.find('.absolute.inset-0').exists()).toBe(true) // Editor container
    })

    it('shows clear button', () => {
      const clearButton = wrapper.find('button[title="Clear input"]')
      expect(clearButton.exists()).toBe(true)
    })

    it('clear button is disabled by default', () => {
      const clearButton = wrapper.find('button[title="Clear input"]')
      expect(clearButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Monaco Editor Integration', () => {
    it('initializes Monaco Editor on mount', async () => {
      // Wait for component to mount and initialize
      await wrapper.vm.$nextTick()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockMonaco.editor.create).toHaveBeenCalled()
      expect(mockMonaco.languages.json.jsonDefaults.setDiagnosticsOptions).toHaveBeenCalled()
    })

    it('sets up editor event listeners', async () => {
      await wrapper.vm.$nextTick()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockEditor.onDidChangeModelContent).toHaveBeenCalled()
      expect(mockEditor.onDidChangeCursorPosition).toHaveBeenCalled()
    })

    it('disposes editor on unmount', async () => {
      await wrapper.vm.$nextTick()
      await new Promise((resolve) => setTimeout(resolve, 0))

      wrapper.unmount()

      expect(mockEditor.dispose).toHaveBeenCalled()
    })
  })

  describe('Exposed Methods', () => {
    it('exposes formatJson method', () => {
      expect(wrapper.vm.formatJson).toBeDefined()
      expect(typeof wrapper.vm.formatJson).toBe('function')
    })

    it('exposes clearInput method', () => {
      expect(wrapper.vm.clearInput).toBeDefined()
      expect(typeof wrapper.vm.clearInput).toBe('function')
    })

    it('exposes focusEditor method', () => {
      expect(wrapper.vm.focusEditor).toBeDefined()
      expect(typeof wrapper.vm.focusEditor).toBe('function')
    })

    it('focusEditor calls editor focus method', async () => {
      await wrapper.vm.$nextTick()
      await new Promise((resolve) => setTimeout(resolve, 0))

      wrapper.vm.focusEditor()

      expect(mockEditor.focus).toHaveBeenCalled()
    })
  })

  describe('Store Integration', () => {
    it('component integrates with store', () => {
      // Test that the component can access store state
      expect(store).toBeDefined()
      expect(store.rawJsonInput).toBeDefined()
      expect(store.validationErrors).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('handles Monaco Editor initialization failure gracefully', async () => {
      // Mock loader to reject
      const mockLoader = await import('@monaco-editor/loader')
      vi.mocked(mockLoader.default.init).mockRejectedValueOnce(new Error('Failed to load'))

      // Create a new component instance
      const newWrapper = mount(JSONInputPanel, {
        global: {
          plugins: [createPinia()],
        },
      })

      await newWrapper.vm.$nextTick()
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Component should still render without crashing
      expect(newWrapper.find('.json-input-panel').exists()).toBe(true)

      newWrapper.unmount()
    })
  })
})
