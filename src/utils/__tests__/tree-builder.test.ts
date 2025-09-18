import { describe, it, expect } from 'vitest'
import {
  buildTree,
  createNode,
  createChildren,
  getValueType,
  flattenTree,
  findNodeByPath,
  getPathString,
  countNodes,
  getMaxDepth,
} from '../tree-builder'
import type { JSONNode } from '@/types'

describe('Tree Builder', () => {
  describe('buildTree', () => {
    it('should build tree from simple object', () => {
      const data = { name: 'test', value: 123 }
      const tree = buildTree(data)

      expect(tree).toHaveLength(1)
      expect(tree[0].key).toBe('root')
      expect(tree[0].type).toBe('object')
      expect(tree[0].isExpandable).toBe(true)
      expect(tree[0].children).toHaveLength(2)
    })

    it('should build tree from array', () => {
      const data = [1, 2, 'test']
      const tree = buildTree(data)

      expect(tree).toHaveLength(1)
      expect(tree[0].key).toBe('root')
      expect(tree[0].type).toBe('array')
      expect(tree[0].isExpandable).toBe(true)
      expect(tree[0].children).toHaveLength(3)
    })

    it('should handle null data', () => {
      const tree = buildTree(null)
      expect(tree).toHaveLength(0)
    })

    it('should handle undefined data', () => {
      const tree = buildTree(undefined)
      expect(tree).toHaveLength(0)
    })

    it('should build tree from primitive value', () => {
      const data = 'simple string'
      const tree = buildTree(data)

      expect(tree).toHaveLength(1)
      expect(tree[0].key).toBe('root')
      expect(tree[0].type).toBe('string')
      expect(tree[0].isExpandable).toBe(false)
      expect(tree[0].children).toBeUndefined()
    })
  })

  describe('createNode', () => {
    it('should create node for string value', () => {
      const node = createNode('testKey', 'testValue', ['parent'])

      expect(node.key).toBe('testKey')
      expect(node.value).toBe('testValue')
      expect(node.type).toBe('string')
      expect(node.path).toEqual(['parent', 'testKey'])
      expect(node.isExpandable).toBe(false)
      expect(node.children).toBeUndefined()
    })

    it('should create node for number value', () => {
      const node = createNode(0, 42, [])

      expect(node.key).toBe(0)
      expect(node.value).toBe(42)
      expect(node.type).toBe('number')
      expect(node.path).toEqual(['0'])
      expect(node.isExpandable).toBe(false)
    })

    it('should create node for boolean value', () => {
      const node = createNode('flag', true, ['config'])

      expect(node.key).toBe('flag')
      expect(node.value).toBe(true)
      expect(node.type).toBe('boolean')
      expect(node.path).toEqual(['config', 'flag'])
      expect(node.isExpandable).toBe(false)
    })

    it('should create node for null value', () => {
      const node = createNode('empty', null, [])

      expect(node.key).toBe('empty')
      expect(node.value).toBe(null)
      expect(node.type).toBe('null')
      expect(node.path).toEqual(['empty'])
      expect(node.isExpandable).toBe(false)
    })

    it('should create expandable node for object', () => {
      const obj = { nested: 'value' }
      const node = createNode('obj', obj, [])

      expect(node.key).toBe('obj')
      expect(node.value).toBe(obj)
      expect(node.type).toBe('object')
      expect(node.path).toEqual(['obj'])
      expect(node.isExpandable).toBe(true)
      expect(node.children).toHaveLength(1)
    })

    it('should create expandable node for array', () => {
      const arr = [1, 2, 3]
      const node = createNode('arr', arr, [])

      expect(node.key).toBe('arr')
      expect(node.value).toBe(arr)
      expect(node.type).toBe('array')
      expect(node.path).toEqual(['arr'])
      expect(node.isExpandable).toBe(true)
      expect(node.children).toHaveLength(3)
    })
  })

  describe('createChildren', () => {
    it('should create children for object', () => {
      const obj = { name: 'test', age: 25, active: true }
      const children = createChildren(obj, ['parent'])

      expect(children).toHaveLength(3)
      expect(children[0].key).toBe('name')
      expect(children[0].path).toEqual(['parent', 'name'])
      expect(children[1].key).toBe('age')
      expect(children[2].key).toBe('active')
    })

    it('should create children for array', () => {
      const arr = ['first', 'second', 'third']
      const children = createChildren(arr, ['parent'])

      expect(children).toHaveLength(3)
      expect(children[0].key).toBe(0)
      expect(children[0].path).toEqual(['parent', '0'])
      expect(children[1].key).toBe(1)
      expect(children[2].key).toBe(2)
    })

    it('should return empty array for null', () => {
      const children = createChildren(null, [])
      expect(children).toHaveLength(0)
    })

    it('should return empty array for primitive values', () => {
      expect(createChildren('string', [])).toHaveLength(0)
      expect(createChildren(123, [])).toHaveLength(0)
      expect(createChildren(true, [])).toHaveLength(0)
    })
  })

  describe('getValueType', () => {
    it('should identify all JSON types correctly', () => {
      expect(getValueType(null)).toBe('null')
      expect(getValueType([])).toBe('array')
      expect(getValueType([1, 2, 3])).toBe('array')
      expect(getValueType({})).toBe('object')
      expect(getValueType({ key: 'value' })).toBe('object')
      expect(getValueType('string')).toBe('string')
      expect(getValueType(123)).toBe('number')
      expect(getValueType(0)).toBe('number')
      expect(getValueType(true)).toBe('boolean')
      expect(getValueType(false)).toBe('boolean')
    })

    it('should handle edge cases', () => {
      expect(getValueType(undefined)).toBe('string') // fallback
    })
  })

  describe('flattenTree', () => {
    it('should flatten simple tree', () => {
      const tree = buildTree({ name: 'test', value: 123 })
      const flattened = flattenTree(tree)

      expect(flattened).toHaveLength(3) // root + 2 children
      expect(flattened[0].key).toBe('root')
      expect(flattened[1].key).toBe('name')
      expect(flattened[2].key).toBe('value')
    })

    it('should flatten nested tree', () => {
      const data = {
        user: {
          name: 'John',
          details: {
            age: 30,
          },
        },
      }
      const tree = buildTree(data)
      const flattened = flattenTree(tree)

      expect(flattened.length).toBeGreaterThan(3)
      expect(flattened.some((node) => node.key === 'age')).toBe(true)
    })
  })

  describe('findNodeByPath', () => {
    it('should find node by exact path', () => {
      const tree = buildTree({ user: { name: 'John' } })
      const node = findNodeByPath(tree, ['root', 'user', 'name'])

      expect(node).not.toBeNull()
      expect(node?.key).toBe('name')
      expect(node?.value).toBe('John')
    })

    it('should return null for non-existent path', () => {
      const tree = buildTree({ user: { name: 'John' } })
      const node = findNodeByPath(tree, ['root', 'user', 'age'])

      expect(node).toBeNull()
    })

    it('should handle empty tree', () => {
      const node = findNodeByPath([], ['any', 'path'])
      expect(node).toBeNull()
    })
  })

  describe('getPathString', () => {
    it('should convert path array to string', () => {
      expect(getPathString(['root', 'user', 'name'])).toBe('root.user.name')
      expect(getPathString(['root', '0', 'item'])).toBe('root.0.item')
      expect(getPathString(['single'])).toBe('single')
      expect(getPathString([])).toBe('')
    })
  })

  describe('countNodes', () => {
    it('should count all nodes in tree', () => {
      const tree = buildTree({ name: 'test', value: 123 })
      const count = countNodes(tree)

      expect(count).toBe(3) // root + 2 children
    })

    it('should count nodes in nested tree', () => {
      const data = {
        users: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      }
      const tree = buildTree(data)
      const count = countNodes(tree)

      expect(count).toBeGreaterThan(5)
    })

    it('should return 0 for empty tree', () => {
      expect(countNodes([])).toBe(0)
    })
  })

  describe('getMaxDepth', () => {
    it('should calculate depth of simple tree', () => {
      const tree = buildTree({ name: 'test' })
      const depth = getMaxDepth(tree)

      expect(depth).toBe(1) // root level + 1 child level
    })

    it('should calculate depth of nested tree', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }
      const tree = buildTree(data)
      const depth = getMaxDepth(tree)

      expect(depth).toBe(4) // 4 levels deep
    })

    it('should return 0 for empty tree', () => {
      expect(getMaxDepth([])).toBe(0)
    })

    it('should handle array nesting', () => {
      const data = [[[['nested array']]]]
      const tree = buildTree(data)
      const depth = getMaxDepth(tree)

      expect(depth).toBe(4)
    })
  })
})
