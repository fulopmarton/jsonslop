// Unit tests for graph data transformation utilities

import { describe, it, expect } from 'vitest'
import { GraphBuilder, pathToId, idToPath, getDataType, calculateNodeSize } from '../graph-builder'

describe('Graph Builder Utilities', () => {
  describe('pathToId', () => {
    it('should convert empty path to root', () => {
      expect(pathToId([])).toBe('root')
    })

    it('should convert single element path', () => {
      expect(pathToId(['users'])).toBe('users')
    })

    it('should convert nested path with dots', () => {
      expect(pathToId(['users', '0', 'name'])).toBe('users.0.name')
    })

    it('should handle numeric keys', () => {
      expect(pathToId(['items', '123', 'value'])).toBe('items.123.value')
    })
  })

  describe('idToPath', () => {
    it('should convert root to empty path', () => {
      expect(idToPath('root')).toEqual([])
    })

    it('should convert single element id', () => {
      expect(idToPath('users')).toEqual(['users'])
    })

    it('should convert nested id with dots', () => {
      expect(idToPath('users.0.name')).toEqual(['users', '0', 'name'])
    })
  })

  describe('getDataType', () => {
    it('should identify null values', () => {
      expect(getDataType(null)).toBe('null')
    })

    it('should identify arrays', () => {
      expect(getDataType([])).toBe('array')
      expect(getDataType([1, 2, 3])).toBe('array')
    })

    it('should identify objects', () => {
      expect(getDataType({})).toBe('object')
      expect(getDataType({ key: 'value' })).toBe('object')
    })

    it('should identify strings', () => {
      expect(getDataType('hello')).toBe('string')
      expect(getDataType('')).toBe('string')
    })

    it('should identify numbers', () => {
      expect(getDataType(42)).toBe('number')
      expect(getDataType(0)).toBe('number')
      expect(getDataType(-1.5)).toBe('number')
    })

    it('should identify booleans', () => {
      expect(getDataType(true)).toBe('boolean')
      expect(getDataType(false)).toBe('boolean')
    })

    it('should fallback to string for undefined', () => {
      expect(getDataType(undefined)).toBe('string')
    })
  })

  describe('calculateNodeSize', () => {
    it('should return base size for null', () => {
      expect(calculateNodeSize(null)).toBe(20)
    })

    it('should calculate size for objects based on key count', () => {
      expect(calculateNodeSize({})).toBe(20)
      expect(calculateNodeSize({ a: 1 })).toBe(22)
      expect(calculateNodeSize({ a: 1, b: 2, c: 3 })).toBe(26)
    })

    it('should limit object size to maximum', () => {
      const largeObject = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`key${i}`, i]))
      expect(calculateNodeSize(largeObject)).toBe(50) // 20 + 30 max
    })

    it('should calculate size for arrays based on length', () => {
      expect(calculateNodeSize([])).toBe(20)
      expect(calculateNodeSize([1])).toBe(21.5)
      expect(calculateNodeSize([1, 2, 3])).toBe(24.5)
    })

    it('should limit array size to maximum', () => {
      const largeArray = Array.from({ length: 20 }, (_, i) => i)
      expect(calculateNodeSize(largeArray)).toBe(45) // 20 + 25 max
    })

    it('should calculate size for strings based on length', () => {
      expect(calculateNodeSize('')).toBe(20)
      expect(calculateNodeSize('hello')).toBe(22.5)
      expect(calculateNodeSize('a'.repeat(10))).toBe(25)
    })

    it('should limit string size to maximum', () => {
      const longString = 'a'.repeat(50)
      expect(calculateNodeSize(longString)).toBe(40) // 20 + 20 max
    })

    it('should return base size for primitives', () => {
      expect(calculateNodeSize(42)).toBe(20)
      expect(calculateNodeSize(true)).toBe(20)
      expect(calculateNodeSize(false)).toBe(20)
    })
  })

  describe('GraphBuilder', () => {
    describe('buildGraph', () => {
      it('should handle null/undefined input', () => {
        expect(GraphBuilder.buildGraph(null)).toEqual({ nodes: [], links: [] })
        expect(GraphBuilder.buildGraph(undefined)).toEqual({ nodes: [], links: [] })
      })

      it('should build graph for primitive values', () => {
        const result = GraphBuilder.buildGraph('hello')

        expect(result.nodes).toHaveLength(1)
        expect(result.links).toHaveLength(0)

        const node = result.nodes[0]
        expect(node.id).toBe('root')
        expect(node.key).toBe('root')
        expect(node.value).toBe('hello')
        expect(node.type).toBe('string')
        expect(node.path).toEqual([])
        expect(node.depth).toBe(0)
        expect(node.children).toEqual([])
        expect(node.parent).toBeUndefined()
      })

      it('should build graph for simple object', () => {
        const data = { name: 'John', age: 30 }
        const result = GraphBuilder.buildGraph(data)

        expect(result.nodes).toHaveLength(3) // root + 2 properties
        expect(result.links).toHaveLength(2)

        // Check root node
        const rootNode = result.nodes.find((n) => n.id === 'root')!
        expect(rootNode.type).toBe('object')
        expect(rootNode.children).toHaveLength(2)
        expect(rootNode.children).toContain('name')
        expect(rootNode.children).toContain('age')

        // Check property nodes
        const nameNode = result.nodes.find((n) => n.id === 'name')!
        expect(nameNode.value).toBe('John')
        expect(nameNode.type).toBe('string')
        expect(nameNode.parent).toBe('root')
        expect(nameNode.path).toEqual(['name'])
        expect(nameNode.depth).toBe(1)

        const ageNode = result.nodes.find((n) => n.id === 'age')!
        expect(ageNode.value).toBe(30)
        expect(ageNode.type).toBe('number')
        expect(ageNode.parent).toBe('root')
        expect(ageNode.path).toEqual(['age'])
        expect(ageNode.depth).toBe(1)

        // Check links
        expect(result.links).toEqual([
          {
            source: 'root',
            target: 'name',
            type: 'parent-child',
            strength: 0.9, // 1.0 * (1 - 1 * 0.1)
          },
          {
            source: 'root',
            target: 'age',
            type: 'parent-child',
            strength: 0.9, // 1.0 * (1 - 1 * 0.1)
          },
        ])
      })

      it('should build graph for simple array', () => {
        const data = ['apple', 'banana', 'cherry']
        const result = GraphBuilder.buildGraph(data)

        expect(result.nodes).toHaveLength(4) // root + 3 items
        expect(result.links).toHaveLength(3)

        // Check root node
        const rootNode = result.nodes.find((n) => n.id === 'root')!
        expect(rootNode.type).toBe('array')
        expect(rootNode.children).toEqual(['0', '1', '2'])

        // Check array item nodes
        const item0 = result.nodes.find((n) => n.id === '0')!
        expect(item0.value).toBe('apple')
        expect(item0.key).toBe('0')
        expect(item0.path).toEqual(['0'])
        expect(item0.parent).toBe('root')

        // Check array-item link type
        const link0 = result.links.find((l) => l.target === '0')!
        expect(link0.type).toBe('array-item')
        expect(link0.strength).toBeCloseTo(0.72) // 0.8 * (1 - 1 * 0.1)
      })

      it('should build graph for nested structures', () => {
        const data = {
          user: {
            name: 'John',
            hobbies: ['reading', 'coding'],
          },
          count: 42,
        }
        const result = GraphBuilder.buildGraph(data)

        expect(result.nodes).toHaveLength(7) // root + user + name + hobbies + 2 hobby items + count
        expect(result.links).toHaveLength(6)

        // Check nested object
        const userNode = result.nodes.find((n) => n.id === 'user')!
        expect(userNode.type).toBe('object')
        expect(userNode.depth).toBe(1)
        expect(userNode.children).toContain('user.name')
        expect(userNode.children).toContain('user.hobbies')

        // Check nested array
        const hobbiesNode = result.nodes.find((n) => n.id === 'user.hobbies')!
        expect(hobbiesNode.type).toBe('array')
        expect(hobbiesNode.depth).toBe(2)
        expect(hobbiesNode.children).toEqual(['user.hobbies.0', 'user.hobbies.1'])

        // Check deeply nested items
        const hobby0 = result.nodes.find((n) => n.id === 'user.hobbies.0')!
        expect(hobby0.value).toBe('reading')
        expect(hobby0.depth).toBe(3)
        expect(hobby0.path).toEqual(['user', 'hobbies', '0'])
      })

      it('should handle complex nested arrays and objects', () => {
        const data = [
          { id: 1, tags: ['tag1', 'tag2'] },
          { id: 2, tags: ['tag3'] },
        ]
        const result = GraphBuilder.buildGraph(data)

        // Should have: root + 2 objects + 2 id fields + 2 tag arrays + 3 tag strings = 10 nodes
        expect(result.nodes).toHaveLength(10)
        expect(result.links).toHaveLength(9)

        // Check array structure
        const rootNode = result.nodes.find((n) => n.id === 'root')!
        expect(rootNode.type).toBe('array')
        expect(rootNode.children).toEqual(['0', '1'])

        // Check nested object in array
        const obj0 = result.nodes.find((n) => n.id === '0')!
        expect(obj0.type).toBe('object')
        expect(obj0.children).toContain('0.id')
        expect(obj0.children).toContain('0.tags')

        // Check nested array in object
        const tags0 = result.nodes.find((n) => n.id === '0.tags')!
        expect(tags0.type).toBe('array')
        expect(tags0.children).toEqual(['0.tags.0', '0.tags.1'])
      })

      it('should calculate link strength based on depth', () => {
        const data = {
          level1: {
            level2: {
              level3: 'deep',
            },
          },
        }
        const result = GraphBuilder.buildGraph(data)

        const links = result.links

        // Level 1 link (depth 1)
        const level1Link = links.find((l) => l.target === 'level1')!
        expect(level1Link.strength).toBe(0.9) // 1.0 * (1 - 1 * 0.1)

        // Level 2 link (depth 2)
        const level2Link = links.find((l) => l.target === 'level1.level2')!
        expect(level2Link.strength).toBe(0.8) // 1.0 * (1 - 2 * 0.1)

        // Level 3 link (depth 3)
        const level3Link = links.find((l) => l.target === 'level1.level2.level3')!
        expect(level3Link.strength).toBe(0.7) // 1.0 * (1 - 3 * 0.1)
      })

      it('should handle edge cases with special values', () => {
        const data = {
          nullValue: null,
          emptyString: '',
          emptyArray: [],
          emptyObject: {},
          zero: 0,
          false: false,
        }
        const result = GraphBuilder.buildGraph(data)

        expect(result.nodes).toHaveLength(7) // root + 6 properties

        const nullNode = result.nodes.find((n) => n.id === 'nullValue')!
        expect(nullNode.type).toBe('null')
        expect(nullNode.value).toBe(null)

        const emptyStringNode = result.nodes.find((n) => n.id === 'emptyString')!
        expect(emptyStringNode.type).toBe('string')
        expect(emptyStringNode.value).toBe('')

        const emptyArrayNode = result.nodes.find((n) => n.id === 'emptyArray')!
        expect(emptyArrayNode.type).toBe('array')
        expect(emptyArrayNode.children).toEqual([])

        const emptyObjectNode = result.nodes.find((n) => n.id === 'emptyObject')!
        expect(emptyObjectNode.type).toBe('object')
        expect(emptyObjectNode.children).toEqual([])
      })
    })

    describe('buildSubgraph', () => {
      const testData = {
        users: [
          { id: 1, name: 'John', profile: { age: 30, city: 'NYC' } },
          { id: 2, name: 'Jane', profile: { age: 25, city: 'LA' } },
        ],
        settings: { theme: 'dark', lang: 'en' },
      }

      it('should build subgraph from root', () => {
        const result = GraphBuilder.buildSubgraph(testData, [])
        const fullGraph = GraphBuilder.buildGraph(testData)

        expect(result.nodes).toHaveLength(fullGraph.nodes.length)
        expect(result.links).toHaveLength(fullGraph.links.length)
      })

      it('should build subgraph from specific path', () => {
        const result = GraphBuilder.buildSubgraph(testData, ['users'])

        // Should include users array and all its descendants
        const userIds = result.nodes.map((n) => n.id)
        expect(userIds).toContain('users')
        expect(userIds).toContain('users.0')
        expect(userIds).toContain('users.0.profile')
        expect(userIds).toContain('users.0.profile.age')
        expect(userIds).not.toContain('settings') // Should not include siblings
        expect(userIds).not.toContain('root') // Should not include parent
      })

      it('should return empty graph for non-existent path', () => {
        const result = GraphBuilder.buildSubgraph(testData, ['nonexistent'])

        expect(result.nodes).toHaveLength(0)
        expect(result.links).toHaveLength(0)
      })

      it('should build subgraph for leaf node', () => {
        const result = GraphBuilder.buildSubgraph(testData, ['users', '0', 'name'])

        expect(result.nodes).toHaveLength(1)
        expect(result.links).toHaveLength(0)
        expect(result.nodes[0].id).toBe('users.0.name')
        expect(result.nodes[0].value).toBe('John')
      })
    })

    describe('getGraphStats', () => {
      it('should calculate stats for empty graph', () => {
        const stats = GraphBuilder.getGraphStats({ nodes: [], links: [] })

        expect(stats.nodeCount).toBe(0)
        expect(stats.linkCount).toBe(0)
        expect(stats.maxDepth).toBe(0)
        expect(stats.avgChildrenPerNode).toBe(0)
        expect(stats.nodesByType).toEqual({
          object: 0,
          array: 0,
          string: 0,
          number: 0,
          boolean: 0,
          null: 0,
        })
      })

      it('should calculate stats for complex graph', () => {
        const data = {
          users: ['John', 'Jane'],
          settings: { theme: 'dark', enabled: true },
          count: 42,
          data: null,
        }
        const graph = GraphBuilder.buildGraph(data)
        const stats = GraphBuilder.getGraphStats(graph)

        expect(stats.nodeCount).toBe(9) // root + users + 2 names + settings + theme + enabled + count + data
        expect(stats.linkCount).toBe(8)
        expect(stats.maxDepth).toBe(2)
        expect(stats.nodesByType.object).toBe(2) // root + settings
        expect(stats.nodesByType.array).toBe(1) // users
        expect(stats.nodesByType.string).toBe(3) // John + Jane + dark
        expect(stats.nodesByType.number).toBe(1) // 42
        expect(stats.nodesByType.boolean).toBe(1) // true
        expect(stats.nodesByType.null).toBe(1) // null
        expect(stats.avgChildrenPerNode).toBeCloseTo(8 / 9) // 8 total children / 9 nodes
      })
    })
  })
})
