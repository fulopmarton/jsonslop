// JSON parsing utilities

import type { ValidationError, ParseResult } from '@/types'

/**
 * Parses JSON string and returns result with validation errors
 */
export const parseJSON = (jsonString: string): ParseResult => {
  if (!jsonString.trim()) {
    return {
      data: null,
      errors: [],
      isValid: false,
    }
  }

  try {
    const data = JSON.parse(jsonString)
    return {
      data,
      errors: [],
      isValid: true,
    }
  } catch (error) {
    const validationError = extractValidationError(error as SyntaxError, jsonString)
    return {
      data: null,
      errors: [validationError],
      isValid: false,
    }
  }
}

/**
 * Extracts line and column information from JSON parse errors
 */
export const extractValidationError = (error: SyntaxError, jsonString: string): ValidationError => {
  const message = error.message

  // Try to extract position from error message using various patterns
  const positionMatch = message.match(/position (\d+)/)
  const lineColumnMatch = message.match(/line (\d+) column (\d+)/)
  const atLineMatch = message.match(/at line (\d+)/)

  let line = 1
  let column = 1

  if (lineColumnMatch) {
    line = parseInt(lineColumnMatch[1], 10)
    column = parseInt(lineColumnMatch[2], 10)
  } else if (atLineMatch) {
    line = parseInt(atLineMatch[1], 10)
    column = 1
  } else if (positionMatch) {
    const position = parseInt(positionMatch[1], 10)
    const lineInfo = getLineColumnFromPosition(jsonString, position)
    line = lineInfo.line
    column = lineInfo.column
  } else {
    // Enhanced fallback: try to find error location by attempting partial parsing
    const errorLocation = findErrorLocationEnhanced(jsonString, message)
    line = errorLocation.line
    column = errorLocation.column
  }

  return {
    line,
    column,
    message: cleanErrorMessage(message),
    severity: 'error',
  }
}

/**
 * Converts character position to line and column numbers
 */
export const getLineColumnFromPosition = (
  text: string,
  position: number,
): { line: number; column: number } => {
  const lines = text.substring(0, position).split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  }
}

/**
 * Attempts to find error location by parsing progressively smaller portions
 */
export const findErrorLocation = (jsonString: string): { line: number; column: number } => {
  const lines = jsonString.split('\n')

  // Try parsing each line incrementally to find where it breaks
  for (let i = 0; i < lines.length; i++) {
    const partialJson = lines.slice(0, i + 1).join('\n')
    try {
      JSON.parse(partialJson)
    } catch (error) {
      // If this is the first line and it fails, the error is on line 1
      if (i === 0) {
        return { line: 1, column: 1 }
      }
      // Otherwise, the error is likely on the current line
      return { line: i + 1, column: 1 }
    }
  }

  // If we get here, try to find the actual error by checking for common issues
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (
      line.trim() &&
      !line.trim().endsWith(',') &&
      !line.trim().endsWith('{') &&
      !line.trim().endsWith('[')
    ) {
      // Check if this line might be missing a comma or bracket
      const testJson = lines.slice(0, i + 1).join('\n') + '\n}'
      try {
        JSON.parse(testJson)
        return { line: i + 2, column: 1 } // Error is likely on the next line
      } catch {
        // Continue checking
      }
    }
  }

  return { line: Math.max(1, lines.length), column: 1 }
}

/**
 * Enhanced error location finding with better heuristics
 */
