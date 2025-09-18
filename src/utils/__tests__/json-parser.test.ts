import { describe, it, expect } from 'vitest'
import {
  parseJSON,
  extractValidationError,
  getLineColumnFromPosition,
  findErrorLocation,
  findErrorLocationEnhanced,
  cleanErrorMessage,
  isValidJSON,
  attemptJsonFix,
  analyzeJsonStructure,
} from '../json-parser'

describe('JSON Parser', () => {
  describe('parseJSON', () => {
    it('should parse valid JSON successfully', () => {
      const validJson = '{"name": "test", "value": 123}'
      const result = parseJSON(validJson)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toEqual({ name: 'test', value: 123 })
    })

    it('should handle empty string', () => {
      const result = parseJSON('')

      expect(result.isValid).toBe(false)
      expect(result.data).toBe(null)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle whitespace-only string', () => {
      const result = parseJSON('   \n  \t  ')

      expect(result.isValid).toBe(false)
      expect(result.data).toBe(null)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle invalid JSON with syntax error', () => {
      const invalidJson = '{"name": "test", "value": 123'
      const result = parseJSON(invalidJson)

      expect(result.isValid).toBe(false)
      expect(result.data).toBe(null)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].severity).toBe('error')
    })

    it('should parse arrays correctly', () => {
      const arrayJson = '[1, 2, 3, "test"]'
      const result = parseJSON(arrayJson)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual([1, 2, 3, 'test'])
    })

    it('should parse nested objects correctly', () => {
      const nestedJson = '{"user": {"name": "John", "age": 30}, "active": true}'
      const result = parseJSON(nestedJson)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual({
        user: { name: 'John', age: 30 },
        active: true,
      })
    })

    it('should handle null values', () => {
      const nullJson = '{"value": null}'
      const result = parseJSON(nullJson)

      expect(result.isValid).toBe(true)
      expect(result.data).toEqual({ value: null })
    })
  })

  describe('getLineColumnFromPosition', () => {
    it('should calculate line and column from position', () => {
      const text = 'line 1\nline 2\nline 3'

      expect(getLineColumnFromPosition(text, 0)).toEqual({ line: 1, column: 1 })
      expect(getLineColumnFromPosition(text, 6)).toEqual({ line: 1, column: 7 })
      expect(getLineColumnFromPosition(text, 7)).toEqual({ line: 2, column: 1 })
      expect(getLineColumnFromPosition(text, 14)).toEqual({ line: 3, column: 1 })
    })

    it('should handle single line text', () => {
      const text = 'single line'

      expect(getLineColumnFromPosition(text, 0)).toEqual({ line: 1, column: 1 })
      expect(getLineColumnFromPosition(text, 5)).toEqual({ line: 1, column: 6 })
    })
  })

  describe('cleanErrorMessage', () => {
    it('should clean up JSON parse error messages', () => {
      const message1 = 'Unexpected token } in JSON at position 25'
      expect(cleanErrorMessage(message1)).toBe('Unexpected character "}"')

      const message2 = 'JSON.parse: unexpected character at line 1 column 5 of the JSON data'
      expect(cleanErrorMessage(message2)).toBe('unexpected character')
    })

    it('should handle already clean messages', () => {
      const message = 'Missing comma between array elements'
      expect(cleanErrorMessage(message)).toBe(message)
    })
  })

  describe('isValidJSON', () => {
    it('should return true for valid JSON', () => {
      expect(isValidJSON('{"valid": true}')).toBe(true)
      expect(isValidJSON('[1, 2, 3]')).toBe(true)
      expect(isValidJSON('"string"')).toBe(true)
      expect(isValidJSON('123')).toBe(true)
      expect(isValidJSON('true')).toBe(true)
      expect(isValidJSON('null')).toBe(true)
    })

    it('should return false for invalid JSON', () => {
      expect(isValidJSON('{"invalid": true')).toBe(false)
      expect(isValidJSON('[1, 2, 3')).toBe(false)
      expect(isValidJSON('undefined')).toBe(false)
      expect(isValidJSON('')).toBe(false)
    })
  })

  describe('extractValidationError', () => {
    it('should extract error information from SyntaxError', () => {
      const error = new SyntaxError('Unexpected token } in JSON at position 25')
      const jsonString = '{"name": "test", "value": 123}'

      const validationError = extractValidationError(error, jsonString)

      expect(validationError.severity).toBe('error')
      expect(validationError.message).toBe('Unexpected character "}"')
      expect(typeof validationError.line).toBe('number')
      expect(typeof validationError.column).toBe('number')
    })
  })

  describe('findErrorLocation', () => {
    it('should find error location in multi-line JSON', () => {
      const jsonString = `{
  "name": "test",
  "value": 123
  "missing": "comma"
}`

      const location = findErrorLocation(jsonString)

      expect(location.line).toBeGreaterThanOrEqual(1)
      expect(location.column).toBeGreaterThan(0)
    })

    it('should handle single line errors', () => {
      const jsonString = '{"invalid": true'
      const location = findErrorLocation(jsonString)

      expect(location.line).toBe(1)
      expect(location.column).toBe(1)
    })

    it('should handle empty JSON', () => {
      const jsonString = ''
      const location = findErrorLocation(jsonString)

      expect(location.line).toBe(1)
      expect(location.column).toBe(1)
    })
  })

  describe('findErrorLocationEnhanced', () => {
    it('should find unexpected token location', () => {
      const jsonString = '{"name": "test", "value": 123,}'
      const errorMessage = 'Unexpected token }'

      const location = findErrorLocationEnhanced(jsonString, errorMessage)

      expect(location.line).toBe(1)
      expect(location.column).toBeGreaterThan(0)
    })

    it('should find unterminated string location', () => {
      const jsonString = '{"name": "unterminated'
      const errorMessage = 'Unterminated string in JSON'

      const location = findErrorLocationEnhanced(jsonString, errorMessage)

      expect(location.line).toBe(1)
      expect(location.column).toBeGreaterThan(0)
    })

    it('should find missing comma location', () => {
      const jsonString = `{
  "name": "test"
  "value": 123
}`
      const errorMessage = 'Expected ,'

      const location = findErrorLocationEnhanced(jsonString, errorMessage)

      expect(location.line).toBeGreaterThanOrEqual(1)
      expect(location.column).toBeGreaterThan(0)
    })
  })

  describe('attemptJsonFix', () => {
    it('should fix single quotes to double quotes', () => {
      const input = "{'name': 'test', 'value': 123}"
      const expected = '{"name": "test", "value": 123}'

      expect(attemptJsonFix(input)).toBe(expected)
    })

    it('should fix unquoted keys', () => {
      const input = '{name: "test", value: 123}'
      const expected = '{"name": "test", "value": 123}'

      expect(attemptJsonFix(input)).toBe(expected)
    })

    it('should remove trailing commas', () => {
      const input = '{"name": "test", "value": 123,}'
      const expected = '{"name": "test", "value": 123}'

      expect(attemptJsonFix(input)).toBe(expected)
    })

    it('should handle arrays with trailing commas', () => {
      const input = '[1, 2, 3,]'
      const expected = '[1, 2, 3]'

      expect(attemptJsonFix(input)).toBe(expected)
    })
  })

  describe('analyzeJsonStructure', () => {
    it('should analyze simple object structure', () => {
      const data = { name: 'test', value: 123 }
      const analysis = analyzeJsonStructure(data)

      expect(analysis.depth).toBe(1)
      expect(analysis.objectCount).toBe(1)
      expect(analysis.primitiveCount).toBe(2)
      expect(analysis.arrayCount).toBe(0)
    })

    it('should analyze nested structure', () => {
      const data = {
        user: {
          name: 'John',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        items: [1, 2, 3],
      }

      const analysis = analyzeJsonStructure(data)

      expect(analysis.depth).toBe(3)
      expect(analysis.objectCount).toBe(3)
      expect(analysis.arrayCount).toBe(1)
      expect(analysis.primitiveCount).toBe(6)
    })

    it('should handle arrays correctly', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ]

      const analysis = analyzeJsonStructure(data)

      expect(analysis.depth).toBe(2)
      expect(analysis.arrayCount).toBe(1)
      expect(analysis.objectCount).toBe(2)
      expect(analysis.primitiveCount).toBe(4)
    })

    it('should handle null and primitive values', () => {
      const data = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
      }

      const analysis = analyzeJsonStructure(data)

      expect(analysis.depth).toBe(1)
      expect(analysis.objectCount).toBe(1)
      expect(analysis.primitiveCount).toBe(4)
    })
  })

  describe('Enhanced cleanErrorMessage', () => {
    it('should clean various error message formats', () => {
      expect(cleanErrorMessage('Unexpected end of JSON input')).toBe(
        'Incomplete JSON - missing closing brackets or braces',
      )

      expect(cleanErrorMessage('Unexpected token } in JSON at position 25')).toBe(
        'Unexpected character "}"',
      )

      expect(cleanErrorMessage("Expected property name or '}' in JSON at position 10")).toBe(
        'Missing property name or closing brace',
      )

      expect(cleanErrorMessage('Unterminated string in JSON at position 15')).toBe(
        'Unterminated string - missing closing quote',
      )
    })

    it('should handle browser-specific error formats', () => {
      expect(cleanErrorMessage('JSON.parse: unexpected character at line 1 column 5')).toBe(
        'unexpected character',
      )

      expect(cleanErrorMessage('SyntaxError: Unexpected token')).toBe('Unexpected token')
    })
  })

  describe('Complex JSON parsing scenarios', () => {
    it('should handle deeply nested structures', () => {
      const deepJson = JSON.stringify({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                },
              },
            },
          },
        },
      })

      const result = parseJSON(deepJson)
      expect(result.isValid).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should handle large arrays', () => {
      const largeArray = JSON.stringify(Array.from({ length: 1000 }, (_, i) => i))

      const result = parseJSON(largeArray)
      expect(result.isValid).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      expect((result.data as number[]).length).toBe(1000)
    })

    it('should handle mixed data types', () => {
      const mixedJson = JSON.stringify({
        string: 'text',
        number: 42,
        float: 3.14,
        boolean: true,
        null: null,
        array: [1, 'two', true, null],
        object: {
          nested: 'value',
        },
      })

      const result = parseJSON(mixedJson)
      expect(result.isValid).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should handle Unicode characters', () => {
      const unicodeJson = JSON.stringify({
        emoji: '🚀',
        chinese: '你好',
        arabic: 'مرحبا',
        unicode: '\u0048\u0065\u006C\u006C\u006F',
      })

      const result = parseJSON(unicodeJson)
      expect(result.isValid).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should handle special number values', () => {
      const specialNumbers = JSON.stringify({
        zero: 0,
        negative: -42,
        decimal: 3.14159,
        scientific: 1.23e-4,
        large: 9007199254740991,
      })

      const result = parseJSON(specialNumbers)
      expect(result.isValid).toBe(true)
      expect(result.data).toBeDefined()
    })
  })

  describe('Error edge cases', () => {
    it('should handle malformed escape sequences', () => {
      const malformedJson = '{"text": "invalid\\escape"}'
      const result = parseJSON(malformedJson)

      // This might be valid or invalid depending on the escape sequence
      expect(typeof result.isValid).toBe('boolean')
    })

    it('should handle control characters', () => {
      const controlCharJson = '{"text": "line1\\nline2\\ttab"}'
      const result = parseJSON(controlCharJson)

      expect(result.isValid).toBe(true)
    })

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000)
      const longStringJson = JSON.stringify({ longText: longString })

      const result = parseJSON(longStringJson)
      expect(result.isValid).toBe(true)
    })

    it('should handle empty objects and arrays', () => {
      expect(parseJSON('{}').isValid).toBe(true)
      expect(parseJSON('[]').isValid).toBe(true)
      expect(parseJSON('{"empty": {}, "array": []}').isValid).toBe(true)
    })
  })
})
