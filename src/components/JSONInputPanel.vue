<template>
    <div class="json-input-panel h-full flex flex-col border-r"
        style="background-color: var(--bg-primary); border-color: var(--border-primary);">
        <!-- Header -->
        <div class="flex items-center justify-between p-3 sm:p-4 border-b panel-header">
            <h2 class="text-base sm:text-lg font-semibold truncate" style="color: var(--text-primary);">JSON Input</h2>
            <div class="flex items-center gap-2 flex-shrink-0">
                <!-- Enhanced Validation Status -->
                <div data-testid="validation-status" class="flex items-center gap-2">
                    <!-- Validating State -->
                    <div v-if="validationStatus === 'validating'" class="flex items-center gap-2 status-info">
                        <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin">
                        </div>
                        <span class="text-xs sm:text-sm font-medium hidden sm:inline">{{ statusMessage }}</span>
                    </div>

                    <!-- Valid State -->
                    <div v-else-if="validationStatus === 'valid'" class="flex items-center gap-2 status-success">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clip-rule="evenodd" />
                        </svg>
                        <span class="text-xs sm:text-sm font-medium hidden sm:inline">{{ statusMessage }}</span>
                    </div>

                    <!-- Warning State -->
                    <div v-else-if="validationStatus === 'warning'" class="flex items-center gap-2 status-warning">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clip-rule="evenodd" />
                        </svg>
                        <span class="text-xs sm:text-sm font-medium hidden sm:inline">{{ statusMessage }}</span>
                    </div>

                    <!-- Invalid State -->
                    <div v-else-if="validationStatus === 'invalid'" class="flex items-center gap-2 status-error">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clip-rule="evenodd" />
                        </svg>
                        <span class="text-xs sm:text-sm font-medium hidden sm:inline">{{ statusMessage }}</span>
                    </div>

                    <!-- Incomplete/Empty State -->
                    <div v-else-if="validationStatus === 'incomplete' || validationStatus === 'empty'"
                        class="flex items-center gap-2" style="color: var(--text-secondary);">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clip-rule="evenodd" />
                        </svg>
                        <span class="text-xs sm:text-sm hidden sm:inline">{{ statusMessage }}</span>
                    </div>
                </div>

                <!-- Clear Button -->
                <button @click="clearInput" :disabled="!rawJsonInput.trim()"
                    class="btn-secondary text-xs px-2 py-1 sm:px-3 sm:py-1 hover-lift"
                    :class="{ 'opacity-50 cursor-not-allowed': !rawJsonInput.trim() }" title="Clear input">
                    Clear
                </button>
            </div>
        </div>

        <!-- Editor Container -->
        <div class="flex-1 relative">
            <div ref="editorContainer" class="absolute inset-0"></div>

            <!-- Enhanced Loading Overlay with Progress -->
            <div v-if="isProcessing" data-testid="loading-overlay"
                class="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                <div class="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin">
                        </div>
                        <span class="text-gray-700 font-medium">{{ processingMessage || 'Processing...' }}</span>
                    </div>

                    <!-- Progress Bar -->
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div data-testid="progress-bar"
                            class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                            :style="{ width: `${processingProgress}%` }"></div>
                    </div>

                    <div class="text-xs text-gray-500 text-center">{{ Math.round(processingProgress) }}% complete</div>
                </div>
            </div>
        </div>

        <!-- Error Display -->
        <div v-if="hasErrorsComputed || hasWarningsComputed" data-testid="error-display"
            class="border-t max-h-32 overflow-y-auto"
            style="border-color: var(--border-primary); background-color: var(--bg-secondary);">
            <div class="p-3">
                <div class="space-y-2">
                    <!-- Errors -->
                    <div v-for="error in validationErrors" :key="`error-${error.line}-${error.column}`"
                        class="flex items-start gap-2 text-sm">
                        <svg class="w-4 h-4 status-error mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clip-rule="evenodd" />
                        </svg>
                        <div class="min-w-0 flex-1">
                            <span class="font-medium status-error">Line {{ error.line }}, Column {{ error.column
                            }}:</span>
                            <span class="status-error ml-1 break-words">{{ error.message }}</span>
                        </div>
                    </div>

                    <!-- Warnings -->
                    <div v-for="warning in validationWarnings" :key="`warning-${warning.line}-${warning.column}`"
                        class="flex items-start gap-2 text-sm">
                        <svg class="w-4 h-4 status-warning mt-0.5 flex-shrink-0" fill="currentColor"
                            viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clip-rule="evenodd" />
                        </svg>
                        <div class="min-w-0 flex-1">
                            <span class="font-medium status-warning">Line {{ warning.line }}, Column {{ warning.column
                            }}:</span>
                            <span class="status-warning ml-1 break-words">{{ warning.message }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Suggestions -->
        <div v-if="validationSuggestions.length > 0" data-testid="suggestions-display"
            class="border-t max-h-24 overflow-y-auto"
            style="border-color: var(--border-primary); background-color: var(--bg-accent);">
            <div class="p-3">
                <div class="text-sm font-medium mb-1 status-info">Suggestions:</div>
                <ul class="space-y-1">
                    <li v-for="(suggestion, index) in validationSuggestions" :key="index"
                        class="text-sm flex items-start gap-2 status-info">
                        <svg class="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clip-rule="evenodd" />
                        </svg>
                        <span>{{ suggestion }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useJsonStore } from '@/stores/json'
import * as monaco from 'monaco-editor'
import loader from '@monaco-editor/loader'

// Store integration
const jsonStore = useJsonStore()
const {
    rawJsonInput,
    validationErrors,
    validationWarnings,
    validationSuggestions,
    isValidating,
    isProcessing,
    processingMessage,
    processingProgress,
    hasValidJson,
    validationStatus,
    statusMessage,
    statusColor,
    uiPreferences
} = storeToRefs(jsonStore)

// Component refs
const editorContainer = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let monacoInstance: typeof monaco | null = null

// Editor state
const isEditorReady = ref(false)
const editorValue = ref('')

// Computed properties
const hasErrorsComputed = computed(() => validationErrors.value.length > 0)
const hasWarningsComputed = computed(() => validationWarnings.value.length > 0)

// Initialize Monaco Editor
const initializeEditor = async () => {
    if (!editorContainer.value) return

    try {
        // Configure Monaco environment to disable workers
        if (typeof window !== 'undefined') {
            (window as any).MonacoEnvironment = {
                getWorker: () => {
                    return {
                        postMessage: () => { },
                        terminate: () => { },
                        addEventListener: () => { },
                        removeEventListener: () => { }
                    }
                }
            }
        }

        // First try to use the direct Monaco import
        if (monaco && monaco.editor && typeof monaco.editor.create === 'function') {
            monacoInstance = monaco
        } else {
            // Fallback to loader
            loader.config({
                paths: {
                    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.53.0/min/vs'
                }
            })

            // Load Monaco
            monacoInstance = await loader.init()
        }

        // Validate that Monaco loaded correctly
        if (!monacoInstance || !monacoInstance.editor || typeof monacoInstance.editor.create !== 'function') {
            throw new Error('Monaco Editor failed to load properly')
        }

        // Configure JSON language (with null check)
        if (monacoInstance.languages?.json?.jsonDefaults) {
            monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: false, // Disable validation to avoid worker issues
                allowComments: false,
                schemas: [],
                enableSchemaRequest: false
            })
        }

        // Create editor
        editor = monacoInstance.editor.create(editorContainer.value, {
            value: rawJsonInput.value,
            language: 'json',
            theme: getEditorTheme(),
            fontSize: getEditorFontSize(),
            lineNumbers: uiPreferences.value.showLineNumbers ? 'on' : 'off',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            formatOnPaste: uiPreferences.value.autoFormat,
            formatOnType: uiPreferences.value.autoFormat,
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: false,
            folding: true,
            foldingHighlight: true,
            showFoldingControls: 'always',
            bracketPairColorization: {
                enabled: true
            },
            guides: {
                bracketPairs: true,
                indentation: true
            }
        })

        // Validate that editor was created successfully
        if (!editor) {
            throw new Error('Failed to create Monaco Editor instance')
        }

        // Set up event listeners
        setupEditorEventListeners()

        // Update editor decorations based on validation errors
        updateErrorDecorations()

        isEditorReady.value = true
    } catch (error) {
        console.error('Failed to initialize Monaco Editor:', error)
        // Create a fallback textarea if Monaco fails
        createFallbackEditor()
    }
}

