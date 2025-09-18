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

  // Try to extract position from error message
  const positionMatch = message.match(/position (\d+)/)
  const lineColumnMatch = message.match(/line (\d+) column (\d+)/)

  let line = 1
  let column = 1

  if (lineColumnMatch) {
    line = parseInt(lineColumnMatch[1], 10)
    column = parseInt(lineColumnMatch[2], 10)
  } else if (positionMatch) {
    const position = parseInt(positionMatch[1], 10)
    const lineInfo = getLineColumnFromPosition(jsonString, position)
    line = lineInfo.line
    column = lineInfo.column
  } else {
    // Fallback: try to find error location by attempting partial parsing
    const errorLocation = findErrorLocation(jsonString)
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
 * Cleans up error messages for better user experience
 */
export const cleanErrorMessage = (message: string): string => {
  return message
    .replace(/^Unexpected token .* in JSON at position \d+/, 'Invalid JSON syntax')
    .replace(/^JSON\.parse: /, '')
    .replace(/at line \d+ column \d+ of the JSON data/, '')
    .trim()
}

/**
 * Validates if a string contains valid JSON
 */
export const isValidJSON = (jsonString: string): boolean => {
  return parseJSON(jsonString).isValid
}
