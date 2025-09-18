<template>
    <Teleport to="body">
        <div v-if="isVisible" ref="menuRef" :class="[
            'context-menu',
            'fixed',
            'z-50',
            'bg-white',
            'dark:bg-gray-800',
            'border',
            'border-gray-200',
            'dark:border-gray-700',
            'rounded-lg',
            'shadow-lg',
            'py-2',
            'min-w-48',
            'max-w-64',
        ]" :style="menuStyle" @click.stop>
            <div v-for="(item, index) in menuItems" :key="index" :class="[
                'context-menu-item',
                'px-4',
                'py-2',
                'text-sm',
                'cursor-pointer',
                'flex',
                'items-center',
                'gap-3',
                'hover:bg-gray-100',
                'dark:hover:bg-gray-700',
                'transition-colors',
                'duration-150',
                {
                    'text-gray-400 dark:text-gray-500 cursor-not-allowed': item.disabled,
                    'text-gray-700 dark:text-gray-300': !item.disabled,
                },
            ]" @click="handleItemClick(item)">
                <component :is="item.icon" v-if="item.icon" class="w-4 h-4 flex-shrink-0" />
                <span class="flex-1 truncate">{{ item.label }}</span>
                <kbd v-if="item.shortcut" class="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {{ item.shortcut }}
                </kbd>
            </div>

            <div v-if="menuItems.some(item => item.separator)"
                class="border-t border-gray-200 dark:border-gray-700 my-1" />
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

export interface ContextMenuItem {
    label: string
    action: () => void
    icon?: unknown
    shortcut?: string
    disabled?: boolean
    separator?: boolean
}

interface Props {
    isVisible: boolean
    x: number
    y: number
    items: ContextMenuItem[]
}

interface Emits {
    (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const menuRef = ref<HTMLElement>()

const menuItems = computed(() => props.items.filter(item => !item.separator))

const menuStyle = computed(() => {
    if (!props.isVisible) return {}

    const padding = 8
    const maxWidth = 256 // max-w-64
    const maxHeight = 400

    let x = props.x
    let y = props.y

    // Adjust position to keep menu within viewport
    if (x + maxWidth > window.innerWidth) {
        x = window.innerWidth - maxWidth - padding
    }
    if (x < padding) {
        x = padding
    }

    if (y + maxHeight > window.innerHeight) {
        y = window.innerHeight - maxHeight - padding
    }
    if (y < padding) {
        y = padding
    }

    return {
        left: `${x}px`,
        top: `${y}px`,
    }
})

const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return

    item.action()
    emit('close')
}

const handleClickOutside = (event: MouseEvent) => {
    if (props.isVisible && menuRef.value && !menuRef.value.contains(event.target as Node)) {
        emit('close')
    }
}

const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.isVisible) {
        emit('close')
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    // Focus the menu when it becomes visible
    nextTick(() => {
        if (props.isVisible && menuRef.value) {
            menuRef.value.focus()
        }
    })
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
.context-menu {
    animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.context-menu-item:focus {
    outline: none;
    background-color: #f3f4f6;
}

.dark .context-menu-item:focus {
    background-color: #374151;
}
</style>