// Create a fallback textarea editor if Monaco fails to load
const createFallbackEditor = () => {
    if (!editorContainer.value) return

    // Clear the container
    editorContainer.value.innerHTML = ''

    // Create a textarea as fallback
    const textarea = document.createElement('textarea')
    textarea.value = rawJsonInput.value
    textarea.className = 'w-full h-full p-4 font-mono text-sm border-none outline-none resize-none bg-white'
    textarea.placeholder = 'Enter your JSON here...'

    // Add event listeners
    textarea.addEventListener('input', (e) => {
        const target = e.target as HTMLTextAreaElement
        editorValue.value = target.value
        debounceUpdateStore(target.value)
    })

    // Add to container
    editorContainer.value.appendChild(textarea)

    // Create a mock editor object for compatibility
    editor = {
        getValue: () => textarea.value,
        setValue: (value: string) => { textarea.value = value },
        focus: () => textarea.focus(),
        dispose: () => textarea.remove(),
        onDidChangeModelContent: () => ({ dispose: () => { } }),
        onDidChangeCursorPosition: () => ({ dispose: () => { } }),
        deltaDecorations: () => [],
        updateOptions: () => { },
        getAction: () => ({ run: () => { } })
    } as unknown

    isEditorReady.value = true
}

// Set up editor event listeners
const setupEditorEventListeners = () => {
    if (!editor) return

    // Listen for content changes
    editor.onDidChangeModelContent(() => {
        if (editor) {
            const value = editor.getValue()
            editorValue.value = value

            // Debounced update to store
            debounceUpdateStore(value)
        }
    })

    // Listen for cursor position changes to show context
    editor.onDidChangeCursorPosition(() => {
        // Could be used for showing context information
    })
}

