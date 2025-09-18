import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClipboard } from '../useClipboard'

// Mock clipboard API
const mockWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

// Mock document.execCommand for fallback tests
const mockExecCommand = vi.fn()
const mockTextArea = {
  value: '',
  style: {},
  setAttribute: vi.fn(),
  focus: vi.fn(),
  select: vi.fn(),
  setSelectionRange: vi.fn(),
}

// Add execCommand to document if it doesn't exist
if (!document.execCommand) {
  ;(document as any).execCommand = mockExecCommand
} else {
  vi.spyOn(document, 'execCommand').mockImplementation(mockExecCommand)
}

vi.spyOn(document, 'createElement').mockImplementation(() => mockTextArea as unknown)
vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn())
vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn())

describe('useClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteText.mockResolvedValue(undefined)
    mockExecCommand.mockReturnValue(true)

    // Reset the mock implementations
    if (document.execCommand) {
      vi.mocked(document.execCommand).mockReturnValue(true)
    }
  })

  it('should initialize with correct default values', () => {
    const { isSupported, isLoading, error } = useClipboard()

    expect(isSupported.value).toBe(true)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBe(null)
  })

  it('should copy text successfully using clipboard API', async () => {
    const onSuccess = vi.fn()
    const { copyToClipboard } = useClipboard({ onSuccess })

    const result = await copyToClipboard('test text')

    expect(result).toBe(true)
    expect(mockWriteText).toHaveBeenCalledWith('test text')
    expect(onSuccess).toHaveBeenCalledWith('test text')
  })

  it('should handle clipboard API failure and use fallback', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard failed'))

    // Ensure execCommand mock returns true for successful fallback
    if (document.execCommand) {
      vi.mocked(document.execCommand).mockReturnValueOnce(true)
    }

    const onSuccess = vi.fn()
    const { copyToClipboard } = useClipboard({ onSuccess })

    const result = await copyToClipboard('test text')

    expect(result).toBe(true)
    expect(mockWriteText).toHaveBeenCalledWith('test text')
    if (document.execCommand) {
      expect(document.execCommand).toHaveBeenCalledWith('copy')
    }
    expect(onSuccess).toHaveBeenCalledWith('test text')
  })

  it('should handle fallback failure', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard failed'))
    mockExecCommand.mockReturnValueOnce(false)
    const onError = vi.fn()
    const { copyToClipboard } = useClipboard({ onError })

    const result = await copyToClipboard('test text')

    expect(result).toBe(false)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should not copy empty text', async () => {
    const { copyToClipboard } = useClipboard()

    const result = await copyToClipboard('')

    expect(result).toBe(false)
    expect(mockWriteText).not.toHaveBeenCalled()
  })

  it('should set loading state during copy operation', async () => {
    let loadingDuringCopy = false
    mockWriteText.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined)
        }, 10)
      })
    })

    const { copyToClipboard, isLoading } = useClipboard()

    const copyPromise = copyToClipboard('test text')

    // Check loading state during operation
    setTimeout(() => {
      loadingDuringCopy = isLoading.value
    }, 5)

    await copyPromise

    expect(loadingDuringCopy).toBe(true)
    expect(isLoading.value).toBe(false)
  })

  it('should handle unsupported clipboard API', () => {
    // Mock unsupported clipboard
    Object.assign(navigator, {
      clipboard: undefined,
    })

    const { isSupported } = useClipboard()

    expect(isSupported.value).toBe(false)
  })
})
