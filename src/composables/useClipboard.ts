import { ref } from 'vue'

export interface ClipboardOptions {
  onSuccess?: (text: string) => void
  onError?: (error: Error) => void
}

export function useClipboard(options: ClipboardOptions = {}) {
  const isSupported = ref(!!navigator?.clipboard?.writeText)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false

    isLoading.value = true
    error.value = null

    try {
      if (isSupported.value) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers
        await fallbackCopyToClipboard(text)
      }

      options.onSuccess?.(text)
      return true
    } catch (err) {
      const copyError = err instanceof Error ? err : new Error('Copy failed')
      error.value = copyError
      options.onError?.(copyError)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const fallbackCopyToClipboard = async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      textArea.setAttribute('readonly', '')
      textArea.setAttribute('aria-hidden', 'true')

      document.body.appendChild(textArea)

      try {
        textArea.focus()
        textArea.select()
        textArea.setSelectionRange(0, text.length)

        const successful = document.execCommand('copy')
        if (successful) {
          resolve()
        } else {
          reject(new Error('Copy command failed'))
        }
      } catch (err) {
        reject(err)
      } finally {
        document.body.removeChild(textArea)
      }
    })
  }

  return {
    isSupported,
    isLoading,
    error,
    copyToClipboard,
  }
}
