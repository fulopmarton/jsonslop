import { ref } from 'vue'
import { defineStore } from 'pinia'

// Placeholder store - will be implemented in subsequent tasks
export const useJsonStore = defineStore('json', () => {
  const jsonData = ref<unknown>(null)

  return { jsonData }
})
