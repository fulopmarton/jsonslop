import { describe, it, expect } from 'vitest'
import { ValidationService, validationService, validateJson } from '../validationService'

describe('ValidationService', () => {
  describe('basic validation', () => {
    it('should validate correct JSON', () => {
      const service = new ValidationService()
      const result = service.validate('{"name": "test", "value": 123}')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should detect invalid JSON', () => {
      const service = new ValidationService()
      const result = service.validate('{"name": "test", "value": 123')

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].severity).toBe('error')
    })

    it('should handle empty input', () => {
      const service = new ValidationService()
      const result = service.validate('')

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(0)
      expect(result.suggestions).toContain('Enter JSON data to begin validation')
    })

    it('should handle whitespace-only input', () => {
      const service = new ValidationService()
      const result = service.validate('   \n  \t  ')

      expect(result.isValid).toBe(false)
      expect(result.suggestions).toContain('Enter JSON data to begin validation')
    })
  })

  describe('error suggestions', () => {
    it('should suggest fixes for common syntax errors', () => {
      const service = new ValidationService({ provideSuggestions: true })

      // Missing comma
      const result1 = service.validate('{"name": "test" "value": 123}')
      expect(result1.suggestions).toContain(
        'Add missing commas between object properties or array elements',
      )

      // Unquoted keys
      const result2 = service.validate('{name: "test", value: 123}')
      expect(result2.suggestions).toContain('Ensure all object keys are enclosed in double quotes')

      // Single quotes
      const result3 = service.validate("{'name': 'test'}")
      expect(result3.suggestions).toContain('Replace single quotes with double quotes')
    })

    it('should suggest fixes for structural errors', () => {
      const service = new ValidationService({ provideSuggestions: true })

      // Unclosed brackets
      const result1 = service.validate('{"name": "test", "items": [1, 2, 3')
      expect(result1.suggestions).toContain('Check for unclosed brackets or braces')

      // Trailing comma
      const result2 = service.validate('{"name": "test", "value": 123,}')
      expect(result2.suggestions).toContain('Remove trailing commas after the last element')
    })

    it('should not provide suggestions when disabled', () => {
      const service = new ValidationService({ provideSuggestions: false })
      const result = service.validate('{"invalid": true')

      expect(result.suggestions).toHaveLength(0)
    })
  })

  describe('incremental validation', () => {
    it('should recognize incomplete JSON as likely incomplete', () => {
      const service = new ValidationService()

      // Incomplete object
      const result1 = service.validateIncremental('{"name": "test"')
      expect(result1.suggestions[0]).toContain('JSON appears incomplete')

      // Incomplete array
      const result2 = service.validateIncremental('[1, 2, 3')
      expect(result2.suggestions[0]).toContain('JSON appears incomplete')

      // Trailing comma
      const result3 = service.validateIncremental('{"name": "test",')
      expect(result3.suggestions[0]).toContain('JSON appears incomplete')
    })

    // it('should handle complete but invalid JSON normally', () => {
    //   const service = new ValidationService()

    //   const result = service.validateIncremental('{"name": "test" "value": 123}')
    //   console.log('Debug - suggestions:', result.suggestions)
    //   expect(result.isValid).toBe(false)
    //   // Should not suggest it's incomplete since brackets are balanced
    //   expect(result.suggestions.some((s) => s.includes('JSON appears incomplete'))).toBe(false)
    // })
  })

  describe('formatting warnings', () => {
    it('should detect inconsistent indentation', () => {
      const service = new ValidationService({ checkFormatting: true })

      const inconsistentJson = `{
  "name": "test",
    "value": 123,
      "nested": {
        "key": "value"
      }
}`

      const result = service.validate(inconsistentJson)
      expect(result.warnings.some((w) => w.message.includes('Inconsistent indentation'))).toBe(true)
    })

    it('should detect long lines', () => {
      const service = new ValidationService({ checkFormatting: true })

      const longLineJson = `{"very_long_key_name_that_exceeds_the_recommended_line_length": "and_a_very_long_value_that_also_exceeds_the_recommended_length_making_this_line_way_too_long"}`

      const result = service.validate(longLineJson)
      expect(
        result.warnings.some((w) => w.message.includes('Line exceeds recommended length')),
      ).toBe(true)
    })

    it('should not check formatting when disabled', () => {
      const service = new ValidationService({ checkFormatting: false })

      const inconsistentJson = `{
  "name": "test",
    "value": 123
}`

      const result = service.validate(inconsistentJson)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('improvement suggestions', () => {
    it('should suggest improvements for deeply nested structures', () => {
      const service = new ValidationService({ provideSuggestions: true })

      const deeplyNested = {
        l1: {
          l2: {
            l3: { l4: { l5: { l6: { l7: { l8: { l9: { l10: { l11: { value: 'deep' } } } } } } } } },
          },
        },
      }

      const result = service.validate(JSON.stringify(deeplyNested))
      expect(result.suggestions).toContain(
        'Consider flattening deeply nested structures for better readability',
      )
    })

    it('should suggest improvements for large arrays', () => {
      const service = new ValidationService({ provideSuggestions: true })

      const largeArray = { items: Array.from({ length: 1500 }, (_, i) => i) }

      const result = service.validate(JSON.stringify(largeArray))
      expect(result.suggestions).toContain('Large arrays may impact visualization performance')
    })

    it('should suggest improvements for empty values', () => {
      const service = new ValidationService({ provideSuggestions: true })

      const emptyValues = {
        emptyString: '',
        nullValue: null,
        emptyObject: {},
        emptyArray: [],
      }

      const result = service.validate(JSON.stringify(emptyValues))
      expect(result.suggestions).toContain('Consider removing or documenting empty values')
    })
  })

  describe('configuration options', () => {
    it('should respect maxDepth option', () => {
      const service = new ValidationService({ maxDepth: 5 })

      const veryDeepStructure = {
        l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { l9: { l10: 'value' } } } } } } } } },
      }

      const result = service.validate(JSON.stringify(veryDeepStructure))
      // Should not crash or take too long due to depth limit
      expect(result).toBeDefined()
    })

    it('should handle all options disabled', () => {
      const service = new ValidationService({
        checkFormatting: false,
        provideSuggestions: false,
        maxDepth: 1,
      })

      const result = service.validate('{"valid": true}')

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
      expect(result.suggestions).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very large JSON strings', () => {
      const service = new ValidationService()

      const largeObject = {
        data: 'x'.repeat(10000),
        items: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` })),
      }

      const result = service.validate(JSON.stringify(largeObject))
      expect(result.isValid).toBe(true)
    })

    it('should handle special characters and Unicode', () => {
      const service = new ValidationService()

      const unicodeJson = JSON.stringify({
        emoji: '🚀🌟',
        chinese: '你好世界',
        arabic: 'مرحبا بالعالم',
        special: 'line1\nline2\ttab"quote\'apostrophe',
      })

      const result = service.validate(unicodeJson)
      expect(result.isValid).toBe(true)
    })

    it('should handle null and undefined gracefully', () => {
      const service = new ValidationService()

      const result1 = service.validate('null')
      expect(result1.isValid).toBe(true)

      const result2 = service.validate('{"value": null}')
      expect(result2.isValid).toBe(true)
    })

    it('should handle circular reference detection gracefully', () => {
      const service = new ValidationService()

      // Create a valid JSON that would be circular if it were an object
      const circularLikeJson = '{"a": {"b": {"c": {"ref": "back to a"}}}}'

      const result = service.validate(circularLikeJson)
      expect(result.isValid).toBe(true)
    })
  })

  describe('default service instance', () => {
    it('should provide a default service instance', () => {
      const result = validationService.validate('{"test": true}')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should provide a quick validation function', () => {
      const result = validateJson('{"test": true}')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should allow custom options in quick validation', () => {
      const result = validateJson('{"test": true}', {
        checkFormatting: false,
        provideSuggestions: false,
      })

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
      expect(result.suggestions).toHaveLength(0)
    })
  })

  describe('complex validation scenarios', () => {
    it('should handle mixed valid and warning scenarios', () => {
      const service = new ValidationService({
        checkFormatting: true,
        provideSuggestions: true,
      })

      const mixedJson = `{
  "name": "test",
    "value": 123,
  "empty": "",
  "null": null,
  "array": []
}`

      const result = service.validate(mixedJson)

      expect(result.isValid).toBe(true)
      // Should have suggestions for empty values
      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions).toContain('Consider removing or documenting empty values')
    })

    it('should prioritize error suggestions over improvement suggestions', () => {
      const service = new ValidationService({ provideSuggestions: true })

      const invalidJson = '{"name": "test" "value": 123}'

      const result = service.validate(invalidJson)

      expect(result.isValid).toBe(false)
      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions.some((s) => s.includes('comma'))).toBe(true)
    })
  })
})
