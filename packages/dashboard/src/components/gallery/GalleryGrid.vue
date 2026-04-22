<template>
  <div v-if="loading" class="flex items-center justify-center py-16">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-500" />
  </div>

  <div v-else-if="files.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
    <span class="material-icons mb-2 text-4xl">photo_library</span>
    <p class="text-sm">No files found</p>
  </div>

  <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
    <GalleryCard
      v-for="file in files"
      :key="file.key"
      :file="file"
      :bucket="bucket"
      @select="$emit('select', file)"
      @open="$emit('open', file)"
      @download="$emit('download', file)"
      @contextmenu="(evt, f) => $emit('contextmenu', evt, f)"
    />
  </div>
</template>

<script setup lang="ts">
import GalleryCard from './GalleryCard.vue'

defineProps<{
  files: Record<string, any>[]
  bucket: string
  loading: boolean
}>()

defineEmits<{
  (e: 'select', file: Record<string, any>): void
  (e: 'open', file: Record<string, any>): void
  (e: 'download', file: Record<string, any>): void
  (e: 'contextmenu', event: MouseEvent, file: Record<string, any>): void
}>()
</script>
