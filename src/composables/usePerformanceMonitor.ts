import { ref, computed, onMounted, onUnmounted } from 'vue'

export interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  nodeCount: number
  visibleNodes: number
  searchTime: number
  lastUpdate: number
}

export interface PerformanceOptions {
  enableMemoryMonitoring?: boolean
  enableRenderTimeTracking?: boolean
  sampleInterval?: number
  maxSamples?: number
}

export function usePerformanceMonitor(options: PerformanceOptions = {}) {
  const {
    enableMemoryMonitoring = true,
    enableRenderTimeTracking = true,
    sampleInterval = 1000,
    maxSamples = 100,
  } = options

  // State
  const metrics = ref<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    nodeCount: 0,
    visibleNodes: 0,
    searchTime: 0,
    lastUpdate: Date.now(),
  })

  const performanceHistory = ref<PerformanceMetrics[]>([])
  const isMonitoring = ref(false)
  const monitoringInterval = ref<NodeJS.Timeout | null>(null)

  // Performance tracking
  const renderStartTime = ref<number>(0)
  const searchStartTime = ref<number>(0)

  // Start render time tracking
  const startRenderTracking = () => {
    if (enableRenderTimeTracking) {
      renderStartTime.value = performance.now()
    }
  }

  // End render time tracking
  const endRenderTracking = () => {
    if (enableRenderTimeTracking && renderStartTime.value > 0) {
      const renderTime = performance.now() - renderStartTime.value
      metrics.value.renderTime = renderTime
      renderStartTime.value = 0
    }
  }

  // Start search time tracking
  const startSearchTracking = () => {
    searchStartTime.value = performance.now()
  }

  // End search time tracking
  const endSearchTracking = () => {
    if (searchStartTime.value > 0) {
      const searchTime = performance.now() - searchStartTime.value
      metrics.value.searchTime = searchTime
      searchStartTime.value = 0
    }
  }

  // Update node counts
  const updateNodeCounts = (totalNodes: number, visibleNodes: number) => {
    metrics.value.nodeCount = totalNodes
    metrics.value.visibleNodes = visibleNodes
  }

  // Get memory usage (if available)
  const getMemoryUsage = (): number => {
    if (!enableMemoryMonitoring) return 0

    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }

    return 0
  }

  // Update metrics
  const updateMetrics = () => {
    metrics.value.memoryUsage = getMemoryUsage()
    metrics.value.lastUpdate = Date.now()

    // Add to history
    performanceHistory.value.push({ ...metrics.value })

    // Limit history size
    if (performanceHistory.value.length > maxSamples) {
      performanceHistory.value.shift()
    }
  }

  // Start monitoring
  const startMonitoring = () => {
    if (isMonitoring.value) return

    isMonitoring.value = true
    monitoringInterval.value = setInterval(updateMetrics, sampleInterval)
  }

  // Stop monitoring
  const stopMonitoring = () => {
    if (!isMonitoring.value) return

    isMonitoring.value = false
    if (monitoringInterval.value) {
      clearInterval(monitoringInterval.value)
      monitoringInterval.value = null
    }
  }

  // Get performance summary
  const performanceSummary = computed(() => {
    const history = performanceHistory.value
    if (history.length === 0) return null

    const recent = history.slice(-10) // Last 10 samples

    const avgRenderTime = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length
    const avgMemoryUsage = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length
    const avgSearchTime = recent.reduce((sum, m) => sum + m.searchTime, 0) / recent.length

    const maxRenderTime = Math.max(...recent.map((m) => m.renderTime))
    const maxMemoryUsage = Math.max(...recent.map((m) => m.memoryUsage))

    return {
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
      avgSearchTime: Math.round(avgSearchTime * 100) / 100,
      maxRenderTime: Math.round(maxRenderTime * 100) / 100,
      maxMemoryUsage: Math.round(maxMemoryUsage * 100) / 100,
      sampleCount: recent.length,
    }
  })

  // Performance warnings
  const performanceWarnings = computed(() => {
    const warnings: string[] = []
    const current = metrics.value
    const summary = performanceSummary.value

    if (current.renderTime > 100) {
      warnings.push(`Slow rendering detected: ${current.renderTime.toFixed(1)}ms`)
    }

    if (current.memoryUsage > 100) {
      warnings.push(`High memory usage: ${current.memoryUsage.toFixed(1)}MB`)
    }

    if (current.searchTime > 500) {
      warnings.push(`Slow search performance: ${current.searchTime.toFixed(1)}ms`)
    }

    if (summary && summary.avgRenderTime > 50) {
      warnings.push(`Consistently slow rendering: ${summary.avgRenderTime.toFixed(1)}ms average`)
    }

    return warnings
  })

  // Check if performance is good
  const isPerformanceGood = computed(() => {
    return performanceWarnings.value.length === 0
  })

  // Reset metrics
  const resetMetrics = () => {
    metrics.value = {
      renderTime: 0,
      memoryUsage: 0,
      nodeCount: 0,
      visibleNodes: 0,
      searchTime: 0,
      lastUpdate: Date.now(),
    }
    performanceHistory.value = []
  }

  // Lifecycle
  onMounted(() => {
    startMonitoring()
  })

  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    metrics: computed(() => metrics.value),
    performanceHistory: computed(() => performanceHistory.value),
    isMonitoring: computed(() => isMonitoring.value),

    // Computed
    performanceSummary,
    performanceWarnings,
    isPerformanceGood,

    // Methods
    startRenderTracking,
    endRenderTracking,
    startSearchTracking,
    endSearchTracking,
    updateNodeCounts,
    updateMetrics,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
  }
}
