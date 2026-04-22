<template>
  <div v-if="loading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-500" />
  </div>

  <div v-else-if="files.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
    <span class="material-icons mb-2 text-4xl">folder_open</span>
    <p class="text-sm">This folder is empty</p>
  </div>

  <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
    <div
      v-for="file in files"
      :key="file.key || file.name"
      class="group relative flex cursor-pointer flex-col items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 transition-all hover:border-blue-300 hover:shadow-sm"
      @dblclick="$emit('open', file)"
      @click="$emit('select', file)"
      @contextmenu.prevent="$emit('contextmenu', $event, file)"
    >
      <!-- Icon / thumbnail -->
      <div class="mb-2 flex h-16 w-16 items-center justify-center">
        <img
          v-if="isImage(file)"
          :src="getPreviewUrl(file)"
          :alt="file.name"
          loading="lazy"
          class="h-16 w-16 rounded object-cover"
        />
        <span
          v-else
          class="material-icons text-4xl"
          :class="file.type === 'folder' ? 'text-amber-500' : getFileIconColor(file.name)"
        >
          {{ file.icon }}
        </span>
      </div>

      <!-- Name -->
      <span class="w-full truncate text-center text-xs text-gray-700 dark:text-gray-300">{{ file.name }}</span>

      <!-- Options -->
      <button
        class="absolute right-1 top-1 rounded p-0.5 text-gray-400 dark:text-gray-500 opacity-0 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-600 group-hover:opacity-100"
        @click.stop="$emit('contextmenu', $event, file)"
      >
        <span class="material-icons text-base">more_vert</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useMainStore } from 'stores/main-store'
import { encode } from 'src/lib/encoding'
import { getFileIconColor } from 'src/lib/fileIcons'

const props = defineProps({
  files: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  bucket: { type: String, default: '' },
})
defineEmits(['open', 'select', 'contextmenu'])

const route = useRoute()
const mainStore = useMainStore()

const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg']

function isImage(file) {
  if (file.type === 'folder') return false
  const ext = file.name.split('.').pop()?.toLowerCase()
  return imageExts.includes(ext)
}

function getPreviewUrl(file) {
  const bucket = props.bucket || route.params.bucket || mainStore.buckets[0]?.name
  if (!bucket) return ''
  return `${mainStore.serverUrl}/api/buckets/${bucket}/${encode(file.key)}`
}
</script>
