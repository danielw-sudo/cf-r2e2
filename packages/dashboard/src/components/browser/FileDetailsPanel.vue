<template>
  <div
    v-if="file"
    class="flex w-72 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
  >
    <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ file.name }}</h3>
      <button class="rounded p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" @click="$emit('close')">
        <span class="material-icons text-lg">close</span>
      </button>
    </div>

    <div class="flex-1 overflow-auto p-4 space-y-4">
      <!-- Preview -->
      <div v-if="isImage" class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <img :src="previewUrl" :alt="file.name" loading="lazy" class="w-full object-contain" />
      </div>

      <!-- AI Metadata (view/edit) -->
      <AiMetaSection
        v-if="aiMeta"
        :meta="aiMeta"
        :file-key="file.key"
        :bucket="activeBucket"
        @reanalyze="analyzeImage"
        @update="aiMeta = $event"
      />

      <!-- Analyze / Loading / Error -->
      <template v-else-if="isImage">
        <button
          v-if="!aiLoading && !aiError"
          class="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="analyzeImage"
        >
          <span class="material-icons text-base">auto_awesome</span>
          Analyze with AI
        </button>
        <div v-else-if="aiLoading" class="flex items-center justify-center gap-2 py-2 text-sm text-gray-500 dark:text-gray-400">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-500" />
          Analyzing...
        </div>
        <button
          v-else-if="aiError"
          class="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
          @click="analyzeImage"
        >
          <span class="material-icons text-base">refresh</span>
          Analysis failed — Retry
        </button>
      </template>

      <!-- File Info -->
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Format</span>
          <span class="text-gray-900 dark:text-gray-100">{{ fileFormat }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Size</span>
          <span class="text-gray-900 dark:text-gray-100">{{ file.size }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Modified</span>
          <span class="text-gray-900 dark:text-gray-100">{{ file.lastModified }}</span>
        </div>
      </div>

      <!-- Custom Metadata -->
      <div v-if="hasCustomMeta" class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Metadata</h4>
        <div class="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-3 space-y-1.5">
          <p v-for="(val, key) in file.customMetadata" :key="key" class="text-xs">
            <span class="font-medium text-gray-500 dark:text-gray-400 capitalize">{{ key }}:</span>
            <span class="ml-1 text-gray-900 dark:text-gray-100">{{ val }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from 'stores/main-store'
import { useToastStore } from 'stores/toast-store'
import { api } from 'src/lib/api'
import { encode } from 'src/lib/encoding'
import AiMetaSection from './AiMetaSection.vue'

const props = defineProps({
  file: { type: Object, default: null },
  bucket: { type: String, default: null },
})
defineEmits(['close'])

const route = useRoute()
const mainStore = useMainStore()
const toast = useToastStore()

const aiMeta = ref(null)
const aiLoading = ref(false)
const aiError = ref(false)
let sidecarAbort = null

const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg']

const activeBucket = computed(() => props.bucket || route.params.bucket || mainStore.buckets[0]?.name)

const isImage = computed(() => {
  if (!props.file || props.file.type === 'folder') return false
  const ext = props.file.name.split('.').pop()?.toLowerCase()
  return imageExts.includes(ext)
})

const hasCustomMeta = computed(() => {
  const m = props.file?.customMetadata
  return m && typeof m === 'object' && Object.keys(m).length > 0
})

const fileFormat = computed(() => {
  if (!props.file) return ''
  const ext = props.file.name.split('.').pop()?.toLowerCase()
  return ext ? ext.toUpperCase() : 'Unknown'
})

const previewUrl = computed(() => {
  if (!props.file) return ''
  return `${mainStore.serverUrl}/api/buckets/${activeBucket.value}/${encode(props.file.key)}`
})

watch(() => props.file, async (f) => {
  if (sidecarAbort) sidecarAbort.abort()
  aiMeta.value = null
  aiError.value = false
  if (!f || f.type === 'folder' || !isImage.value) return

  const controller = new AbortController()
  sidecarAbort = controller
  try {
    const sidecarKey = `${f.key}.meta.json`
    const res = await api.get(`/buckets/${activeBucket.value}/${encode(sidecarKey)}`, { signal: controller.signal })
    if (!controller.signal.aborted && res.data && res.data.title) aiMeta.value = res.data
  } catch {
    // No sidecar yet (or aborted)
  }
}, { immediate: true })

async function analyzeImage() {
  if (!props.file || !activeBucket.value) return
  aiLoading.value = true
  aiError.value = false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const encodedKey = encodeURIComponent(encode(props.file.key))
    const res = await api.post(
      `/buckets/${activeBucket.value}/analyze/${encodedKey}`,
      null,
      { signal: controller.signal }
    )
    if (res.data?.meta) aiMeta.value = res.data.meta
  } catch (err) {
    aiError.value = true
    const detail = err?.response?.data?.detail
    const reason = controller.signal.aborted
      ? 'Timed out after 30s'
      : detail || 'AI analysis failed'
    toast.show({ message: reason, type: 'error', timeout: 6000 })
  } finally {
    clearTimeout(timeout)
    aiLoading.value = false
  }
}
</script>
