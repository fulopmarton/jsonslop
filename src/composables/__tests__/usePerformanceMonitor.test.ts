import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { usePerformanceMonitor } from '../usePerformanceMonitor'

// Mock performance.now()
const mockPerformanceNow = vi.fn()
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    },
  },
  writable: true,
})

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockPerformanceNow.mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with default metrics', () => {
    const { metrics, isMonitoring } = usePerformanceMonitor()

    expect(metrics.value.renderTime).toBe(0)
    expect(metrics.value.memoryUsage).toBe(0)
    expect(metrics.value.nodeCount).toBe(0)
    expect(metrics.value.visibleNodes).toBe(0)
    expect(metrics.value.searchTime).toBe(0)
    expect(isMonitoring.value).toBe(true) // Auto-starts on mount
  })

  it('should track render time', () => {
    const { startRenderTracking, endRenderTracking, metrics } = usePerformanceMonitor({
      enableRenderTimeTracking: true,
    })

    mockPerformanceNow.mockReturnValueOnce(100)
    startRenderTracking()

    mockPerformanceNow.mockReturnValueOnce(150)
    endRenderTracking()

    expect(metrics.value.renderTime).toBe(50)
  })

  it('should track search time', () => {
    const { startSearchTracking, endSearchTracking, metrics } = usePerformanceMonitor()

    mockPerformanceNow.mockReturnValueOnce(200)
    startSearchTracking()

    mockPerformanceNow.mockReturnValueOnce(300)
    endSearchTracking()

    expect(metrics.value.searchTime).toBe(100)
  })

  it('should update node counts', () => {
    const { updateNodeCounts, metrics } = usePerformanceMonitor()

    updateNodeCounts(1000, 50)

    expect(metrics.value.nodeCount).toBe(1000)
    expect(metrics.value.visibleNodes).toBe(50)
  })

  it('should monitor memory usage', () => {
    const { updateMetrics, metrics } = usePerformanceMonitor({
      enableMemoryMonitoring: true,
    })

    updateMetrics()

    expect(metrics.value.memoryUsage).toBe(50) // 50MB from mock
  })

  it('should handle missing memory API', () => {
    // Mock performance without memory
    Object.defineProperty(global, 'performance', {
      value: { now: mockPerformanceNow },
      writable: true,
    })

    const { updateMetrics, metrics } = usePerformanceMonitor({
      enableMemoryMonitoring: true,
    })

    updateMetrics()

    expect(metrics.value.memoryUsage).toBe(0)
  })

  it('should maintain performance history', () => {
    const { updateMetrics, performanceHistory } = usePerformanceMonitor({
      maxSamples: 3,
    })

    updateMetrics()
    updateMetrics()
    updateMetrics()

    expect(performanceHistory.value).toHaveLength(3)

    // Add one more to test limit
    updateMetrics()
    expect(performanceHistory.value).toHaveLength(3) // Should still be 3
  })

  it('should calculate performance summary', () => {
    const { updateMetrics, performanceSummary, metrics } = usePerformanceMonitor()

    // Add some test data
    metrics.value.renderTime = 10
    updateMetrics()

    metrics.value.renderTime = 20
    updateMetrics()

    const summary = performanceSummary.value
    expect(summary).toBeDefined()
    expect(summary?.avgRenderTime).toBeGreaterThan(0)
    expect(summary?.sampleCount).toBe(2)
  })

  it('should detect performance warnings', () => {
    const { metrics, performanceWarnings } = usePerformanceMonitor()

    // Set high render time
    metrics.value.renderTime = 150
    metrics.value.memoryUsage = 120
    metrics.value.searchTime = 600

    const warnings = performanceWarnings.value
    expect(warnings).toContain(expect.stringContaining('Slow rendering'))
    expect(warnings).toContain(expect.stringContaining('High memory usage'))
    expect(warnings).toContain(expect.stringContaining('Slow search'))
  })

  it('should indicate good performance when no warnings', () => {
    const { metrics, isPerformanceGood } = usePerformanceMonitor()

    // Set good performance values
    metrics.value.renderTime = 10
    metrics.value.memoryUsage = 20
    metrics.value.searchTime = 50

    expect(isPerformanceGood.value).toBe(true)
  })

  it('should start and stop monitoring', () => {
    const { startMonitoring, stopMonitoring, isMonitoring } = usePerformanceMonitor()

    stopMonitoring()
    expect(isMonitoring.value).toBe(false)

    startMonitoring()
    expect(isMonitoring.value).toBe(true)
  })

  it('should handle monitoring interval', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval')
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    const { startMonitoring, stopMonitoring } = usePerformanceMonitor({
      sampleInterval: 500,
    })

    startMonitoring()
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 500)

    stopMonitoring()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('should reset metrics', () => {
    const { metrics, resetMetrics, performanceHistory } = usePerformanceMonitor()

    // Set some values
    metrics.value.renderTime = 100
    metrics.value.memoryUsage = 50
    performanceHistory.value.push({ ...metrics.value })

    resetMetrics()

    expect(metrics.value.renderTime).toBe(0)
    expect(metrics.value.memoryUsage).toBe(0)
    expect(performanceHistory.value).toHaveLength(0)
  })

  it('should handle render tracking edge cases', () => {
    const { startRenderTracking, endRenderTracking, metrics } = usePerformanceMonitor({
      enableRenderTimeTracking: false,
    })

    startRenderTracking()
    endRenderTracking()

    expect(metrics.value.renderTime).toBe(0) // Should not track when disabled
  })

  it('should handle search tracking edge cases', () => {
    const { startSearchTracking, endSearchTracking, metrics } = usePerformanceMonitor()

    // End without start
    endSearchTracking()
    expect(metrics.value.searchTime).toBe(0)

    // Multiple starts
    mockPerformanceNow.mockReturnValueOnce(100)
    startSearchTracking()

    mockPerformanceNow.mockReturnValueOnce(110)
    startSearchTracking() // Should reset start time

    mockPerformanceNow.mockReturnValueOnce(150)
    endSearchTracking()

    expect(metrics.value.searchTime).toBe(40) // 150 - 110
  })

  it('should handle custom options', () => {
    const options = {
      enableMemoryMonitoring: false,
      enableRenderTimeTracking: false,
      sampleInterval: 2000,
      maxSamples: 50,
    }

    const monitor = usePerformanceMonitor(options)
    expect(monitor).toBeDefined()
  })

  it('should update last update timestamp', () => {
    const { updateMetrics, metrics } = usePerformanceMonitor()

    const beforeUpdate = Date.now()
    updateMetrics()
    const afterUpdate = Date.now()

    expect(metrics.value.lastUpdate).toBeGreaterThanOrEqual(beforeUpdate)
    expect(metrics.value.lastUpdate).toBeLessThanOrEqual(afterUpdate)
  })

  it('should handle performance summary with no history', () => {
    const { performanceSummary } = usePerformanceMonitor()

    expect(performanceSummary.value).toBeNull()
  })

  it('should calculate max values in summary', () => {
    const { updateMetrics, performanceSummary, metrics } = usePerformanceMonitor()

    // Add varying performance data
    metrics.value.renderTime = 10
    metrics.value.memoryUsage = 30
    updateMetrics()

    metrics.value.renderTime = 50 // Max
    metrics.value.memoryUsage = 80 // Max
    updateMetrics()

    metrics.value.renderTime = 20
    metrics.value.memoryUsage = 40
    updateMetrics()

    const summary = performanceSummary.value
    expect(summary?.maxRenderTime).toBe(50)
    expect(summary?.maxMemoryUsage).toBe(80)
  })

  it('should handle consistent slow performance warning', () => {
    const { updateMetrics, performanceWarnings, metrics } = usePerformanceMonitor()

    // Add consistently slow render times
    for (let i = 0; i < 10; i++) {
      metrics.value.renderTime = 60 // Consistently above 50ms average threshold
      updateMetrics()
    }

    const warnings = performanceWarnings.value
    expect(warnings.some((w) => w.includes('Consistently slow rendering'))).toBe(true)
  })
})
