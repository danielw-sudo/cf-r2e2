<template>
  <div class="relative">
    <select
      :value="modelValue"
      class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">All tags</option>
      <option v-for="tag in tags" :key="tag.slug" :value="tag.name">
        {{ tag.name }} ({{ tag.usage_count }})
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTagsStore, type Tag } from 'stores/tags-store'
import { storeToRefs } from 'pinia'

defineProps<{
  modelValue: string
}>()
defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const tagsStore = useTagsStore()
const { tags } = storeToRefs(tagsStore)

onMounted(() => {
  if (!tags.value.length) tagsStore.fetchTags()
})
</script>
