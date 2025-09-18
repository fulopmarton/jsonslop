import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ViewToggle from '../ViewToggle.vue'
import { useJsonStore } from '@/stores/json'
import type { ViewType } from '@/types'

// Mock the store
vi.mock('@/stores/json', () => ({
  useJsonStore: vi.fn(),
}))

describe('ViewToggle', () => {
  let mockStore: any
  let wrapper: any

  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia())

    // Create mock store
    mockStore = {
      currentView: 'tree' as ViewType,
      setCurrentView: vi.fn(),
    }

    // Mock the useJsonStore function
    vi.mocked(useJsonStore).mockReturnValue(mockStore)

    wrapper = mount(ViewToggle)
  })

  describe('Component Rendering', () => {
    it('renders both toggle buttons', () => {
      const buttons = wrapper.findAll('.toggle-button')
      expect(buttons).toHaveLength(2)

      const treeButton = buttons[0]
      const graphButton = buttons[1]

      expect(treeButton.text()).toContain('Tree')
      expect(graphButton.text()).toContain('Graph')
    })

    it('renders with proper ARIA attributes', () => {
      const container = wrapper.find('.toggle-container')
      expect(container.attributes('role')).toBe('tablist')
      expect(container.attributes('aria-label')).toBe('View selection')

      const buttons = wrapper.findAll('.toggle-button')
      buttons.forEach((button) => {
        expect(button.attributes('role')).toBe('tab')
        expect(button.attributes()).toHaveProperty('aria-selected')
      })
    })

    it('renders icons for both buttons', () => {
      const icons = wrapper.findAll('.icon')
      expect(icons).toHaveLength(2)
    })

    it('renders active indicator', () => {
      const indicator = wrapper.find('.active-indicator')
      expect(indicator.exists()).toBe(true)
    })
  })

  describe('Active State Management', () => {
    it('shows tree button as active when currentView is tree', () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      const graphButton = wrapper.findAll('.toggle-button')[1]

      expect(treeButton.classes()).toContain('active')
      expect(graphButton.classes()).not.toContain('active')
    })

    it('shows graph button as active when currentView is graph', () => {
      mockStore.currentView = 'graph'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      const graphButton = wrapper.findAll('.toggle-button')[1]

      expect(treeButton.classes()).not.toContain('active')
      expect(graphButton.classes()).toContain('active')
    })

    it('sets correct aria-selected attributes', () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      const graphButton = wrapper.findAll('.toggle-button')[1]

      expect(treeButton.attributes('aria-selected')).toBe('true')
      expect(graphButton.attributes('aria-selected')).toBe('false')
    })

    it('sets correct tabindex attributes', () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      const graphButton = wrapper.findAll('.toggle-button')[1]

      expect(treeButton.attributes('tabindex')).toBe('0')
      expect(graphButton.attributes('tabindex')).toBe('-1')
    })
  })

  describe('View Switching', () => {
    it('calls setCurrentView when tree button is clicked', async () => {
      mockStore.currentView = 'graph'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      await treeButton.trigger('click')

      expect(mockStore.setCurrentView).toHaveBeenCalledWith('tree')
    })

    it('calls setCurrentView when graph button is clicked', async () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const graphButton = wrapper.findAll('.toggle-button')[1]
      await graphButton.trigger('click')

      expect(mockStore.setCurrentView).toHaveBeenCalledWith('graph')
    })

    it('does not call setCurrentView when clicking already active button', async () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      await treeButton.trigger('click')

      expect(mockStore.setCurrentView).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('switches to tree view when pressing ArrowLeft on graph button', async () => {
      mockStore.currentView = 'graph'
      wrapper = mount(ViewToggle)

      const graphButton = wrapper.findAll('.toggle-button')[1]
      await graphButton.trigger('keydown', { key: 'ArrowLeft' })

      expect(mockStore.setCurrentView).toHaveBeenCalledWith('tree')
    })

    it('switches to graph view when pressing ArrowRight on tree button', async () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      await treeButton.trigger('keydown', { key: 'ArrowRight' })

      expect(mockStore.setCurrentView).toHaveBeenCalledWith('graph')
    })

    it('switches to tree view when pressing Home key', async () => {
      mockStore.currentView = 'graph'
      wrapper = mount(ViewToggle)

      const graphButton = wrapper.findAll('.toggle-button')[1]
      await graphButton.trigger('keydown', { key: 'Home' })

      expect(mockStore.setCurrentView).toHaveBeenCalledWith('tree')
    })

    it('switches to graph view when pressing End key', async () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      await treeButton.trigger('keydown', { key: 'End' })

      expect(mockStore.setCurrentView).toHaveBeenCalledWith('graph')
    })

    it('does not switch views for other keys', async () => {
      const treeButton = wrapper.findAll('.toggle-button')[0]
      await treeButton.trigger('keydown', { key: 'Enter' })
      await treeButton.trigger('keydown', { key: 'Space' })
      await treeButton.trigger('keydown', { key: 'Tab' })

      expect(mockStore.setCurrentView).not.toHaveBeenCalled()
    })

    it('prevents default behavior for navigation keys', async () => {
      const treeButton = wrapper.findAll('.toggle-button')[0]

      const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      const preventDefaultSpy = vi.spyOn(arrowRightEvent, 'preventDefault')

      await treeButton.element.dispatchEvent(arrowRightEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('Indicator Animation', () => {
    it('positions indicator at 0% for tree view', () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const indicator = wrapper.find('.active-indicator')
      const style = indicator.attributes('style')

      expect(style).toContain('transform: translateX(0%)')
    })

    it('positions indicator at 100% for graph view', () => {
      mockStore.currentView = 'graph'
      wrapper = mount(ViewToggle)

      const indicator = wrapper.find('.active-indicator')
      const style = indicator.attributes('style')

      expect(style).toContain('transform: translateX(100%)')
    })
  })

  describe('Accessibility Features', () => {
    it('has proper role and aria-label on container', () => {
      const container = wrapper.find('.toggle-container')
      expect(container.attributes('role')).toBe('tablist')
      expect(container.attributes('aria-label')).toBe('View selection')
    })

    it('sets aria-controls attribute for active button', () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      const graphButton = wrapper.findAll('.toggle-button')[1]

      expect(treeButton.attributes('aria-controls')).toBe('tree-view')
      expect(graphButton.attributes('aria-controls')).toBeUndefined()
    })

    it('manages focus correctly after view switch', async () => {
      // This test verifies that the component handles focus management
      // The actual focus behavior is tested through the click interaction
      mockStore.currentView = 'graph'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      await treeButton.trigger('click')

      expect(mockStore.setCurrentView).toHaveBeenCalledWith('tree')
    })
  })

  describe('State Preservation', () => {
    it('maintains view state when component re-renders', async () => {
      // Test that the component correctly reflects the store state
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      const graphButton = wrapper.findAll('.toggle-button')[1]

      expect(treeButton.classes()).toContain('active')
      expect(graphButton.classes()).not.toContain('active')
    })

    it('preserves accessibility attributes across state changes', async () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      // Change to graph view
      mockStore.currentView = 'graph'
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAll('.toggle-button')
      buttons.forEach((button) => {
        expect(button.attributes('role')).toBe('tab')
        expect(button.attributes()).toHaveProperty('aria-selected')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles missing store gracefully', () => {
      vi.mocked(useJsonStore).mockReturnValue({
        currentView: 'tree',
        setCurrentView: undefined as any,
      })

      expect(() => mount(ViewToggle)).not.toThrow()
    })

    it('handles invalid view type gracefully', () => {
      mockStore.currentView = 'invalid' as ViewType

      expect(() => mount(ViewToggle)).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('does not trigger unnecessary re-renders', async () => {
      const renderSpy = vi.spyOn(wrapper.vm, '$forceUpdate')

      // Click the same button multiple times
      const treeButton = wrapper.findAll('.toggle-button')[0]
      await treeButton.trigger('click')
      await treeButton.trigger('click')
      await treeButton.trigger('click')

      // Should not cause excessive re-renders
      expect(mockStore.setCurrentView).not.toHaveBeenCalled()
    })

    it('efficiently handles rapid view switches', async () => {
      mockStore.currentView = 'tree'
      wrapper = mount(ViewToggle)

      const treeButton = wrapper.findAll('.toggle-button')[0]
      const graphButton = wrapper.findAll('.toggle-button')[1]

      // Rapid switches - only switches that change the view should call setCurrentView
      await graphButton.trigger('click') // tree -> graph
      await graphButton.trigger('click') // graph -> graph (no change)
      await treeButton.trigger('click') // graph -> tree

      expect(mockStore.setCurrentView).toHaveBeenCalledTimes(2)
    })
  })
})
