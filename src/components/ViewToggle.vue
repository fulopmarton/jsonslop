<template>
    <div class="view-toggle">
        <div class="toggle-container" role="tablist" aria-label="View selection">
            <button ref="treeButton" class="toggle-button" :class="{ active: currentView === 'tree' }" role="tab"
                :aria-selected="currentView === 'tree'"
                :aria-controls="currentView === 'tree' ? 'tree-view' : undefined"
                :tabindex="currentView === 'tree' ? 0 : -1" @click="switchToView('tree')" @keydown="handleKeydown">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 3v18h18" />
                    <path d="M7 12h10" />
                    <path d="M7 8h7" />
                    <path d="M7 16h4" />
                </svg>
                <span>Tree</span>
            </button>

            <button ref="graphButton" class="toggle-button" :class="{ active: currentView === 'graph' }" role="tab"
                :aria-selected="currentView === 'graph'"
                :aria-controls="currentView === 'graph' ? 'graph-view' : undefined"
                :tabindex="currentView === 'graph' ? 0 : -1" @click="switchToView('graph')" @keydown="handleKeydown">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="18" r="3" />
                    <path d="M9 9l6 0" />
                    <path d="M9 15l6-6" />
                    <path d="M15 9l-6 6" />
                </svg>
                <span>Graph</span>
            </button>
        </div>

        <!-- Animated indicator -->
        <div class="active-indicator" :style="indicatorStyle"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useJsonStore } from '@/stores/json'
import type { ViewType } from '@/types'

const store = useJsonStore()

// Template refs
const treeButton = ref<HTMLButtonElement>()
const graphButton = ref<HTMLButtonElement>()

// Computed properties
const currentView = computed(() => store.currentView)

// Indicator positioning
const indicatorStyle = computed(() => {
    const isTree = currentView.value === 'tree'
    return {
        transform: `translateX(${isTree ? '0%' : '100%'})`,
    }
})

// Methods
const switchToView = async (view: ViewType) => {
    if (view === currentView.value) return

    store.setCurrentView(view)

    // Focus management for accessibility
    await nextTick()
    if (view === 'tree' && treeButton.value) {
        treeButton.value.focus()
    } else if (view === 'graph' && graphButton.value) {
        graphButton.value.focus()
    }
}

const handleKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLButtonElement

    switch (event.key) {
        case 'ArrowLeft':
            event.preventDefault()
            if (target === graphButton.value) {
                switchToView('tree')
            }
            break
        case 'ArrowRight':
            event.preventDefault()
            if (target === treeButton.value) {
                switchToView('graph')
            }
            break
        case 'Home':
            event.preventDefault()
            switchToView('tree')
            break
        case 'End':
            event.preventDefault()
            switchToView('graph')
            break
    }
}

// Initialize focus on mount
onMounted(() => {
    // Set initial tabindex based on current view
    if (currentView.value === 'tree' && treeButton.value) {
        treeButton.value.tabIndex = 0
    } else if (currentView.value === 'graph' && graphButton.value) {
        graphButton.value.tabIndex = 0
    }
})
</script>

<style scoped>
.view-toggle {
    position: relative;
    display: inline-flex;
    background: var(--color-background-soft);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle-container {
    display: flex;
    position: relative;
    z-index: 2;
}

.toggle-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
    position: relative;
    min-width: 80px;
    justify-content: center;
}

.toggle-button:hover {
    color: var(--color-text);
    background: rgba(var(--color-primary-rgb), 0.1);
}

.toggle-button:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}

.toggle-button.active {
    color: var(--color-primary);
    font-weight: 600;
}

.icon {
    width: 16px;
    height: 16px;
    stroke-width: 2;
}

.active-indicator {
    position: absolute;
    top: 4px;
    left: 4px;
    width: calc(50% - 4px);
    height: calc(100% - 8px);
    background: var(--color-background);
    border: 1px solid var(--color-border-hover);
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
    .view-toggle {
        background: var(--color-background-mute);
        border-color: var(--color-border);
    }

    .active-indicator {
        background: var(--color-background-soft);
        border-color: var(--color-border-hover);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
    .toggle-button {
        border: 1px solid transparent;
    }

    .toggle-button:focus {
        outline: 3px solid var(--color-primary);
        outline-offset: 1px;
    }

    .toggle-button.active {
        border-color: var(--color-primary);
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {

    .toggle-button,
    .active-indicator {
        transition: none;
    }
}
</style>
