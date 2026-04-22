<template>
  <tr
    class="group border-b border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
    @dblclick="$emit('open', file)"
    @click="$emit('select', file)"
    @contextmenu.prevent="$emit('contextmenu', $event, file)"
  >
    <td class="flex items-center gap-2 overflow-hidden px-4 py-3 md:py-2.5">
      <span
        class="material-icons shrink-0 text-lg"
        :class="file.type === 'folder' ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'"
      >
        {{ file.icon }}
      </span>
      <span class="truncate text-sm text-gray-900 dark:text-gray-100">{{ file.name }}</span>
    </td>
    <td class="hidden px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 sm:table-cell">
      {{ file.lastModified }}
    </td>
    <td class="hidden px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 md:table-cell">
      {{ file.size }}
    </td>
    <td class="w-10 px-2 py-2.5 text-right">
      <button
        class="rounded p-1 text-gray-400 dark:text-gray-500 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100"
        @click.stop="$emit('contextmenu', $event, file)"
      >
        <span class="material-icons text-lg">more_vert</span>
      </button>
    </td>
  </tr>
</template>

<script setup>
defineProps({
  file: { type: Object, required: true },
})
defineEmits(['open', 'select', 'contextmenu'])
</script>
