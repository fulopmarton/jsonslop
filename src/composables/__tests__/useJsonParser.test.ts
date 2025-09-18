import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useJsonParser } from '../useJsonParser'
import type { ValidationError } from '@/types'

// Mock timers for debounce testing
vi.useFakeTimers()

describe('useJsonParser', () => {
  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.useFakeTimers()
  })

  describe('basic functionality', () => {
    it('should initialize with default values', () => {
      const parser = useJsonParser()

      expect(parser.jsonInput.value).toBe('')
      expect(parser.parsedData.value).toBe(null)
      expect(parser.validationErrors.value).toHaveLength(0)
      expect(parser.isValid.value).toBe(false)
      expect(parser.isParsing.value).toBe(false)
    })

    it('should parse valid JSON manually', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      parser.jsonInput.value = '{"name": "test", "value": 123}'
      parser.parseJson()

      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toEqual({ name: 'test', value: 123 })
      expect(parser.validationErrors.value).toHaveLength(0)
    })

    it('should handle invalid JSON manually', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      parser.jsonInput.value = '{"name": "test", "value": 123'
      parser.parseJson()

      expect(parser.isValid.value).toBe(false)
      expect(parser.parsedData.value).toBe(null)
      expect(parser.validationErrors.value.length).toBeGreaterThan(0)
    })

    it('should handle empty input', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      parser.jsonInput.value = ''
      parser.parseJson()

      expect(parser.isValid.value).toBe(false)
      expect(parser.parsedData.value).toBe(null)
      expect(parser.validationErrors.value).toHaveLength(0)
    })

    it('should handle whitespace-only input', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      parser.jsonInput.value = '   \n  \t  '
      parser.parseJson()

      expect(parser.isValid.value).toBe(false)
      expect(parser.parsedData.value).toBe(null)
      expect(parser.validationErrors.value).toHaveLength(0)
    })
  })

  describe('real-time validation', () => {
    it('should trigger parsing automatically when input changes', async () => {
      const parser = useJsonParser({
        realTimeValidation: true,
        debounceDelay: 100,
      })

      parser.setJsonInput('{"valid": true}')

      // Fast-forward timers to trigger debounced parsing
      vi.advanceTimersByTime(100)
      await nextTick()

      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toEqual({ valid: true })
    })

    it('should debounce rapid input changes', async () => {
      const parser = useJsonParser({
        realTimeValidation: true,
        debounceDelay: 100,
      })

      // Rapid changes using setJsonInput which triggers the debounced parsing
      parser.setJsonInput('{')
      vi.advanceTimersByTime(50)

      parser.setJsonInput('{"n')
      vi.advanceTimersByTime(50)

      parser.setJsonInput('{"name"')
      vi.advanceTimersByTime(50)

      parser.setJsonInput('{"name": "test"}')
      vi.advanceTimersByTime(100)
      await nextTick()

      // Should only parse the final value
      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toEqual({ name: 'test' })
    })

    it('should disable real-time validation when option is false', async () => {
      const parser = useJsonParser({ realTimeValidation: false })

      parser.jsonInput.value = '{"valid": true}'

      vi.advanceTimersByTime(1000)
      await nextTick()

      // Should not auto-parse
      expect(parser.isValid.value).toBe(false)
      expect(parser.parsedData.value).toBe(null)
    })
  })

  describe('callbacks', () => {
    it('should call onValidJson callback for valid JSON', () => {
      const onValidJson = vi.fn()
      const parser = useJsonParser({
        realTimeValidation: false,
        onValidJson,
      })

      parser.jsonInput.value = '{"test": true}'
      parser.parseJson()

      expect(onValidJson).toHaveBeenCalledWith({ test: true })
    })

    it('should call onInvalidJson callback for invalid JSON', () => {
      const onInvalidJson = vi.fn()
      const parser = useJsonParser({
        realTimeValidation: false,
        onInvalidJson,
      })

      parser.jsonInput.value = '{"test": true'
      parser.parseJson()

      expect(onInvalidJson).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            severity: 'error',
            message: expect.any(String),
            line: expect.any(Number),
            column: expect.any(Number),
          }),
        ]),
      )
    })

    it('should not call callbacks for empty input', () => {
      const onValidJson = vi.fn()
      const onInvalidJson = vi.fn()
      const parser = useJsonParser({
        realTimeValidation: false,
        onValidJson,
        onInvalidJson,
      })

      parser.jsonInput.value = ''
      parser.parseJson()

      expect(onValidJson).not.toHaveBeenCalled()
      expect(onInvalidJson).not.toHaveBeenCalled()
    })
  })

  describe('utility methods', () => {
    it('should clear input and reset state', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      // Set some state
      parser.jsonInput.value = '{"test": true}'
      parser.parseJson()

      expect(parser.isValid.value).toBe(true)

      // Clear
      parser.clearInput()

      expect(parser.jsonInput.value).toBe('')
      expect(parser.parsedData.value).toBe(null)
      expect(parser.validationErrors.value).toHaveLength(0)
      expect(parser.isValid.value).toBe(false)
      expect(parser.isParsing.value).toBe(false)
    })

    it('should set JSON input programmatically', async () => {
      const parser = useJsonParser({
        realTimeValidation: true,
        debounceDelay: 100,
      })

      parser.setJsonInput('{"programmatic": true}')

      expect(parser.jsonInput.value).toBe('{"programmatic": true}')

      vi.advanceTimersByTime(100)
      await nextTick()

      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toEqual({ programmatic: true })
    })

    it('should validate without parsing', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      expect(parser.validateOnly('{"valid": true}')).toBe(true)
      expect(parser.validateOnly('{"invalid": true')).toBe(false)
      expect(parser.validateOnly('')).toBe(false)

      // Should not affect parser state
      expect(parser.isValid.value).toBe(false)
      expect(parser.parsedData.value).toBe(null)
    })

    it('should validate current input when no parameter provided', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      parser.jsonInput.value = '{"current": true}'

      expect(parser.validateOnly()).toBe(true)

      parser.jsonInput.value = '{"current": true'

      expect(parser.validateOnly()).toBe(false)
    })
  })

  describe('computed parseResult', () => {
    it('should provide reactive parse result', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      // Initial state
      expect(parser.parseResult.value).toEqual({
        data: null,
        errors: [],
        isValid: false,
      })

      // After parsing valid JSON
      parser.jsonInput.value = '{"result": "test"}'
      parser.parseJson()

      expect(parser.parseResult.value).toEqual({
        data: { result: 'test' },
        errors: [],
        isValid: true,
      })

      // After parsing invalid JSON
      parser.jsonInput.value = '{"result": "test"'
      parser.parseJson()

      expect(parser.parseResult.value.isValid).toBe(false)
      expect(parser.parseResult.value.data).toBe(null)
      expect(parser.parseResult.value.errors.length).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('should handle parsing exceptions gracefully', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      // Mock JSON.parse to throw an unexpected error
      const originalParse = JSON.parse
      JSON.parse = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      parser.jsonInput.value = '{"test": true}'
      parser.parseJson()

      expect(parser.isValid.value).toBe(false)
      expect(parser.parsedData.value).toBe(null)
      expect(parser.validationErrors.value).toHaveLength(1)
      expect(parser.validationErrors.value[0].message).toBe('Unexpected error')

      // Restore original
      JSON.parse = originalParse
    })

    it('should set isParsing flag during parsing', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      expect(parser.isParsing.value).toBe(false)

      parser.jsonInput.value = '{"test": true}'

      // Mock a slow parsing operation
      const originalParse = JSON.parse
      JSON.parse = vi.fn().mockImplementation((str) => {
        expect(parser.isParsing.value).toBe(true)
        return originalParse(str)
      })

      parser.parseJson()

      expect(parser.isParsing.value).toBe(false)

      // Restore original
      JSON.parse = originalParse
    })
  })

  describe('complex JSON scenarios', () => {
    it('should handle arrays correctly', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      parser.jsonInput.value = '[1, 2, 3, "test", true, null]'
      parser.parseJson()

      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toEqual([1, 2, 3, 'test', true, null])
    })

    it('should handle nested objects', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      const nestedJson = JSON.stringify({
        user: {
          name: 'John',
          age: 30,
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      })

      parser.jsonInput.value = nestedJson
      parser.parseJson()

      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toEqual({
        user: {
          name: 'John',
          age: 30,
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      })
    })

    it('should handle primitive JSON values', () => {
      const parser = useJsonParser({ realTimeValidation: false })

      // String
      parser.jsonInput.value = '"hello world"'
      parser.parseJson()
      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toBe('hello world')

      // Number
      parser.jsonInput.value = '42'
      parser.parseJson()
      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toBe(42)

      // Boolean
      parser.jsonInput.value = 'true'
      parser.parseJson()
      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toBe(true)

      // Null
      parser.jsonInput.value = 'null'
      parser.parseJson()
      expect(parser.isValid.value).toBe(true)
      expect(parser.parsedData.value).toBe(null)
    })
  })
})
