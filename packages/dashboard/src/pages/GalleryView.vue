<template>
  <div class="flex h-full gap-0">
    <div class="flex flex-1 flex-col overflow-hidden">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gallery</h1>

        <!-- Bucket picker -->
        <select
          v-model="selectedBucket"
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
        >
          <option v-for="b in mainStore.buckets" :key="b.name" :value="b.name">
            {{ b.name }}
          </option>
        </select>
      </div>

      <!-- Filters -->
      <div class="mb-4">
        <GalleryFilters
          :filters="filters"
          :count="filteredFiles.length"
          @update="onFilterUpdate"
        />
      </div>

      <!-- Grid -->
      <div class="flex-1 overflow-auto">
        <GalleryGrid
          :files="filteredFiles"
          :bucket="selectedBucket"
          :loading="loading"
          @select="selectedFile = $event"
          @open="openPreview"
          @download="downloadFile"
          @contextmenu="openContextMenu"
        />
      </div>
    </div>

    <!-- Side panel (mirrors file browser pattern) -->
    <FileDetailsPanel
      v-if="selectedFile"
      :file="selectedFile"
      :bucket="selectedBucket"
      @close="selectedFile = null"
    />

    <FileContextMenu ref="contextMenu" @action="handleContextAction" />
    <file-options ref="options" :bucket="selectedBucket" />
    <file-preview ref="preview" :bucket="selectedBucket" />
    <PresignUrlModal ref="presignModal" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'
import { useMainStore } from 'stores/main-store'
import { useToastStore } from 'stores/toast-store'
import { apiHandler } from 'src/lib/apiHandler'
import { api } from 'src/lib/api'
import { encode } from 'src/lib/encoding'
import { useTagsStore } from 'stores/tags-store'
import GalleryGrid from 'components/gallery/GalleryGrid.vue'
import GalleryFilters, { type GalleryFilterState } from 'components/gallery/GalleryFilters.vue'
import FileContextMenu from 'components/browser/FileContextMenu.vue'
import FileDetailsPanel from 'components/browser/FileDetailsPanel.vue'
import FileOptions from 'components/files/FileOptions.vue'
import FilePreview from 'components/preview/FilePreview.vue'
import PresignUrlModal from 'components/browser/PresignUrlModal.vue'

const mainStore = useMainStore()
const toast = useToastStore()
const tagsStore = useTagsStore()

const loading = ref(false)
const allFiles = ref<Record<string, any>[]>([])
const selectedFile = ref<Record<string, any> | null>(null)
const selectedBucket = ref(mainStore.buckets[0]?.name || '')
const contextMenu = ref<InstanceType<typeof FileContextMenu> | null>(null)
const options = ref<InstanceType<typeof FileOptions> | null>(null)
const preview = ref<InstanceType<typeof FilePreview> | null>(null)
const presignModal = ref<InstanceType<typeof PresignUrlModal> | null>(null)

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg', 'bmp']
const VIDEO_EXTS = ['mp4', 'ogg', 'webm', 'mov']
const DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md']

const filters = ref<GalleryFilterState>({
  type: 'all',
  sort: 'newest',
  tag: '',
})
const fileTags = ref<Record<string, string[]>>({})

function getExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function matchesType(file: Record<string, any>): boolean {
  if (file.type === 'folder') return false
  const ext = getExt(file.name)
  switch (filters.value.type) {
    case 'image': return IMAGE_EXTS.includes(ext)
    case 'video': return VIDEO_EXTS.includes(ext)
    case 'document': return DOC_EXTS.includes(ext)
    default: return true
  }
}

const filteredFiles = computed(() => {
  let filtered = allFiles.value.filter(matchesType)

  if (filters.value.tag) {
    const tag = filters.value.tag.toLowerCase()
    filtered = filtered.filter((f) => fileTags.value[f.key]?.some((t) => t.toLowerCase() === tag))
  }

  filtered.sort((a, b) => {
    switch (filters.value.sort) {
      case 'newest': return b.timestamp - a.timestamp
      case 'oldest': return a.timestamp - b.timestamp
      case 'largest': return b.sizeRaw - a.sizeRaw
      case 'smallest': return a.sizeRaw - b.sizeRaw
      case 'name': return a.name.localeCompare(b.name)
      default: return 0
    }
  })

  return filtered
})

function onFilterUpdate(key: string, value: string) {
  ;(filters.value as any)[key] = value
}

async function fetchAllFiles() {
  if (!selectedBucket.value) return
  loading.value = true
  allFiles.value = await apiHandler.fetchFile(selectedBucket.value, '', '')
  loading.value = false
  // Load tags for files in background
  tagsStore.fetchTags()
  loadFileTags()
}

async function loadFileTags() {
  const bucket = selectedBucket.value
  const files = allFiles.value.slice(0, 100).filter((f) => f.type !== 'folder')
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const tags = await tagsStore.getTagsForFile(bucket, file.key)
      return { key: file.key, tags: tags.map((t) => t.name) }
    })
  )
  for (const r of results) {
    if (r.status === 'fulfilled') fileTags.value[r.value.key] = r.value.tags
  }
}

function downloadFile(file: Record<string, any>) {
  const a = Object.assign(document.createElement('a'), {
    download: file.name,
    href: `${mainStore.serverUrl}/api/buckets/${selectedBucket.value}/${encode(file.key)}`,
  })
  a.click()
}

function openPreview(file: Record<string, any>) {
  preview.value?.openFile(file, selectedBucket.value)
}

function openContextMenu(event: MouseEvent, file: Record<string, any>) {
  contextMenu.value?.open(event, file)
}

function handleContextAction(action: string) {
  const file = contextMenu.value?.file
  contextMenu.value?.close()
  if (!file) return
  const acts: Record<string, () => void> = {
    open: () => preview.value?.openFile(file, selectedBucket.value),
    download: () => downloadFile(file),
    rename: () => options.value?.renameObject(file),
    metadata: () => options.value?.updateMetadataObject(file),
    delete: () => options.value?.deleteObject(file),
    presignUrl: async () => {
      try {
        const res = await api.post(`/buckets/${selectedBucket.value}/presign/${encodeURIComponent(encode(file.key))}`)
        if (res.data?.url) presignModal.value?.show(res.data.url, res.data.expiresAt)
      } catch { toast.show({ message: 'Failed to generate presigned URL', type: 'error' }) }
    },
    publicUrl: async () => {
      try {
        const res = await api.post(`/buckets/${selectedBucket.value}/public/${encodeURIComponent(encode(file.key))}`)
        if (res.data?.url) presignModal.value?.show(res.data.url, 'Permanent (public)')
        else toast.show({ message: 'Public sharing disabled', type: 'info' })
      } catch { toast.show({ message: 'Failed to toggle public URL', type: 'error' }) }
    },
  }
  acts[action]?.()
}

const instance = getCurrentInstance()

watch(selectedBucket, fetchAllFiles)
onMounted(() => {
  fetchAllFiles()
  const bus = instance?.appContext.config.globalProperties.$bus
  bus?.on('fetchFiles', fetchAllFiles)
})
onBeforeUnmount(() => {
  const bus = instance?.appContext.config.globalProperties.$bus
  bus?.off('fetchFiles', fetchAllFiles)
})
</script>
