import type { ValidationError } from '@/types'
import { parseJSON, extractValidationError } from '@/utils/json-parser'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: string[]
}

export interface ValidationOptions {
  /**
   * Check for common JSON formatting issues
   */
  checkFormatting?: boolean
  /**
   * Provide suggestions for fixing errors
   */
  provideSuggestions?: boolean
  /**
   * Maximum depth to analyze for performance
   */
  maxDepth?: number
}

/**
 * Enhanced validation service with real-time feedback and suggestions
 */
export class ValidationService {
  private options: Required<ValidationOptions>

  constructor(options: ValidationOptions = {}) {
    this.options = {
      checkFormatting: true,
      provideSuggestions: true,
      maxDepth: 100,
      ...options,
    }
  }

  /**
   * Comprehensive validation with errors, warnings, and suggestions
   */
  validate(jsonString: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      suggestions: [],
    }

    // Handle empty input
    if (!jsonString.trim()) {
      return {
        ...result,
        suggestions: ['Enter JSON data to begin validation'],
      }
    }

    // Basic JSON parsing validation
    const parseResult = parseJSON(jsonString)
    result.isValid = parseResult.isValid
    result.errors = parseResult.errors

    if (!parseResult.isValid) {
      // Add suggestions for common errors
      if (this.options.provideSuggestions) {
        result.suggestions = this.generateErrorSuggestions(jsonString, parseResult.errors)
      }
      return result
    }

    // Additional validation checks for valid JSON
    if (this.options.checkFormatting) {
      result.warnings = this.checkFormattingIssues(jsonString, parseResult.data)
    }

    // Generate suggestions for improvements
    if (this.options.provideSuggestions) {
      result.suggestions = this.generateImprovementSuggestions(parseResult.data)
    }

