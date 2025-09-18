import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from '@/App.vue'
import JSONInputPanel from '@/components/JSONInputPanel.vue'
import VisualizationPanel from '@/components/VisualizationPanel.vue'
import { useJsonStore } from '@/stores/json'

// Mock Monaco Editor to avoid issues in tests
vi.mock('monaco-editor', () => ({
  default: {
    editor: {
      create: vi.fn(() => ({
        getValue: vi.fn(() => ''),
        setValue: vi.fn(),
        dispose: vi.fn(),
        onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
        onDidChangeCursorPosition: vi.fn(() => ({ dispose: vi.fn() })),
        deltaDecorations: vi.fn(() => []),
        updateOptions: vi.fn(),
        getAction: vi.fn(() => ({ run: vi.fn() })),
        focus: vi.fn(),
      })),
      setTheme: vi.fn(),
    },
    languages: {
      json: {
        jsonDefaults: {
          setDiagnosticsOptions: vi.fn(),
        },
      },
    },
    Range: vi.fn(),
  },
}))

vi.mock('@monaco-editor/loader', () => ({
  default: {
    config: vi.fn(),
    init: vi.fn(() =>
      Promise.resolve({
        editor: {
          create: vi.fn(() => ({
            getValue: vi.fn(() => ''),
            setValue: vi.fn(),
            dispose: vi.fn(),
            onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
            onDidChangeCursorPosition: vi.fn(() => ({ dispose: vi.fn() })),
            deltaDecorations: vi.fn(() => []),
            updateOptions: vi.fn(),
            getAction: vi.fn(() => ({ run: vi.fn() })),
            focus: vi.fn(),
          })),
          setTheme: vi.fn(),
        },
        languages: {
          json: {
            jsonDefaults: {
              setDiagnosticsOptions: vi.fn(),
            },
          },
        },
        Range: vi.fn(),
      }),
    ),
  },
}))

