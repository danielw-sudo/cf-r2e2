<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Shared assets</h1>
      <div class="flex items-center gap-3">
        <input
          v-model="query"
          type="search"
          placeholder="Filter by bucket, key, title…"
          class="w-64 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
        />
        <span class="text-sm text-gray-500 dark:text-gray-400">{{ filtered.length }} shared</span>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="p-8 text-center text-gray-500 dark:text-gray-400">Loading…</div>
      <div v-else-if="filtered.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
        {{ items.length === 0 ? 'Nothing is publicly shared yet.' : 'No matches.' }}
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="item in filtered"
          :key="`${item.bucket}/${item.key}`"
          class="group flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg transition-shadow"
        >
          <div class="aspect-square w-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
            <img
              v-if="isImage(item)"
              :src="item.url"
              :alt="item.title || item.key"
              loading="lazy"
              class="h-full w-full object-cover"
            />
            <span v-else class="material-icons text-6xl text-gray-400">
              {{ isVideo(item) ? 'movie' : 'insert_drive_file' }}
            </span>
          </div>
          <div class="flex-1 p-3 flex flex-col gap-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" :title="item.title || item.key">
              {{ item.title || basename(item.key) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 truncate" :title="`${item.bucket}/${item.key}`">
              {{ item.bucket }} · {{ item.key }}
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500">
              {{ formatDate(item.uploadedAt) }}
            </div>
          </div>
          <div class="flex border-t border-gray-200 dark:border-gray-700 divide-x divide-gray-200 dark:divide-gray-700">
            <button
              class="flex-1 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-1"
              @click="copyUrl(item)"
            >
              <span class="material-icons text-sm">content_copy</span>
              Copy URL
            </button>
            <button
              class="flex-1 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-1"
              :disabled="revoking[`${item.bucket}/${item.key}`]"
              @click="revoke(item)"
            >
              <span class="material-icons text-sm">link_off</span>
              Revoke
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from 'src/lib/api'
import { encode } from 'src/lib/encoding'
import { useToastStore } from 'stores/toast-store'

interface SharedItem {
  bucket: string
  key: string
  title: string | null
  description: string | null
  contentType: string | null
  size: number | null
  uploadedAt: string | null
  url: string
}

const toast = useToastStore()
const loading = ref(false)
const items = ref<SharedItem[]>([])
const query = ref('')
const revoking = ref<Record<string, boolean>>({})

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg', 'bmp']
const VIDEO_EXTS = ['mp4', 'ogg', 'webm', 'mov']

function getExt(key: string): string {
  return key.split('.').pop()?.toLowerCase() ?? ''
}
function isImage(item: SharedItem): boolean {
  return IMAGE_EXTS.includes(getExt(item.key)) || (item.contentType?.startsWith('image/') ?? false)
}
function isVideo(item: SharedItem): boolean {
  return VIDEO_EXTS.includes(getExt(item.key)) || (item.contentType?.startsWith('video/') ?? false)
}
function basename(key: string): string {
  return key.split('/').pop() || key
}
function formatDate(d: string | null): string {
  if (!d) return ''
  try { return new Date(d).toLocaleString() } catch { return d }
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((i) =>
    i.bucket.toLowerCase().includes(q) ||
    i.key.toLowerCase().includes(q) ||
    (i.title ?? '').toLowerCase().includes(q),
  )
})

async function load() {
  loading.value = true
  try {
    const res = await api.get<{ items: SharedItem[] }>('/shared')
    items.value = res.data.items ?? []
  } catch {
    toast.show({ message: 'Failed to load shared assets', type: 'error' })
  } finally {
    loading.value = false
  }
}

async function copyUrl(item: SharedItem) {
  try {
    await navigator.clipboard.writeText(item.url)
    toast.show({ message: 'URL copied', type: 'success' })
  } catch {
    toast.show({ message: 'Copy failed', type: 'error' })
  }
}

async function revoke(item: SharedItem) {
  const id = `${item.bucket}/${item.key}`
  if (!window.confirm(`Revoke public sharing for ${item.key}?`)) return
  revoking.value[id] = true
  try {
    await api.post(`/buckets/${item.bucket}/public/${encodeURIComponent(encode(item.key))}`)
    items.value = items.value.filter((i) => !(i.bucket === item.bucket && i.key === item.key))
    toast.show({ message: 'Sharing revoked', type: 'success' })
  } catch {
    toast.show({ message: 'Revoke failed', type: 'error' })
  } finally {
    revoking.value[id] = false
  }
}

onMounted(load)
</script>
