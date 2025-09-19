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

        expect(result.nodes).toHaveLength(1) // Only root node (primitives are inline)
        expect(result.links).toHaveLength(0) // No links for primitive properties

        // Check root node
        const rootNode = result.nodes.find((n) => n.id === 'root')!
        expect(rootNode.type).toBe('object')
        expect(rootNode.children).toHaveLength(0) // No child nodes for primitives
        expect(rootNode.properties).toHaveLength(2) // Properties are inline

        // Check properties are inline
        const nameProperty = rootNode.properties.find((p) => p.key === 'name')!
        expect(nameProperty.value).toBe('John')
        expect(nameProperty.type).toBe('string')
        expect(nameProperty.hasChildNode).toBe(false)

        const ageProperty = rootNode.properties.find((p) => p.key === 'age')!
        expect(ageProperty.value).toBe(30)
        expect(ageProperty.type).toBe('number')
        expect(ageProperty.hasChildNode).toBe(false)
      })

      it('should build graph for simple array', () => {
        const data = ['apple', 'banana', 'cherry']
        const result = GraphBuilder.buildGraph(data)

        expect(result.nodes).toHaveLength(1) // Only root node (primitive values are inline)
        expect(result.links).toHaveLength(0) // No links since primitives are inline

        // Check root node
        const rootNode = result.nodes.find((n) => n.id === 'root')!
        expect(rootNode.type).toBe('array')
        expect(rootNode.children).toEqual([]) // No child nodes for primitive values
        expect(rootNode.properties).toHaveLength(3) // All array items as properties

        // Check array item properties (displayed inline)
        const prop0 = rootNode.properties.find((p) => p.key === 0)!
        expect(prop0.value).toBe('apple')
        expect(prop0.type).toBe('string')
        expect(prop0.hasChildNode).toBe(false)

        const prop1 = rootNode.properties.find((p) => p.key === 1)!
        expect(prop1.value).toBe('banana')
        expect(prop1.type).toBe('string')
        expect(prop1.hasChildNode).toBe(false)

        const prop2 = rootNode.properties.find((p) => p.key === 2)!
        expect(prop2.value).toBe('cherry')
        expect(prop2.type).toBe('string')
        expect(prop2.hasChildNode).toBe(false)
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

        expect(result.nodes).toHaveLength(3) // root + user + hobbies (primitives are inline)
        expect(result.links).toHaveLength(2) // root->user, user->hobbies

        // Check root node
        const rootNode = result.nodes.find((n) => n.id === 'root')!
        expect(rootNode.type).toBe('object')
        expect(rootNode.children).toEqual(['user']) // Only container children
        expect(rootNode.properties).toHaveLength(2) // user (child) + count (inline)

        const userProp = rootNode.properties.find((p) => p.key === 'user')!
        expect(userProp.hasChildNode).toBe(true)
        expect(userProp.childNodeId).toBe('user')

        const countProp = rootNode.properties.find((p) => p.key === 'count')!
        expect(countProp.value).toBe(42)
        expect(countProp.hasChildNode).toBe(false)

        // Check user node
        const userNode = result.nodes.find((n) => n.id === 'user')!
        expect(userNode.type).toBe('object')
        expect(userNode.parent).toBe('root')
        expect(userNode.children).toEqual(['user.hobbies']) // Only container children
        expect(userNode.properties).toHaveLength(2) // name (inline) + hobbies (child)

        const nameProp = userNode.properties.find((p) => p.key === 'name')!
        expect(nameProp.value).toBe('John')
        expect(nameProp.hasChildNode).toBe(false)

        const hobbiesProp = userNode.properties.find((p) => p.key === 'hobbies')!
        expect(hobbiesProp.hasChildNode).toBe(true)
        expect(hobbiesProp.childNodeId).toBe('user.hobbies')

        // Check hobbies array node
        const hobbiesNode = result.nodes.find((n) => n.id === 'user.hobbies')!
        expect(hobbiesNode.type).toBe('array')
        expect(hobbiesNode.parent).toBe('user')
        expect(hobbiesNode.children).toEqual([]) // No child nodes for primitive array items
        expect(hobbiesNode.properties).toHaveLength(2) // Both array items as inline properties

        const hobby0Prop = hobbiesNode.properties.find((p) => p.key === 0)!
        expect(hobby0Prop.value).toBe('reading')
        expect(hobby0Prop.hasChildNode).toBe(false)

        const hobby1Prop = hobbiesNode.properties.find((p) => p.key === 1)!
        expect(hobby1Prop.value).toBe('coding')
        expect(hobby1Prop.hasChildNode).toBe(false)
      })

      it('should handle complex nested arrays and objects', () => {
        const data = [
          { id: 1, tags: ['tag1', 'tag2'] },
          { id: 2, tags: ['tag3'] },
        ]
        const result = GraphBuilder.buildGraph(data)

        // Should have: root + 2 objects + 2 tag arrays = 5 nodes (primitives are inline)
        expect(result.nodes).toHaveLength(5)
        expect(result.links).toHaveLength(4) // root->obj1, root->obj2, obj1->tags1, obj2->tags2

        // Check array structure
        const rootNode = result.nodes.find((n) => n.id === 'root')!
        expect(rootNode.type).toBe('array')
        expect(rootNode.children).toEqual(['0', '1']) // Two object children
        expect(rootNode.properties).toHaveLength(2) // Two array items as properties

        // Check first object
        const obj1 = result.nodes.find((n) => n.id === '0')!
        expect(obj1.type).toBe('object')
        expect(obj1.children).toEqual(['0.tags']) // Only tags array as child
        expect(obj1.properties).toHaveLength(2) // id (inline) + tags (child)

        const idProp1 = obj1.properties.find((p) => p.key === 'id')!
        expect(idProp1.value).toBe(1)
        expect(idProp1.hasChildNode).toBe(false)

        const tagsProp1 = obj1.properties.find((p) => p.key === 'tags')!
        expect(tagsProp1.hasChildNode).toBe(true)
        expect(tagsProp1.childNodeId).toBe('0.tags')

        // Check first tags array
        const tags1 = result.nodes.find((n) => n.id === '0.tags')!
        expect(tags1.type).toBe('array')
        expect(tags1.children).toEqual([]) // No child nodes for primitive array items
        expect(tags1.properties).toHaveLength(2) // Both tag strings as inline properties

        const tag1Prop = tags1.properties.find((p) => p.key === 0)!
        expect(tag1Prop.value).toBe('tag1')
        expect(tag1Prop.hasChildNode).toBe(false)

        const tag2Prop = tags1.properties.find((p) => p.key === 1)!
        expect(tag2Prop.value).toBe('tag2')
        expect(tag2Prop.hasChildNode).toBe(false)
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
        expect(links).toHaveLength(2) // Only 2 links since level3 is primitive (inline)

        // Level 1 link (depth 1)
        const level1Link = links.find((l) => l.target === 'level1')!
        expect(level1Link.strength).toBe(0.9) // 1.0 * (1 - 1 * 0.1)

        // Level 2 link (depth 2)
        const level2Link = links.find((l) => l.target === 'level1.level2')!
        expect(level2Link.strength).toBe(0.8) // 1.0 * (1 - 2 * 0.1)

        // Level 3 is primitive, so it's inline in level2 node, no separate link
        const level2Node = result.nodes.find((n) => n.id === 'level1.level2')!
        const level3Prop = level2Node.properties.find((p) => p.key === 'level3')!
        expect(level3Prop.value).toBe('deep')
        expect(level3Prop.hasChildNode).toBe(false)
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

        expect(result.nodes).toHaveLength(3) // root + emptyArray + emptyObject (primitives are inline)

        const rootNode = result.nodes.find((n) => n.id === 'root')!
        expect(rootNode.properties).toHaveLength(6) // All 6 properties

        // Check primitive properties (inline)
        const nullProp = rootNode.properties.find((p) => p.key === 'nullValue')!
        expect(nullProp.type).toBe('null')
        expect(nullProp.value).toBe(null)
        expect(nullProp.hasChildNode).toBe(false)

        const emptyStringProp = rootNode.properties.find((p) => p.key === 'emptyString')!
        expect(emptyStringProp.type).toBe('string')
        expect(emptyStringProp.value).toBe('')
        expect(emptyStringProp.hasChildNode).toBe(false)

        const zeroProp = rootNode.properties.find((p) => p.key === 'zero')!
        expect(zeroProp.type).toBe('number')
        expect(zeroProp.value).toBe(0)
        expect(zeroProp.hasChildNode).toBe(false)

        const falseProp = rootNode.properties.find((p) => p.key === 'false')!
        expect(falseProp.type).toBe('boolean')
        expect(falseProp.value).toBe(false)
        expect(falseProp.hasChildNode).toBe(false)

        // Check container properties (have child nodes)
        const emptyArrayProp = rootNode.properties.find((p) => p.key === 'emptyArray')!
        expect(emptyArrayProp.hasChildNode).toBe(true)
        expect(emptyArrayProp.childNodeId).toBe('emptyArray')

        const emptyObjectProp = rootNode.properties.find((p) => p.key === 'emptyObject')!
        expect(emptyObjectProp.hasChildNode).toBe(true)
        expect(emptyObjectProp.childNodeId).toBe('emptyObject')

        // Check empty container nodes
        const emptyArrayNode = result.nodes.find((n) => n.id === 'emptyArray')!
        expect(emptyArrayNode.type).toBe('array')
        expect(emptyArrayNode.properties).toHaveLength(0)
        expect(emptyArrayNode.children).toEqual([])

        const emptyObjectNode = result.nodes.find((n) => n.id === 'emptyObject')!
        expect(emptyObjectNode.type).toBe('object')
        expect(emptyObjectNode.properties).toHaveLength(0)
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

        // Should include users array and all its descendants (only container nodes)
        const userIds = result.nodes.map((n) => n.id)
        expect(userIds).toContain('users')
        expect(userIds).toContain('users.0')
        expect(userIds).toContain('users.1')
        expect(userIds).toContain('users.0.profile')
        expect(userIds).toContain('users.1.profile')
        expect(userIds).not.toContain('settings') // Should not include siblings
        expect(userIds).not.toContain('root') // Should not include parent

        // Primitive values like age, city, name, id are inline properties, not separate nodes
        expect(userIds).not.toContain('users.0.profile.age')
        expect(userIds).not.toContain('users.0.name')
        expect(userIds).not.toContain('users.0.id')
      })

      it('should return empty graph for non-existent path', () => {
        const result = GraphBuilder.buildSubgraph(testData, ['nonexistent'])

        expect(result.nodes).toHaveLength(0)
        expect(result.links).toHaveLength(0)
      })

      it('should build subgraph for leaf node', () => {
        // In JSONCrack style, primitive values don't have separate nodes
        // So trying to build a subgraph from a primitive path should return empty
        const result = GraphBuilder.buildSubgraph(testData, ['users', '0', 'name'])

        expect(result.nodes).toHaveLength(0)
        expect(result.links).toHaveLength(0)
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

        expect(stats.nodeCount).toBe(3) // root + users + settings (primitives are inline)
        expect(stats.linkCount).toBe(2) // root->users, root->settings
        expect(stats.maxDepth).toBe(1) // Only 2 levels: root (0) and children (1)
        expect(stats.nodesByType.object).toBe(2) // root + settings
        expect(stats.nodesByType.array).toBe(1) // users
        expect(stats.nodesByType.string).toBe(0) // Primitives don't create separate nodes
        expect(stats.nodesByType.number).toBe(0) // Primitives don't create separate nodes
        expect(stats.nodesByType.boolean).toBe(0) // Primitives don't create separate nodes
        expect(stats.nodesByType.null).toBe(0) // Primitives don't create separate nodes
        expect(stats.avgChildrenPerNode).toBeCloseTo(2 / 3) // 2 total children / 3 nodes (root has 2, users has 0, settings has 0)
      })
    })
  })
})
