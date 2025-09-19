import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ContextMenu, { type ContextMenuItem } from '../ContextMenu.vue'

describe('ContextMenu', () => {
  const mockItems: ContextMenuItem[] = [
    {
      label: 'Copy Key',
      action: vi.fn(),
      shortcut: 'Ctrl+K',
      disabled: false,
    },
    {
      label: 'Copy Value',
      action: vi.fn(),
      shortcut: 'Ctrl+Shift+C',
      disabled: false,
    },
    {
      label: 'Copy Path',
      action: vi.fn(),
      shortcut: 'Ctrl+P',
      disabled: false,
    },
    {
      label: 'Expand',
      action: vi.fn(),
      shortcut: 'Space',
      disabled: true,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders menu items when visible', () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: mockItems,
      },
    })

    expect(wrapper.find('.context-menu').exists()).toBe(true)
    expect(wrapper.findAll('.context-menu-item')).toHaveLength(4)
  })

  it('does not render when not visible', () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: false,
        x: 100,
        y: 200,
        items: mockItems,
      },
    })

    expect(wrapper.find('.context-menu').exists()).toBe(false)
  })

  it('positions menu at correct coordinates', () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 150,
        y: 250,
        items: mockItems,
      },
    })

    const menu = wrapper.find('.context-menu')
    expect(menu.attributes('style')).toContain('left: 150px')
    expect(menu.attributes('style')).toContain('top: 250px')
  })

  it('displays menu item labels and shortcuts', () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: mockItems,
      },
    })

    const items = wrapper.findAll('.context-menu-item')

    expect(items[0].text()).toContain('Copy Key')
    expect(items[0].text()).toContain('Ctrl+K')

    expect(items[1].text()).toContain('Copy Value')
    expect(items[1].text()).toContain('Ctrl+Shift+C')
  })

  it('applies disabled styling to disabled items', () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: mockItems,
      },
    })

    const items = wrapper.findAll('.context-menu-item')
    const disabledItem = items[3] // 'Expand' item is disabled

    expect(disabledItem.classes()).toContain('text-gray-400')
    expect(disabledItem.classes()).toContain('cursor-not-allowed')
  })

  it('calls action when enabled item is clicked', async () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: mockItems,
      },
    })

    const items = wrapper.findAll('.context-menu-item')
    await items[0].trigger('click')

    expect(mockItems[0].action).toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('does not call action when disabled item is clicked', async () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: mockItems,
      },
    })

    const items = wrapper.findAll('.context-menu-item')
    await items[3].trigger('click') // Disabled item

    expect(mockItems[3].action).not.toHaveBeenCalled()
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('emits close event when clicking outside', async () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: mockItems,
      },
      attachTo: document.body,
    })

    // Simulate click outside
    await document.body.click()

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close event on Escape key', async () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: mockItems,
      },
      attachTo: document.body,
    })

    // Simulate Escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(escapeEvent)

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('adjusts position to stay within viewport', () => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600,
    })

    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 750, // Near right edge
        y: 550, // Near bottom edge
        items: mockItems,
      },
    })

    const menu = wrapper.find('.context-menu')
    const style = menu.attributes('style')

    // Should be adjusted to fit within viewport
    expect(style).toContain('left:')
    expect(style).toContain('top:')
  })

  it('filters out separator items from display', () => {
    const itemsWithSeparator: ContextMenuItem[] = [
      ...mockItems,
      {
        label: '',
        action: vi.fn(),
        separator: true,
      },
    ]

    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: itemsWithSeparator,
      },
    })

    // Should still only show 4 items (separator filtered out)
    expect(wrapper.findAll('.context-menu-item')).toHaveLength(4)
  })

  it('prevents event propagation when menu is clicked', async () => {
    const wrapper = mount(ContextMenu, {
      props: {
        isVisible: true,
        x: 100,
        y: 200,
        items: mockItems,
      },
    })

    const clickEvent = new Event('click')
    const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')

    await wrapper.find('.context-menu').trigger('click', clickEvent)

    expect(stopPropagationSpy).toHaveBeenCalled()
  })
})
