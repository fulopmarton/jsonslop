/**
 * JSON Fixer - Attempts to fix common JSON issues and provides user-friendly fix suggestions
 */

export interface JSONFixResult {
  canFix: boolean
  fixedJSON: string
  fixes: JSONFix[]
  isValid: boolean
}

export interface JSONFix {
  description: string
  type: 'encoding' | 'syntax' | 'formatting' | 'structure'
  severity: 'low' | 'medium' | 'high'
}

export class JSONFixer {
  /**
   * Attempts to fix invalid JSON and returns what fixes were applied
   */
  static attemptFix(input: string): JSONFixResult {
    const result: JSONFixResult = {
      canFix: false,
      fixedJSON: input,
      fixes: [],
      isValid: false,
    }

    if (!input || !input.trim()) {
      return result
    }

    // Try to parse original first
    if (this.isValidJSON(input)) {
      result.isValid = true
      return result
    }

    let working = input.trim()

    // Apply fixes in order of likelihood to help
    working = this.fixWrappingQuotes(working, result)
    working = this.fixEscapedJSON(working, result)
    working = this.fixSingleQuotes(working, result)
    working = this.fixTrailingCommas(working, result)
    working = this.fixUnquotedKeys(working, result)
    working = this.fixMissingCommas(working, result)
    working = this.fixComments(working, result)
    working = this.fixCommonTypos(working, result)

    result.fixedJSON = working
    result.canFix = result.fixes.length > 0
    result.isValid = this.isValidJSON(working)

    return result
  }

  /**
   * Remove wrapping quotes around entire JSON
   */
  private static fixWrappingQuotes(input: string, result: JSONFixResult): string {
    const trimmed = input.trim()

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      const quote = trimmed[0]
      const inner = trimmed.slice(1, -1)

      // Only remove if the inner content looks like JSON
      if (this.looksLikeJSON(inner)) {
        result.fixes.push({
          description: `Remove wrapping ${quote === '"' ? 'double' : 'single'} quotes around entire JSON`,
          type: 'encoding',
          severity: 'high',
        })
        return inner
      }
    }

