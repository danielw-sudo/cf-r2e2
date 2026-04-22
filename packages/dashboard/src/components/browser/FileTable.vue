<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-500" />
    </div>

    <!-- Empty state -->
    <div v-else-if="files.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
      <span class="material-icons mb-2 text-4xl">folder_open</span>
      <p class="text-sm">This folder is empty</p>
    </div>

    <!-- Table -->
    <table v-else class="w-full">
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <th class="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" @click="toggleSort('name')">
            Name
            <span v-if="sortBy === 'name'" class="ml-1">{{ sortAsc ? '↑' : '↓' }}</span>
          </th>
          <th class="hidden px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 sm:table-cell" @click="toggleSort('lastModified')">
            Modified
            <span v-if="sortBy === 'lastModified'" class="ml-1">{{ sortAsc ? '↑' : '↓' }}</span>
          </th>
          <th class="hidden px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 md:table-cell" @click="toggleSort('size')">
            Size
            <span v-if="sortBy === 'size'" class="ml-1">{{ sortAsc ? '↑' : '↓' }}</span>
          </th>
          <th class="w-10 px-2 py-3" />
        </tr>
      </thead>
      <tbody>
        <FileRow
          v-for="file in sortedFiles"
          :key="file.key || file.name"
          :file="file"
          @open="$emit('open', file)"
          @select="$emit('select', file)"
          @contextmenu="(evt, f) => $emit('contextmenu', evt, f)"
        />
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FileRow from './FileRow.vue'

const props = defineProps({
  files: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})
defineEmits(['open', 'select', 'contextmenu'])

const sortBy = ref('name')
const sortAsc = ref(true)

function toggleSort(field) {
  if (sortBy.value === field) {
    sortAsc.value = !sortAsc.value
  } else {
    sortBy.value = field
    sortAsc.value = true
  }
}

const sortedFiles = computed(() => {
  const items = [...props.files]
  const dir = sortAsc.value ? 1 : -1

  items.sort((a, b) => {
    // Folders always first
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1

    if (sortBy.value === 'name') return dir * a.name.localeCompare(b.name)
    if (sortBy.value === 'lastModified') return dir * (a.timestamp - b.timestamp)
    if (sortBy.value === 'size') return dir * (a.sizeRaw - b.sizeRaw)
    return 0
  })

  return items
})
</script>