describe('Error Handling and User Feedback', () => {
  let wrapper: VueWrapper<any>
  let store: ReturnType<typeof useJsonStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useJsonStore()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Global Error Handling', () => {
    it('should catch and display component errors', async () => {
      wrapper = mount(App, {
        global: {
          plugins: [createPinia()],
        },
      })

      // Simulate a component error by triggering onErrorCaptured
      const error = new Error('Test component error')
      const instance = { $: { type: { name: 'TestComponent' } } }
      const errorInfo = 'Test error info'

      // Access the component instance and trigger error handling
      const vm = wrapper.vm as any
      const result = vm.$options.errorCaptured?.[0]?.(error, instance, errorInfo)

      expect(result).toBe(false) // Should prevent error propagation
      await nextTick()

      // Check if error banner is displayed
      expect(wrapper.find('[data-testid="global-error-banner"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('An unexpected error occurred')
    })

    it('should show error details when requested', async () => {
      wrapper = mount(App, {
        global: {
          plugins: [createPinia()],
        },
      })

      // Trigger an error
      const vm = wrapper.vm as any
      vm.globalError = 'Test error'
      vm.errorDetails = 'Detailed error information'
      await nextTick()

      // Initially details should be hidden
      expect(wrapper.find('[data-testid="error-details"]').exists()).toBe(false)

      // Click to show details
      await wrapper.find('[data-testid="toggle-error-details"]').trigger('click')
      expect(wrapper.find('[data-testid="error-details"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Detailed error information')
    })

    it('should allow dismissing errors', async () => {
      wrapper = mount(App, {
        global: {
          plugins: [createPinia()],
        },
      })

      // Set error state
      const vm = wrapper.vm as any
      vm.globalError = 'Test error'
      await nextTick()

      expect(wrapper.find('[data-testid="global-error-banner"]').exists()).toBe(true)

      // Dismiss error
      await wrapper.find('[data-testid="dismiss-error"]').trigger('click')
      expect(wrapper.find('[data-testid="global-error-banner"]').exists()).toBe(false)
    })

    it('should allow retrying operations', async () => {
      wrapper = mount(App, {
        global: {
          plugins: [createPinia()],
        },
      })

      const validateSpy = vi.spyOn(store, 'validateAndParseJson')

      // Set error state and some JSON input
      const vm = wrapper.vm as any
      vm.globalError = 'Test error'
      store.rawJsonInput = '{"test": true}'
      await nextTick()

      // Click retry
      await wrapper.find('[data-testid="retry-operation"]').trigger('click')

      expect(validateSpy).toHaveBeenCalledWith('{"test": true}')
      expect(vm.globalError).toBe(null)
    })
  })

  describe('Validation Status Indicators', () => {
    beforeEach(() => {
      wrapper = mount(JSONInputPanel, {
        global: {
          plugins: [createPinia()],
        },
      })
    })

    it('should show validating status', async () => {
      store.isValidating = true
      store.processingMessage = 'Validating JSON...'
      await nextTick()

      expect(wrapper.find('[data-testid="validation-status"]').text()).toContain(
        'Validating JSON...',
      )
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })

    it('should show valid status with node count', async () => {
      store.isValidJson = true
      store.parsedJsonData = { test: true }
      store.jsonTree = [
        { key: 'test', value: true, type: 'boolean', path: ['test'], isExpandable: false },
      ]
      await nextTick()

      const statusElement = wrapper.find('[data-testid="validation-status"]')
      expect(statusElement.text()).toContain('Valid JSON')
      expect(statusElement.classes()).toContain('text-green-600')
    })

    it('should show error status with error count', async () => {
      store.validationErrors = [
        { line: 1, column: 1, message: 'Test error', severity: 'error' as const },
      ]
      await nextTick()

      const statusElement = wrapper.find('[data-testid="validation-status"]')
      expect(statusElement.text()).toContain('1 error')
      expect(statusElement.classes()).toContain('text-red-600')
    })

    it('should show warning status', async () => {
      store.isValidJson = true
      store.validationWarnings = [
        { line: 1, column: 1, message: 'Test warning', severity: 'warning' as const },
      ]
      await nextTick()

      const statusElement = wrapper.find('[data-testid="validation-status"]')
      expect(statusElement.text()).toContain('warning')
      expect(statusElement.classes()).toContain('text-yellow-600')
    })
  })

  describe('Loading Indicators and Progress', () => {
    beforeEach(() => {
      wrapper = mount(JSONInputPanel, {
        global: {
          plugins: [createPinia()],
        },
      })
    })

    it('should show loading overlay with progress bar', async () => {
      store.isProcessing = true
      store.processingMessage = 'Processing JSON...'
      store.processingProgress = 50
      await nextTick()

      const loadingOverlay = wrapper.find('[data-testid="loading-overlay"]')
      expect(loadingOverlay.exists()).toBe(true)
      expect(loadingOverlay.text()).toContain('Processing JSON...')
      expect(loadingOverlay.text()).toContain('50% complete')

      const progressBar = wrapper.find('[data-testid="progress-bar"]')
      expect(progressBar.exists()).toBe(true)
      expect(progressBar.attributes('style')).toContain('width: 50%')
    })

    it('should hide loading overlay when processing is complete', async () => {
      store.isProcessing = true
      await nextTick()

      expect(wrapper.find('[data-testid="loading-overlay"]').exists()).toBe(true)

      store.isProcessing = false
      await nextTick()

      expect(wrapper.find('[data-testid="loading-overlay"]').exists()).toBe(false)
    })
  })

  describe('Empty States', () => {
    it('should show welcome empty state in App component', async () => {
      wrapper = mount(App, {
        global: {
          plugins: [createPinia()],
        },
      })

      // Ensure no content and not processing
      store.rawJsonInput = ''
      store.isProcessing = false
      await nextTick()

      const emptyState = wrapper.find('[data-testid="empty-state"]')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('Welcome to JSON Visualizer')
      expect(emptyState.text()).toContain('Real-time validation')
    })

    it('should show visualization empty state', async () => {
      wrapper = mount(VisualizationPanel, {
        global: {
          plugins: [createPinia()],
        },
      })

      // No valid JSON and no errors
      store.hasValidJson = false
      store.validationErrors = []
      store.isProcessing = false
      await nextTick()

      const emptyState = wrapper.find('[data-testid="visualization-empty-state"]')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('Ready to visualize')
    })
  })

  describe('Error Display and Suggestions', () => {
    beforeEach(() => {
      wrapper = mount(JSONInputPanel, {
        global: {
          plugins: [createPinia()],
        },
      })
    })

    it('should display validation errors with line and column info', async () => {
      store.validationErrors = [
        { line: 2, column: 5, message: 'Unexpected token', severity: 'error' as const },
        { line: 3, column: 1, message: 'Missing comma', severity: 'error' as const },
      ]
      await nextTick()

      const errorDisplay = wrapper.find('[data-testid="error-display"]')
      expect(errorDisplay.exists()).toBe(true)
      expect(errorDisplay.text()).toContain('Line 2, Column 5')
      expect(errorDisplay.text()).toContain('Unexpected token')
      expect(errorDisplay.text()).toContain('Line 3, Column 1')
      expect(errorDisplay.text()).toContain('Missing comma')
    })

    it('should display validation warnings', async () => {
      store.validationWarnings = [
        { line: 1, column: 1, message: 'Inconsistent indentation', severity: 'warning' as const },
      ]
      await nextTick()

      const errorDisplay = wrapper.find('[data-testid="error-display"]')
      expect(errorDisplay.exists()).toBe(true)
      expect(errorDisplay.text()).toContain('Line 1, Column 1')
      expect(errorDisplay.text()).toContain('Inconsistent indentation')
    })

    it('should display validation suggestions', async () => {
      store.validationSuggestions = [
        'Check for missing commas',
        'Ensure all strings are properly quoted',
      ]
      await nextTick()

      const suggestionsDisplay = wrapper.find('[data-testid="suggestions-display"]')
      expect(suggestionsDisplay.exists()).toBe(true)
      expect(suggestionsDisplay.text()).toContain('Check for missing commas')
      expect(suggestionsDisplay.text()).toContain('Ensure all strings are properly quoted')
    })
  })

  describe('Error State in Visualization Panel', () => {
    beforeEach(() => {
      wrapper = mount(VisualizationPanel, {
        global: {
          plugins: [createPinia()],
        },
      })
    })

    it('should show error state with error count', async () => {
      store.hasErrors = true
      store.validationErrors = [
        { line: 1, column: 1, message: 'Test error 1', severity: 'error' as const },
        { line: 2, column: 1, message: 'Test error 2', severity: 'error' as const },
      ]
      await nextTick()

      const errorState = wrapper.find('[data-testid="visualization-error-state"]')
      expect(errorState.exists()).toBe(true)
      expect(errorState.text()).toContain('JSON Validation Failed')
      expect(errorState.text()).toContain('Found 2 errors')
      expect(errorState.text()).toContain('Common Issues')
    })

    it('should show helpful error tips', async () => {
      store.hasErrors = true
      store.validationErrors = [
        { line: 1, column: 1, message: 'Test error', severity: 'error' as const },
      ]
      await nextTick()

      const errorState = wrapper.find('[data-testid="visualization-error-state"]')
      expect(errorState.text()).toContain('Missing commas between elements')
      expect(errorState.text()).toContain('Unclosed brackets or braces')
      expect(errorState.text()).toContain('Unquoted property names')
      expect(errorState.text()).toContain('Trailing commas')
    })
  })

  describe('Store Error Handling', () => {
    it('should handle parsing errors gracefully', async () => {
      const invalidJson = '{"invalid": json}'

      await store.validateAndParseJson(invalidJson)

      expect(store.isValidJson).toBe(false)
      expect(store.validationErrors.length).toBeGreaterThan(0)
      expect(store.parsedJsonData).toBe(null)
      expect(store.jsonTree).toEqual([])
    })

    it('should clear processing state on error', async () => {
      // Mock an error during processing
      const originalParseJSON = vi.fn(() => {
        throw new Error('Parsing failed')
      })

      // Temporarily replace the parsing function
      vi.doMock('@/utils/json-parser', () => ({
        parseJSON: originalParseJSON,
      }))

      await store.validateAndParseJson('{"test": true}')

      expect(store.isProcessing).toBe(false)
      expect(store.isValidating).toBe(false)
      expect(store.processingMessage).toBe('')
      expect(store.validationErrors.length).toBeGreaterThan(0)
    })

    it('should provide clear processing state method', () => {
      store.isProcessing = true
      store.isValidating = true
      store.processingMessage = 'Test message'
      store.processingProgress = 50

      store.clearProcessingState()

      expect(store.isProcessing).toBe(false)
      expect(store.isValidating).toBe(false)
      expect(store.processingMessage).toBe('')
      expect(store.processingProgress).toBe(0)
    })
  })

  describe('Progress Tracking', () => {
    it('should track progress during validation and parsing', async () => {
      const progressValues: number[] = []

      // Watch progress changes
      const unwatch = store.$subscribe((mutation, state) => {
        if (mutation.events?.some((event: any) => event.key === 'processingProgress')) {
          progressValues.push(state.processingProgress)
        }
      })

      await store.validateAndParseJson('{"test": true}')

      unwatch()

      // Should have progressed through different stages
      expect(progressValues.length).toBeGreaterThan(0)
      expect(Math.max(...progressValues)).toBe(100)
    })
  })
})
