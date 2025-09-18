import { describe, it, expect } from 'vitest'
import {
  parseJSON,
  extractValidationError,
  getLineColumnFromPosition,
  findErrorLocation,
  cleanErrorMessage,
  isValidJSON,
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
      expect(cleanErrorMessage(message1)).toBe('Invalid JSON syntax')

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
      expect(validationError.message).toBe('Invalid JSON syntax')
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
})