    return input
  }

  /**
   * Fix double-escaped JSON (common from API responses or logs)
   */
  private static fixEscapedJSON(input: string, result: JSONFixResult): string {
    const trimmed = input.trim()

    // Check if it looks like escaped JSON - be more flexible with detection
    if (trimmed.includes('\\"')) {
      try {
        // Try to parse as an escaped string first
        const unescaped = JSON.parse(`"${trimmed}"`)
        if (this.looksLikeJSON(unescaped) && this.isValidJSON(unescaped)) {
          result.fixes.push({
            description: 'Unescape double-escaped JSON (common from API responses)',
            type: 'encoding',
            severity: 'high',
          })
          return unescaped
        }
      } catch {
        // If that fails, try manual unescaping
        const manuallyUnescaped = trimmed
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\')

        if (this.looksLikeJSON(manuallyUnescaped) && this.isValidJSON(manuallyUnescaped)) {
          result.fixes.push({
            description: 'Unescape manually escaped JSON characters',
            type: 'encoding',
            severity: 'high',
          })
          return manuallyUnescaped
        }
      }
    }

    // Also check for simple cases where the JSON is just escaped without extra wrapping
    // Example: {\"name\": \"John\"} should become {"name": "John"}
    if (trimmed.includes('\\"') && !trimmed.startsWith('"') && !trimmed.endsWith('"')) {
      const simpleUnescape = trimmed.replace(/\\"/g, '"')
      if (this.isValidJSON(simpleUnescape)) {
        result.fixes.push({
          description: 'Remove escape characters from JSON strings',
          type: 'encoding',
          severity: 'high',
        })
        return simpleUnescape
      }
    }

    return input
  }

  /**
   * Replace single quotes with double quotes
   */
  private static fixSingleQuotes(input: string, result: JSONFixResult): string {
    let output = input
    let hasChanges = false

    // Replace single quotes around property names: 'key': -> "key":
    const propertyPattern = /'([^'\\]*(\\.[^'\\]*)*)'/g
    const propertyMatches = input.match(propertyPattern)
    if (propertyMatches) {
      output = output.replace(propertyPattern, '"$1"')
      hasChanges = true
    }

    if (hasChanges && this.isValidJSON(output)) {
      result.fixes.push({
        description: 'Replace single quotes with double quotes (JSON requires double quotes)',
        type: 'syntax',
        severity: 'high',
      })
      return output
    }

    return input
  }

  /**
   * Remove trailing commas
   */
  private static fixTrailingCommas(input: string, result: JSONFixResult): string {
    const trailingCommaPattern = /,(\s*[}\]])/g

    if (trailingCommaPattern.test(input)) {
      const output = input.replace(trailingCommaPattern, '$1')

      if (this.isValidJSON(output) || this.hasFewerErrors(input, output)) {
        result.fixes.push({
          description: 'Remove trailing commas (not allowed in JSON)',
          type: 'syntax',
          severity: 'medium',
        })
        return output
      }
    }

    return input
  }

  /**
   * Add quotes around unquoted object keys
   */
  private static fixUnquotedKeys(input: string, result: JSONFixResult): string {
    // Match unquoted keys: word: -> "word":
    const unquotedKeyPattern = /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g

    if (unquotedKeyPattern.test(input)) {
      const output = input.replace(unquotedKeyPattern, '$1"$2"$3')

      if (this.isValidJSON(output) || this.hasFewerErrors(input, output)) {
        result.fixes.push({
          description: 'Add quotes around unquoted object keys (JSON requires quoted keys)',
          type: 'syntax',
          severity: 'high',
        })
        return output
      }
    }

    return input
  }

  /**
   * Add missing commas between elements
   */
  private static fixMissingCommas(input: string, result: JSONFixResult): string {
    let output = input
    let hasChanges = false

    // Add commas between object properties: "key": "value" "key2" -> "key": "value", "key2"
    const missingCommaInObject = /"([^"]*)"(\s*:\s*"[^"]*")(\s+)"([^"]*)"/g
    if (missingCommaInObject.test(input)) {
      output = output.replace(missingCommaInObject, '"$1"$2,$3"$4"')
      hasChanges = true
    }

    // Add commas between array elements: "item1" "item2" -> "item1", "item2"
    const missingCommaInArray = /"([^"]*)"(\s+)"([^"]*)"/g
    if (missingCommaInArray.test(output)) {
      output = output.replace(missingCommaInArray, '"$1", "$3"')
      hasChanges = true
    }

    if (hasChanges && (this.isValidJSON(output) || this.hasFewerErrors(input, output))) {
      result.fixes.push({
        description: 'Add missing commas between elements',
        type: 'syntax',
        severity: 'medium',
      })
      return output
    }

    return input
  }

  /**
   * Remove JavaScript-style comments
   */
  private static fixComments(input: string, result: JSONFixResult): string {
    let output = input
    let hasChanges = false

    // Remove single-line comments: // comment
    if (/\/\/.*$/m.test(input)) {
      output = output.replace(/\/\/.*$/gm, '')
      hasChanges = true
    }

    // Remove multi-line comments: /* comment */
    if (/\/\*[\s\S]*?\*\//.test(output)) {
      output = output.replace(/\/\*[\s\S]*?\*\//g, '')
      hasChanges = true
    }

    if (hasChanges && (this.isValidJSON(output) || this.hasFewerErrors(input, output))) {
      result.fixes.push({
        description: 'Remove JavaScript-style comments (not allowed in JSON)',
        type: 'syntax',
        severity: 'low',
      })
      return output
    }

    return input
  }

  /**
   * Fix common typos and formatting issues
   */
  private static fixCommonTypos(input: string, result: JSONFixResult): string {
    let output = input
    let hasChanges = false

    // Fix undefined -> null
    if (/\bundefined\b/.test(input)) {
      output = output.replace(/\bundefined\b/g, 'null')
      hasChanges = true
    }

    // Fix True/False -> true/false
    if (/\b(True|False)\b/.test(output)) {
      output = output.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')
      hasChanges = true
    }

    // Fix None -> null
    if (/\bNone\b/.test(output)) {
      output = output.replace(/\bNone\b/g, 'null')
      hasChanges = true
    }

    if (hasChanges && (this.isValidJSON(output) || this.hasFewerErrors(input, output))) {
      result.fixes.push({
        description: 'Fix common value typos (undefined→null, True→true, None→null)',
        type: 'syntax',
        severity: 'low',
      })
      return output
    }

    return input
  }

  /**
   * Check if a string is valid JSON
   */
  private static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if a string looks like it could be JSON
   */
  private static looksLikeJSON(str: string): boolean {
    const trimmed = str.trim()

    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false
    }

    if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
      return false
    }

    return /[{}\[\]":,]/.test(trimmed)
  }

  /**
   * Compare two invalid JSON strings to see which has fewer parsing errors
   */
  private static hasFewerErrors(original: string, modified: string): boolean {
    const getErrorCount = (str: string): number => {
      try {
        JSON.parse(str)
        return 0
      } catch (error) {
        // Simple heuristic: count common error indicators
        const errorStr = error instanceof Error ? error.message.toLowerCase() : ''
        let count = 0
        if (errorStr.includes('unexpected')) count++
        if (errorStr.includes('expected')) count++
        if (errorStr.includes('invalid')) count++
        return Math.max(count, 1)
      }
    }

    return getErrorCount(modified) < getErrorCount(original)
  }

  /**
   * Get a human-readable summary of what fixes would be applied
   */
  static getFixSummary(input: string): string[] {
    const result = this.attemptFix(input)
    return result.fixes.map((fix) => fix.description)
  }

  /**
   * Check if the fixer can help with the given input
   */
  static canHelp(input: string): boolean {
    const result = this.attemptFix(input)
    return result.canFix && result.isValid
  }
}

/**
 * Convenience function for attempting to fix JSON
 */
export function fixJSON(input: string): JSONFixResult {
  return JSONFixer.attemptFix(input)
}
