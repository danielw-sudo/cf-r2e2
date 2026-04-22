<template>
  <template v-if="visible">
    <div class="fixed inset-0 z-40 bg-black/50" @click="close" />
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-5 shadow-2xl dark:shadow-gray-900/50">
        <div class="mb-1 flex items-center gap-2">
          <span class="material-icons text-blue-500">link</span>
          <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Presigned URL</h3>
        </div>
        <p class="mb-3 text-xs text-gray-400 dark:text-gray-500">
          Expires {{ expiresLabel }}
        </p>

        <div class="flex gap-2">
          <input
            ref="urlInput"
            :value="url"
            readonly
            class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 font-mono select-all"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <button
            class="rounded-lg px-3 py-2 text-sm transition-colors"
            :class="copied
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'"
            @click="copyUrl"
          >
            <span class="material-icons text-sm">{{ copied ? 'check' : 'content_copy' }}</span>
          </button>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="close"
          >Close</button>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const visible = ref(false)
const url = ref('')
const expiresAt = ref('')
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const expiresLabel = computed(() => {
  if (!expiresAt.value) return 'in 24 hours'
  try {
    const d = new Date(expiresAt.value)
    return d.toLocaleString()
  } catch {
    return 'in 24 hours'
  }
})

function show(presignUrl: string, expires?: string) {
  url.value = presignUrl
  expiresAt.value = expires ?? ''
  copied.value = false
  visible.value = true
}

function close() {
  visible.value = false
}

async function copyUrl() {
  await navigator.clipboard.writeText(url.value)
  copied.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 2000)
}

defineExpose({ show })
</script>
