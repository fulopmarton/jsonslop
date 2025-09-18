import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useJsonStore } from '@/stores/json'

describe('JSON Store Error Handling', () => {
  let store: ReturnType<typeof useJsonStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useJsonStore()
  })

  describe('Validation Status', () => {
    it('should return correct validation status for empty input', () => {
      store.rawJsonInput = ''
      expect(store.validationStatus).toBe('empty')
      expect(store.statusMessage).toBe('Enter JSON to begin')
      expect(store.statusColor).toBe('gray')
    })

    it('should return correct validation status for invalid JSON', async () => {
      await store.validateAndParseJson('{"invalid": json}')

      expect(store.validationStatus).toBe('invalid')
      expect(store.statusMessage).toContain('error')
      expect(store.statusColor).toBe('red')
      expect(store.hasErrors).toBe(true)
    })

    it('should return correct validation status for valid JSON', async () => {
      await store.validateAndParseJson('{"valid": true}')

      expect(store.validationStatus).toBe('valid')
      expect(store.statusMessage).toContain('Valid JSON')
      expect(store.statusColor).toBe('green')
      expect(store.hasValidJson).toBe(true)
    })

    it('should return correct validation status during validation', () => {
      store.isValidating = true
      expect(store.validationStatus).toBe('validating')
      expect(store.statusMessage).toBe('Validating JSON...')
      expect(store.statusColor).toBe('blue')
    })

    it('should return warning status for valid JSON with warnings', async () => {
      // Set up a scenario with warnings
      store.isValidJson = true
      store.validationWarnings = [
        { line: 1, column: 1, message: 'Test warning', severity: 'warning' },
      ]

      expect(store.validationStatus).toBe('warning')
      expect(store.statusMessage).toContain('warning')
      expect(store.statusColor).toBe('yellow')
    })
  })

  describe('Processing State Management', () => {
    it('should track processing progress during validation', async () => {
      const progressValues: number[] = []

      // Watch for progress changes
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

    it('should clear processing state correctly', () => {
      // Set processing state
      store.isProcessing = true
      store.isValidating = true
      store.processingMessage = 'Test message'
      store.processingProgress = 50

      // Clear state
      store.clearProcessingState()

      expect(store.isProcessing).toBe(false)
      expect(store.isValidating).toBe(false)
      expect(store.processingMessage).toBe('')
      expect(store.processingProgress).toBe(0)
    })

    it('should handle processing errors gracefully', async () => {
      // Test with malformed JSON that will cause parsing errors
      await store.validateAndParseJson('{"malformed": }')

      // Processing should be complete even after error
      expect(store.isProcessing).toBe(false)
      expect(store.isValidating).toBe(false)
      expect(store.processingMessage).toBe('')
      expect(store.processingProgress).toBe(0)

      // Error state should be set
      expect(store.hasErrors).toBe(true)
      expect(store.validationErrors.length).toBeGreaterThan(0)
      expect(store.isValidJson).toBe(false)
    })
  })

  describe('Error State Management', () => {
    it('should handle validation errors correctly', async () => {
      await store.validateAndParseJson('{"invalid": json}')

      expect(store.hasErrors).toBe(true)
      expect(store.validationErrors.length).toBeGreaterThan(0)
      expect(store.isValidJson).toBe(false)
      expect(store.parsedJsonData).toBe(null)
      expect(store.jsonTree).toEqual([])
    })

    it('should clear errors when valid JSON is provided', async () => {
      // First set error state
      await store.validateAndParseJson('{"invalid": json}')
      expect(store.hasErrors).toBe(true)

      // Then provide valid JSON
      await store.validateAndParseJson('{"valid": true}')
      expect(store.hasErrors).toBe(false)
      expect(store.validationErrors).toEqual([])
      expect(store.isValidJson).toBe(true)
    })

    it('should handle unexpected errors during processing', async () => {
      // This should trigger the catch block in validateAndParseJson
      // by providing input that causes an unexpected error
      await store.validateAndParseJson('null'.repeat(10000)) // Very large input

      // Should handle the error gracefully
      expect(store.isProcessing).toBe(false)
      expect(store.isValidating).toBe(false)
    })
  })

  describe('User Feedback Features', () => {
    it('should provide helpful status messages', () => {
      // Empty state
      store.rawJsonInput = ''
      expect(store.statusMessage).toBe('Enter JSON to begin')

      // Validating state
      store.isValidating = true
      expect(store.statusMessage).toBe('Validating JSON...')

      // Error state
      store.isValidating = false
      store.validationErrors = [
        { line: 1, column: 1, message: 'Error 1', severity: 'error' },
        { line: 2, column: 1, message: 'Error 2', severity: 'error' },
      ]
      expect(store.statusMessage).toBe('2 errors found')

      // Valid state
      store.validationErrors = []
      store.isValidJson = true
      store.jsonTree = [
        { key: 'test', value: true, type: 'boolean', path: ['test'], isExpandable: false },
      ]
      expect(store.statusMessage).toContain('Valid JSON (1 nodes)')
    })

    it('should provide appropriate status colors', () => {
      // Test different status colors
      store.rawJsonInput = ''
      expect(store.statusColor).toBe('gray')

      store.isValidating = true
      expect(store.statusColor).toBe('blue')

      store.isValidating = false
      store.validationErrors = [{ line: 1, column: 1, message: 'Error', severity: 'error' }]
      expect(store.statusColor).toBe('red')

      store.validationErrors = []
      store.validationWarnings = [{ line: 1, column: 1, message: 'Warning', severity: 'warning' }]
      store.isValidJson = true
      expect(store.statusColor).toBe('yellow')

      store.validationWarnings = []
      expect(store.statusColor).toBe('green')
    })
  })

  describe('Data Persistence and Recovery', () => {
    it('should clear all data correctly', () => {
      // Set up some state
      store.rawJsonInput = '{"test": true}'
      store.parsedJsonData = { test: true }
      store.isValidJson = true
      store.validationErrors = [{ line: 1, column: 1, message: 'Error', severity: 'error' }]

      // Clear all data
      store.clearAllData()

      expect(store.rawJsonInput).toBe('')
      expect(store.parsedJsonData).toBe(null)
      expect(store.isValidJson).toBe(false)
      expect(store.validationErrors).toEqual([])
      expect(store.jsonTree).toEqual([])
    })

    it('should maintain consistent state during operations', async () => {
      // Test that state remains consistent during validation
      const initialState = {
        rawJsonInput: store.rawJsonInput,
        isValidJson: store.isValidJson,
        hasErrors: store.hasErrors,
      }

      await store.validateAndParseJson('{"test": "value"}')

      // State should be updated consistently
      expect(store.rawJsonInput).toBe('{"test": "value"}')
      expect(store.isValidJson).toBe(true)
      expect(store.hasErrors).toBe(false)
      expect(store.parsedJsonData).toEqual({ test: 'value' })
    })
  })

  describe('Performance and Resource Management', () => {
    it('should handle large JSON inputs efficiently', async () => {
      const largeJson = JSON.stringify({
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
        })),
      })

      const startTime = Date.now()
      await store.validateAndParseJson(largeJson)
      const endTime = Date.now()

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
      expect(store.isValidJson).toBe(true)
      expect(store.hasErrors).toBe(false)
    })

    it('should handle deeply nested JSON structures', async () => {
      const deepJson = JSON.stringify({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep value',
                },
              },
            },
          },
        },
      })

      await store.validateAndParseJson(deepJson)

      expect(store.isValidJson).toBe(true)
      expect(store.hasErrors).toBe(false)
      expect(store.jsonTree.length).toBeGreaterThan(0)
    })
  })
})
