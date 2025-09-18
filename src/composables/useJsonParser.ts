import { ref, computed, watch, type Ref } from 'vue'
import { parseJSON, isValidJSON } from '@/utils/json-parser'
import type { ParseResult, ValidationError } from '@/types'

export interface UseJsonParserOptions {
  /**
   * Enable real-time validation as user types
   */
  realTimeValidation?: boolean
  /**
   * Debounce delay for real-time validation in milliseconds
   */
  debounceDelay?: number
  /**
   * Callback when JSON is successfully parsed
   */
  onValidJson?: (data: unknown) => void
  /**
   * Callback when JSON parsing fails
   */
  onInvalidJson?: (errors: ValidationError[]) => void
}

export interface UseJsonParserReturn {
  /**
   * Current JSON input string
   */
  jsonInput: Ref<string>
  /**
   * Parsed JSON data (null if invalid)
   */
  parsedData: Ref<unknown>
  /**
   * Validation errors array
   */
  validationErrors: Ref<ValidationError[]>
  /**
   * Whether the current JSON is valid
   */
  isValid: Ref<boolean>
  /**
   * Whether parsing is currently in progress
   */
  isParsing: Ref<boolean>
  /**
   * Parse result object containing all parsing information
   */
  parseResult: Ref<ParseResult>
  /**
   * Manually trigger JSON parsing
   */
  parseJson: () => void
  /**
   * Clear all input and reset state
   */
  clearInput: () => void
  /**
   * Set JSON input programmatically
   */
  setJsonInput: (json: string) => void
  /**
   * Validate JSON without parsing (quick check)
   */
  validateOnly: (json?: string) => boolean
}

/**
 * Composable for JSON parsing with real-time validation and error handling
 */
export function useJsonParser(options: UseJsonParserOptions = {}): UseJsonParserReturn {
  const { realTimeValidation = true, debounceDelay = 300, onValidJson, onInvalidJson } = options

  // Reactive state
  const jsonInput = ref<string>('')
  const parsedData = ref<unknown>(null)
  const validationErrors = ref<ValidationError[]>([])
  const isValid = ref<boolean>(false)
  const isParsing = ref<boolean>(false)

  // Computed parse result
  const parseResult = computed<ParseResult>(() => ({
    data: parsedData.value,
    errors: validationErrors.value,
    isValid: isValid.value,
  }))

  // Debounce timer for real-time validation
  let debounceTimer: NodeJS.Timeout | null = null

  /**
   * Parse JSON and update reactive state
   */
  const parseJson = () => {
    if (!jsonInput.value.trim()) {
      // Handle empty input
      parsedData.value = null
      validationErrors.value = []
      isValid.value = false
      return
    }

    isParsing.value = true

    try {
      const result = parseJSON(jsonInput.value)

      parsedData.value = result.data
      validationErrors.value = result.errors
      isValid.value = result.isValid

      // Trigger callbacks
      if (result.isValid && onValidJson) {
        onValidJson(result.data)
      } else if (!result.isValid && onInvalidJson) {
        onInvalidJson(result.errors)
      }
    } catch (error) {
      // Fallback error handling
      parsedData.value = null
      validationErrors.value = [
        {
          line: 1,
          column: 1,
          message: error instanceof Error ? error.message : 'Unknown parsing error',
          severity: 'error',
        },
      ]
      isValid.value = false

      if (onInvalidJson) {
        onInvalidJson(validationErrors.value)
      }
    } finally {
      isParsing.value = false
    }
  }

  /**
   * Debounced parsing for real-time validation
   */
  const debouncedParse = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      parseJson()
    }, debounceDelay)
  }

  /**
   * Clear all input and reset state
   */
  const clearInput = () => {
    jsonInput.value = ''
    parsedData.value = null
    validationErrors.value = []
    isValid.value = false
    isParsing.value = false

    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  /**
   * Set JSON input programmatically
   */
  const setJsonInput = (json: string) => {
    jsonInput.value = json
    if (realTimeValidation) {
      debouncedParse()
    }
  }

  /**
   * Validate JSON without full parsing (quick check)
   */
  const validateOnly = (json?: string): boolean => {
    const inputToValidate = json ?? jsonInput.value
    return isValidJSON(inputToValidate)
  }

  // Watch for input changes and trigger real-time validation
  if (realTimeValidation) {
    watch(jsonInput, () => {
      debouncedParse()
    })
  }

  // Cleanup on unmount
  const cleanup = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  }

  // Vue 3 cleanup (will be called when component unmounts)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup)
  }

  return {
    jsonInput,
    parsedData,
    validationErrors,
    isValid,
    isParsing,
    parseResult,
    parseJson,
    clearInput,
    setJsonInput,
    validateOnly,
  }
}