export const findErrorLocationEnhanced = (
  jsonString: string,
  errorMessage: string,
): { line: number; column: number } => {
  const lines = jsonString.split('\n')

  // Check for specific error patterns
  if (errorMessage.includes('Unexpected token')) {
    const tokenMatch = errorMessage.match(/Unexpected token (.+?)/)
    if (tokenMatch) {
      const unexpectedToken = tokenMatch[1].trim()

      // Find the line containing the unexpected token
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const tokenIndex = line.indexOf(unexpectedToken)
        if (tokenIndex !== -1) {
          return { line: i + 1, column: tokenIndex + 1 }
        }
      }
    }
  }

  // Check for unterminated string
  if (
    errorMessage.includes('Unterminated string') ||
    errorMessage.includes('unterminated string')
  ) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Look for unmatched quotes
      const quotes = line.match(/"/g) || []
      if (quotes.length % 2 !== 0) {
        const lastQuoteIndex = line.lastIndexOf('"')
        return { line: i + 1, column: lastQuoteIndex + 1 }
      }
    }
  }

  // Check for missing comma
  if (errorMessage.includes('Expected') && errorMessage.includes(',')) {
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i].trim()
      const nextLine = lines[i + 1].trim()

      // Check if current line ends with a value and next line starts with a key/value
      if (
        (currentLine.endsWith('"') ||
          currentLine.endsWith('}') ||
          currentLine.endsWith(']') ||
          /\d$/.test(currentLine)) &&
        (nextLine.startsWith('"') || nextLine.startsWith('{') || nextLine.startsWith('['))
      ) {
        return { line: i + 1, column: currentLine.length + 1 }
      }
    }
  }

  // Fallback to original method
  return findErrorLocation(jsonString)
}

/**
 * Cleans up error messages for better user experience
 */
export const cleanErrorMessage = (message: string): string => {
  return (
    message
      // Handle specific error types with more user-friendly messages first
      .replace(
        /Unexpected end of JSON input/,
        'Incomplete JSON - missing closing brackets or braces',
      )
      .replace(/Unexpected token (.) in JSON at position \d+/, 'Unexpected character "$1"')
      .replace(/Unexpected token (.) in JSON/, 'Unexpected character "$1"')
      .replace(/Expected property name or '}' in JSON/, 'Missing property name or closing brace')
      .replace(
        /Expected ',' or '}' after property value in JSON/,
        'Missing comma or closing brace after property',
      )
      .replace(
        /Expected ',' or ']' after array element in JSON/,
        'Missing comma or closing bracket after array element',
      )
      .replace(/Unterminated string in JSON/, 'Unterminated string - missing closing quote')
      .replace(
        /Bad control character in string literal in JSON/,
        'Invalid control character in string',
      )
      .replace(/Bad Unicode escape in JSON/, 'Invalid Unicode escape sequence')

      // Handle different browser error formats (fallback)
      .replace(/^Unexpected token .* in JSON at position \d+/, 'Invalid JSON syntax')
      .replace(/^JSON\.parse: /, '')
      .replace(/^SyntaxError: /, '')

      // Clean up remaining technical details
      .replace(/at line \d+ column \d+ of the JSON data/, '')
      .replace(/at line \d+ column \d+/, '')
      .replace(/in JSON at position \d+/, '')
      .replace(/at position \d+/, '')
      .trim()
  )
}

/**
 * Validates if a string contains valid JSON
 */
export const isValidJSON = (jsonString: string): boolean => {
  return parseJSON(jsonString).isValid
}

/**
 * Attempts to fix common JSON formatting issues
 */
export const attemptJsonFix = (jsonString: string): string => {
  let fixed = jsonString

  // Fix single quotes to double quotes
  fixed = fixed.replace(/'/g, '"')

  // Fix unquoted keys (simple cases)
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')

  // Fix trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1')

  return fixed
}

/**
 * Provides detailed analysis of JSON structure
 */
export const analyzeJsonStructure = (
  data: unknown,
): {
  depth: number
  nodeCount: number
  arrayCount: number
  objectCount: number
  primitiveCount: number
} => {
  const analysis = {
    depth: 0,
    nodeCount: 0,
    arrayCount: 0,
    objectCount: 0,
    primitiveCount: 0,
  }

  const analyze = (obj: unknown, currentDepth = 0): void => {
    analysis.nodeCount++
    analysis.depth = Math.max(analysis.depth, currentDepth)

    if (obj === null || typeof obj !== 'object') {
      analysis.primitiveCount++
      return
    }

    if (Array.isArray(obj)) {
      analysis.arrayCount++
      obj.forEach((item) => analyze(item, currentDepth + 1))
    } else {
      analysis.objectCount++
      Object.values(obj as Record<string, unknown>).forEach((value) =>
        analyze(value, currentDepth + 1),
      )
    }
  }

  analyze(data)
  return analysis
}
