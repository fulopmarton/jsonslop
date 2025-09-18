import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseJSON } from '../json-parser'
import { buildTree } from '../tree-builder'

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const generateLargeJSON = (depth: number, breadth: number): any => {
    if (depth === 0) {
      return `value-${Math.random()}`
    }

    const obj: any = {}
    for (let i = 0; i < breadth; i++) {
      obj[`key${i}`] = generateLargeJSON(depth - 1, breadth)
    }
    return obj
  }

  const generateLargeArray = (size: number): any[] => {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description for item ${i}`,
      tags: [`tag${i % 10}`, `category${i % 5}`],
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: Math.floor(i / 100) + 1,
      },
    }))
  }

  it('should parse large JSON objects efficiently', () => {
    const largeObject = generateLargeJSON(4, 10) // 10^4 = 10,000 nodes
    const jsonString = JSON.stringify(largeObject)

    const startTime = performance.now()
    const result = parseJSON(jsonString)
    const endTime = performance.now()

    expect(result.isValid).toBe(true)
    expect(result.data).toBeDefined()
    expect(endTime - startTime).toBeLessThan(1000) // Should parse in less than 1 second
  })

  it('should build tree from large JSON efficiently', () => {
    const largeArray = generateLargeArray(1000)

    const startTime = performance.now()
    const tree = buildTree(largeArray)
    const endTime = performance.now()

    expect(tree).toBeDefined()
    expect(tree.length).toBe(1)
    expect(tree[0].children?.length).toBe(1000)
    expect(endTime - startTime).toBeLessThan(500) // Should build in less than 500ms
  })

  it('should handle deeply nested JSON', () => {
    const deepObject = generateLargeJSON(8, 3) // 3^8 = ~6,500 nodes
    const jsonString = JSON.stringify(deepObject)

    const startTime = performance.now()
    const parseResult = parseJSON(jsonString)
    const treeResult = buildTree(parseResult.data)
    const endTime = performance.now()

    expect(parseResult.isValid).toBe(true)
    expect(treeResult).toBeDefined()
    expect(endTime - startTime).toBeLessThan(2000) // Should complete in less than 2 seconds
  })

  it('should handle wide JSON structures', () => {
    const wideObject: any = {}
    for (let i = 0; i < 5000; i++) {
      wideObject[`key${i}`] = {
        value: `value${i}`,
        index: i,
        metadata: { type: 'test', category: i % 10 },
      }
    }

    const jsonString = JSON.stringify(wideObject)

    const startTime = performance.now()
    const parseResult = parseJSON(jsonString)
    const treeResult = buildTree(parseResult.data)
    const endTime = performance.now()

    expect(parseResult.isValid).toBe(true)
    expect(treeResult[0].children?.length).toBe(5000)
    expect(endTime - startTime).toBeLessThan(1500) // Should complete in less than 1.5 seconds
  })

  it('should handle mixed data types efficiently', () => {
    const mixedData = {
      strings: Array.from({ length: 1000 }, (_, i) => `string${i}`),
      numbers: Array.from({ length: 1000 }, (_, i) => i * Math.PI),
      booleans: Array.from({ length: 1000 }, (_, i) => i % 2 === 0),
      nulls: Array.from({ length: 1000 }, () => null),
      objects: Array.from({ length: 500 }, (_, i) => ({
        id: i,
        nested: {
          level1: {
            level2: {
              value: `deep${i}`,
            },
          },
        },
      })),
    }

    const jsonString = JSON.stringify(mixedData)

    const startTime = performance.now()
    const parseResult = parseJSON(jsonString)
    const treeResult = buildTree(parseResult.data)
    const endTime = performance.now()

    expect(parseResult.isValid).toBe(true)
    expect(treeResult[0].children?.length).toBe(5) // 5 top-level keys
    expect(endTime - startTime).toBeLessThan(1000)
  })

  it('should handle large string values', () => {
    const largeString = 'x'.repeat(100000) // 100KB string
    const dataWithLargeStrings = {
      largeStrings: Array.from({ length: 100 }, (_, i) => `${largeString}-${i}`),
    }

    const jsonString = JSON.stringify(dataWithLargeStrings)

    const startTime = performance.now()
    const parseResult = parseJSON(jsonString)
    const treeResult = buildTree(parseResult.data)
    const endTime = performance.now()

    expect(parseResult.isValid).toBe(true)
    expect(treeResult).toBeDefined()
    expect(endTime - startTime).toBeLessThan(2000)
  })

  it('should handle arrays with many elements', () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      value: Math.random(),
      text: `Item ${i}`,
    }))

    const startTime = performance.now()
    const tree = buildTree(largeArray)
    const endTime = performance.now()

    expect(tree.length).toBe(1)
    expect(tree[0].type).toBe('array')
    expect(tree[0].children?.length).toBe(10000)
    expect(endTime - startTime).toBeLessThan(1000)
  })

  it('should maintain performance with complex nested structures', () => {
    const complexData = {
      users: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        profile: {
          name: `User ${i}`,
          email: `user${i}@example.com`,
          preferences: {
            theme: i % 2 === 0 ? 'dark' : 'light',
            notifications: {
              email: true,
              push: i % 3 === 0,
              sms: false,
            },
          },
        },
        posts: Array.from({ length: Math.floor(Math.random() * 10) }, (_, j) => ({
          id: `${i}-${j}`,
          title: `Post ${j} by User ${i}`,
          content: `Content for post ${j}`,
          tags: [`tag${j % 5}`, `user${i % 10}`],
        })),
      })),
    }

    const jsonString = JSON.stringify(complexData)

    const startTime = performance.now()
    const parseResult = parseJSON(jsonString)
    const treeResult = buildTree(parseResult.data)
    const endTime = performance.now()

    expect(parseResult.isValid).toBe(true)
    expect(treeResult).toBeDefined()
    expect(endTime - startTime).toBeLessThan(3000) // Allow more time for complex structure
  })

  it('should handle memory efficiently with large datasets', () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

    const largeData = generateLargeJSON(5, 8) // Moderately large dataset
    const jsonString = JSON.stringify(largeData)

    const parseResult = parseJSON(jsonString)
    const treeResult = buildTree(parseResult.data)

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory

    expect(parseResult.isValid).toBe(true)
    expect(treeResult).toBeDefined()

    // Memory increase should be reasonable (less than 100MB for this test)
    if (initialMemory > 0) {
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
    }
  })

  it('should handle edge case performance scenarios', () => {
    // Very deep but narrow structure
    let deepObject: any = { value: 'end' }
    for (let i = 0; i < 1000; i++) {
      deepObject = { [`level${i}`]: deepObject }
    }

    const startTime = performance.now()
    const parseResult = parseJSON(JSON.stringify(deepObject))
    const treeResult = buildTree(parseResult.data)
    const endTime = performance.now()

    expect(parseResult.isValid).toBe(true)
    expect(treeResult).toBeDefined()
    expect(endTime - startTime).toBeLessThan(1000)
  })

  it('should benchmark against different data patterns', () => {
    const patterns = [
      {
        name: 'flat-object',
        data: Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`key${i}`, `value${i}`])),
      },
      { name: 'flat-array', data: Array.from({ length: 5000 }, (_, i) => `item${i}`) },
      { name: 'nested-objects', data: generateLargeJSON(3, 20) },
      {
        name: 'mixed-types',
        data: {
          strings: Array.from({ length: 1000 }, (_, i) => `str${i}`),
          numbers: Array.from({ length: 1000 }, (_, i) => i),
          booleans: Array.from({ length: 1000 }, (_, i) => i % 2 === 0),
        },
      },
    ]

    const results = patterns.map((pattern) => {
      const jsonString = JSON.stringify(pattern.data)

      const startTime = performance.now()
      const parseResult = parseJSON(jsonString)
      const treeResult = buildTree(parseResult.data)
      const endTime = performance.now()

      return {
        pattern: pattern.name,
        time: endTime - startTime,
        valid: parseResult.isValid,
        hasTree: !!treeResult,
      }
    })

    // All patterns should complete successfully
    results.forEach((result) => {
      expect(result.valid).toBe(true)
      expect(result.hasTree).toBe(true)
      expect(result.time).toBeLessThan(2000) // All should complete within 2 seconds
    })

    // Log results for analysis (will show in test output)
    console.table(results)
  })
})