// Debounced store update
let updateTimeout: number | null = null
const debounceUpdateStore = (value: string) => {
    if (updateTimeout) {
        clearTimeout(updateTimeout)
    }

    updateTimeout = setTimeout(() => {
        jsonStore.updateJsonInput(value)
    }, 300) // 300ms debounce
}

// Update error decorations in editor
const updateErrorDecorations = () => {
    if (!editor || !monacoInstance) return

    const decorations: monaco.editor.IModelDeltaDecoration[] = []

    // Add error decorations
    validationErrors.value.forEach((error) => {
        if (monacoInstance) {
            decorations.push({
                range: new monacoInstance.Range(error.line, error.column, error.line, error.column + 1),
                options: {
                    isWholeLine: false,
                    className: 'error-decoration',
                    glyphMarginClassName: 'error-glyph',
                    hoverMessage: { value: error.message },
                    minimap: {
                        color: '#ff0000',
                        position: monacoInstance.editor.MinimapPosition.Inline
                    }
                }
            })
        }
    })

    // Add warning decorations
    validationWarnings.value.forEach((warning) => {
        if (monacoInstance) {
            decorations.push({
                range: new monacoInstance.Range(warning.line, warning.column, warning.line, warning.column + 1),
                options: {
                    isWholeLine: false,
                    className: 'warning-decoration',
                    glyphMarginClassName: 'warning-glyph',
                    hoverMessage: { value: warning.message },
                    minimap: {
                        color: '#ffaa00',
                        position: monacoInstance.editor.MinimapPosition.Inline
                    }
                }
            })
        }
    })

    if (decorations.length > 0) {
        editor.deltaDecorations([], decorations)
    }
}

// Get editor theme based on preferences
const getEditorTheme = (): string => {
    switch (uiPreferences.value.theme) {
        case 'dark':
            return 'vs-dark'
        case 'light':
            return 'vs'
        default:
            // Auto theme - could detect system preference
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs'
    }
}

// Get editor font size based on preferences
const getEditorFontSize = (): number => {
    switch (uiPreferences.value.fontSize) {
        case 'small':
            return 12
        case 'large':
            return 16
        default:
            return 14
    }
}

// Clear input
const clearInput = () => {
    if (editor) {
        editor.setValue('')
    }
    jsonStore.clearAllData()
}

// Format JSON
const formatJson = () => {
    if (editor && hasValidJson.value) {
        editor.getAction('editor.action.formatDocument')?.run()
    }
}

// Watch for external changes to rawJsonInput
watch(rawJsonInput, (newValue) => {
    if (editor && newValue !== editorValue.value) {
        try {
            editor.setValue(newValue)
            editorValue.value = newValue
        } catch (error) {
            console.warn('Failed to update editor value:', error)
        }
    }
})

// Watch for validation errors to update decorations
watch([validationErrors, validationWarnings], () => {
    updateErrorDecorations()
}, { deep: true })

// Watch for UI preference changes
watch(() => uiPreferences.value.theme, () => {
    if (editor && monacoInstance) {
        monacoInstance.editor.setTheme(getEditorTheme())
    }
})

watch(() => uiPreferences.value.fontSize, () => {
    if (editor) {
        editor.updateOptions({ fontSize: getEditorFontSize() })
    }
})

watch(() => uiPreferences.value.showLineNumbers, (showLineNumbers) => {
    if (editor) {
        editor.updateOptions({ lineNumbers: showLineNumbers ? 'on' : 'off' })
    }
})

// Lifecycle hooks
onMounted(() => {
    initializeEditor()
})

onUnmounted(() => {
    if (updateTimeout) {
        clearTimeout(updateTimeout)
    }
    if (editor) {
        editor.dispose()
    }
})

// Expose methods for parent components
defineExpose({
    formatJson,
    clearInput,
    focusEditor: () => editor?.focus()
})
</script>

<style scoped>
/* Custom styles for Monaco Editor decorations */
:deep(.error-decoration) {
    background-color: rgba(255, 0, 0, 0.1);
    border-bottom: 2px wavy #ff0000;
}

:deep(.warning-decoration) {
    background-color: rgba(255, 170, 0, 0.1);
    border-bottom: 2px wavy #ffaa00;
}

:deep(.error-glyph) {
    background-color: #ff0000;
    width: 4px !important;
    margin-left: 2px;
}

:deep(.warning-glyph) {
    background-color: #ffaa00;
    width: 4px !important;
    margin-left: 2px;
}

/* Ensure the editor container takes full height */
.json-input-panel {
    min-height: 0;
    /* Allow flex child to shrink */
}
</style>