    return result
  }

  /**
   * Real-time validation for incremental input
   */
  validateIncremental(jsonString: string, cursorPosition?: number): ValidationResult {
    // For incremental validation, we're more lenient with incomplete JSON
    const result = this.validate(jsonString)

    // If JSON is invalid, check if it might be incomplete rather than malformed
    if (!result.isValid && this.isLikelyIncomplete(jsonString)) {
      result.suggestions = [
        'JSON appears incomplete - continue typing to complete the structure',
        ...result.suggestions,
      ]
    }

    return result
  }

  /**
   * Check if JSON string appears to be incomplete rather than malformed
   */
  private isLikelyIncomplete(jsonString: string): boolean {
    const trimmed = jsonString.trim()

    // Check for unclosed structures
    const openBraces = (trimmed.match(/\{/g) || []).length
    const closeBraces = (trimmed.match(/\}/g) || []).length
    const openBrackets = (trimmed.match(/\[/g) || []).length
    const closeBrackets = (trimmed.match(/\]/g) || []).length

    // If we have more opening than closing, it's likely incomplete
    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      return true
    }

    // Check if it ends with a comma (suggesting more content expected)
    if (trimmed.endsWith(',')) {
      return true
    }

    // Check if it ends with an opening quote (incomplete string)
    if (trimmed.match(/"[^"]*$/)) {
      return true
    }

    // Check for complete but malformed JSON (has balanced brackets but syntax errors)
    // This should NOT be considered incomplete if brackets are balanced and looks complete
    if (
      openBraces === closeBraces &&
      openBrackets === closeBrackets &&
      !trimmed.endsWith(',') &&
      !trimmed.match(/"[^"]*$/)
    ) {
      // If it looks like a complete structure, it's malformed, not incomplete
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        return false
      }
    }

    return false
  }

  /**
   * Generate suggestions for fixing parsing errors
   */
  private generateErrorSuggestions(jsonString: string, errors: ValidationError[]): string[] {
    const suggestions: string[] = []

    for (const error of errors) {
      const errorMessage = error.message.toLowerCase()

      if (
        errorMessage.includes('unexpected character') ||
        errorMessage.includes('unexpected token')
      ) {
        suggestions.push('Check for missing commas, quotes, or brackets')
        suggestions.push('Ensure all strings are properly quoted')
      }

      if (errorMessage.includes('incomplete json') || errorMessage.includes('unexpected end')) {
        suggestions.push('Check for unclosed brackets or braces')
        suggestions.push('Ensure all objects and arrays are properly closed')
      }

      if (errorMessage.includes('trailing comma')) {
        suggestions.push('Remove trailing commas after the last element')
      }

      if (errorMessage.includes('duplicate key')) {
        suggestions.push('Remove or rename duplicate object keys')
      }

      if (errorMessage.includes('missing comma')) {
        if (errorMessage.includes('closing bracket') || errorMessage.includes('closing brace')) {
          suggestions.push('Check for unclosed brackets or braces')
        }
        suggestions.push('Add missing commas between object properties or array elements')
      }

      if (errorMessage.includes('unterminated string')) {
        suggestions.push('Add missing closing quotes for strings')
      }

      if (
        errorMessage.includes('expected double-quoted property name') ||
        errorMessage.includes('expected property name')
      ) {
        suggestions.push('Remove trailing commas after the last element')
      }

      // Check for common formatting issues
      if (this.hasUnquotedKeys(jsonString)) {
        suggestions.push('Ensure all object keys are enclosed in double quotes')
      }

      if (this.hasSingleQuotes(jsonString)) {
        suggestions.push('Replace single quotes with double quotes')
      }
    }

    // Remove duplicates
    return [...new Set(suggestions)]
  }

  /**
   * Generate suggestions for improving valid JSON
   */
  private generateImprovementSuggestions(data: unknown): string[] {
    const suggestions: string[] = []

    try {
      const depth = this.calculateDepth(data)
      if (depth > 10) {
        suggestions.push('Consider flattening deeply nested structures for better readability')
      }

      if (this.hasLargeArrays(data)) {
        suggestions.push('Large arrays may impact visualization performance')
      }

      if (this.hasEmptyValues(data)) {
        suggestions.push('Consider removing or documenting empty values')
      }
    } catch (error) {
      // Ignore errors in suggestion generation
    }

    return suggestions
  }

  /**
   * Check for formatting issues in valid JSON
   */
  private checkFormattingIssues(jsonString: string, data: unknown): ValidationError[] {
    const warnings: ValidationError[] = []

    // Check for inconsistent indentation
    if (this.hasInconsistentIndentation(jsonString)) {
      warnings.push({
        line: 1,
        column: 1,
        message: 'Inconsistent indentation detected',
        severity: 'warning',
      })
    }

    // Check for very long lines
    const lines = jsonString.split('\n')
    lines.forEach((line, index) => {
      if (line.length > 120) {
        warnings.push({
          line: index + 1,
          column: 121,
          message: 'Line exceeds recommended length (120 characters)',
          severity: 'warning',
        })
      }
    })

    return warnings
  }

  /**
   * Helper methods for validation checks
   */
  private hasUnquotedKeys(jsonString: string): boolean {
    // Simple check for unquoted keys (not perfect but catches common cases)
    return /\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/.test(jsonString)
  }

  private hasSingleQuotes(jsonString: string): boolean {
    return jsonString.includes("'")
  }

  private hasInconsistentIndentation(jsonString: string): boolean {
    const lines = jsonString.split('\n')
    const indentations = new Set<number>()

    for (const line of lines) {
      if (line.trim()) {
        const leadingSpaces = line.match(/^ */)?.[0].length || 0
        if (leadingSpaces > 0) {
          indentations.add(leadingSpaces)
        }
      }
    }

    // If we have more than 3 different indentation levels, it might be inconsistent
    return indentations.size > 3
  }

  private calculateDepth(obj: unknown, currentDepth = 0): number {
    if (currentDepth > this.options.maxDepth) {
      return currentDepth
    }

    if (obj === null || typeof obj !== 'object') {
      return currentDepth
    }

    if (Array.isArray(obj)) {
      return Math.max(
        currentDepth,
        ...obj.map((item) => this.calculateDepth(item, currentDepth + 1)),
      )
    }

    const depths = Object.values(obj as Record<string, unknown>).map((value) =>
      this.calculateDepth(value, currentDepth + 1),
    )

    return Math.max(currentDepth, ...depths)
  }

  private hasLargeArrays(obj: unknown): boolean {
    if (Array.isArray(obj)) {
      if (obj.length > 1000) {
        return true
      }
      return obj.some((item) => this.hasLargeArrays(item))
    }

    if (obj && typeof obj === 'object') {
      return Object.values(obj as Record<string, unknown>).some((value) =>
        this.hasLargeArrays(value),
      )
    }

    return false
  }

  private hasEmptyValues(obj: unknown): boolean {
    if (Array.isArray(obj)) {
      return obj.length === 0 || obj.some((item) => this.hasEmptyValues(item))
    }

    if (obj && typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>)
      return (
        entries.length === 0 ||
        entries.some(
          ([, value]) =>
            value === '' || value === null || value === undefined || this.hasEmptyValues(value),
        )
      )
    }

    return obj === '' || obj === null || obj === undefined
  }
}

/**
 * Default validation service instance
 */
export const validationService = new ValidationService()

/**
 * Quick validation function for simple use cases
 */
export function validateJson(jsonString: string, options?: ValidationOptions): ValidationResult {
  const service = new ValidationService(options)
  return service.validate(jsonString)
}
