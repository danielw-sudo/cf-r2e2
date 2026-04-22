<template>
  <div
    class="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all hover:border-blue-300 hover:shadow-md"
    @click="$emit('select', file)"
    @dblclick="$emit('open', file)"
  >
    <!-- Image -->
    <div class="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
      <img
        :src="previewUrl"
        :alt="file.name"
        loading="lazy"
        class="h-full w-full object-cover transition-transform group-hover:scale-105"
        @error="onImgError"
      />
    </div>

    <!-- Info overlay -->
    <div class="px-2 py-1.5">
      <p class="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{{ file.name }}</p>
      <div class="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{{ file.size }}</span>
        <span>{{ file.lastModified }}</span>
      </div>
    </div>

    <!-- Hover/touch actions -->
    <div class="absolute right-1 top-1 flex gap-1 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100">
      <button
        class="rounded bg-white/90 dark:bg-gray-800/90 p-1 text-gray-600 dark:text-gray-400 shadow-sm hover:bg-white dark:hover:bg-gray-700"
        @click.stop="$emit('download', file)"
        title="Download"
      >
        <span class="material-icons text-sm">download</span>
      </button>
      <button
        class="rounded bg-white/90 dark:bg-gray-800/90 p-1 text-gray-600 dark:text-gray-400 shadow-sm hover:bg-white dark:hover:bg-gray-700"
        @click.stop="$emit('contextmenu', $event, file)"
        title="More"
      >
        <span class="material-icons text-sm">more_vert</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMainStore } from 'stores/main-store'
import { encode } from 'src/lib/encoding'

const props = defineProps<{
  file: Record<string, any>
  bucket: string
}>()

defineEmits<{
  (e: 'select', file: Record<string, any>): void
  (e: 'open', file: Record<string, any>): void
  (e: 'download', file: Record<string, any>): void
  (e: 'contextmenu', event: MouseEvent, file: Record<string, any>): void
}>()

const mainStore = useMainStore()

const previewUrl = computed(() => {
  return `${mainStore.serverUrl}/api/buckets/${props.bucket}/${encode(props.file.key)}`
})

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}
</script>
