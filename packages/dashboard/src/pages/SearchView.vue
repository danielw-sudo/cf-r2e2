<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="mb-4">
      <h1 class="mb-3 text-2xl font-semibold text-gray-900 dark:text-gray-100">Search</h1>
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="selectedTag"
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
        >
          <option value="">All tags</option>
          <option v-for="t in tagsStore.tags" :key="t.slug" :value="t.slug">{{ t.name }}</option>
        </select>
        <select
          v-model="selectedBucket"
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
        >
          <option value="">All buckets</option>
          <option v-for="b in mainStore.buckets" :key="b.name" :value="b.name">{{ b.name }}</option>
        </select>
        <select
          v-model="sortBy"
          class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>
    </div>

    <!-- Search input -->
    <div class="relative mb-4">
      <span class="material-icons absolute left-3 top-2.5 text-gray-400 text-xl">search</span>
      <input
        ref="searchInput"
        v-model="query"
        type="text"
        placeholder="Search by title, description, or tag..."
        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
      />
      <button v-if="query" class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="query = ''">
        <span class="material-icons text-xl">close</span>
      </button>
    </div>

    <!-- Results area -->
    <div class="flex-1 overflow-auto">
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
      </div>

      <div v-else-if="!hasSearched" class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <span class="material-icons text-6xl mb-3">manage_search</span>
        <p class="text-sm">Search across all indexed media by title, description, or tag</p>
      </div>

      <div v-else-if="results.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <span class="material-icons text-6xl mb-3">search_off</span>
        <p class="text-sm">No results{{ query ? ` for "${query}"` : '' }}</p>
      </div>

      <div v-else>
        <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">{{ results.length }} result{{ results.length !== 1 ? 's' : '' }}</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div
            v-for="item in results"
            :key="`${item.bucket}/${item.key}`"
            class="group cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden transition hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600"
            @click="openPreview(item)"
          >
            <!-- Image preview -->
            <div v-if="isImage(item.contentType)" class="aspect-video w-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <img
                :src="thumbUrl(item)"
                :alt="item.title || fileName(item.key)"
                loading="lazy"
                class="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div class="p-3">
              <div class="flex items-start gap-2">
                <span v-if="!isImage(item.contentType)" :class="['material-icons text-xl shrink-0', getFileIconColor(item.key)]">{{ getFileIcon(item.key) }}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ item.title || fileName(item.key) }}</p>
                  <p v-if="item.description" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{{ item.description }}</p>
                </div>
              </div>
              <div class="mt-2 flex items-center gap-2">
                <span class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">{{ item.bucket }}</span>
                <span class="text-xs text-gray-400 truncate">{{ fileName(item.key) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <file-preview ref="preview" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from 'stores/main-store'
import { useTagsStore } from 'stores/tags-store'
import { apiHandler } from 'src/lib/apiHandler'
import { encode } from 'src/lib/encoding'
import { getFileIcon, getFileIconColor } from 'src/lib/fileIcons'
import FilePreview from 'components/preview/FilePreview.vue'

interface SearchResult {
  bucket: string; key: string; title?: string; description?: string; contentType?: string; size?: number
}

const mainStore = useMainStore()
const tagsStore = useTagsStore()

const searchInput = ref<HTMLInputElement | null>(null)
const preview = ref<InstanceType<typeof FilePreview> | null>(null)
const route = useRoute()
const query = ref('')
const selectedBucket = ref('')
const selectedTag = ref((route.query.tag as string) || '')
const sortBy = ref('relevance')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const hasSearched = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function fileName(key: string): string { return key.split('/').pop() || key }
function isImage(ct?: string): boolean { return !!ct && ct.startsWith('image/') }
function thumbUrl(item: SearchResult): string {
  return `${mainStore.serverUrl}/api/buckets/${item.bucket}/${encodeURIComponent(encode(item.key))}`
}

async function doSearch() {
  const q = query.value.trim()
  if (!q && !selectedTag.value) { results.value = []; hasSearched.value = false; return }

  loading.value = true
  try {
    const data = await apiHandler.search(q, {
      bucket: selectedBucket.value || undefined,
      tag: selectedTag.value || undefined,
      sort: sortBy.value,
    })
    results.value = data.results
    hasSearched.value = true
  } catch { results.value = [] }
  finally { loading.value = false }
}

function openPreview(item: SearchResult) {
  const name = fileName(item.key)
  preview.value?.openFile({ name, nameHash: encode(name), key: item.key, size: item.size || 0 }, item.bucket)
}

watch([query, selectedBucket, selectedTag, sortBy], () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doSearch, 300)
})

onMounted(() => {
  searchInput.value?.focus()
  tagsStore.fetchTags()
  if (selectedTag.value) doSearch()
})
</script>
