<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">Tags</h1>

    <!-- Search + stats bar -->
    <div class="mb-4 flex items-center gap-3">
      <div class="relative flex-1">
        <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
        <input
          v-model="filter"
          type="text"
          placeholder="Filter tags…"
          class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                 py-2 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100
                 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <span class="text-xs text-gray-400 shrink-0">
        {{ filter ? `${filtered.length} / ${tags.length}` : `${tags.length}` }} tags
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
    </div>

    <!-- Empty state -->
    <div v-else-if="tags.length === 0" class="py-16 text-center text-sm text-gray-400">
      No tags yet. Tags are created when AI analyzes images.
    </div>

    <!-- Tag chip grid (desktop) / list (mobile) -->
    <div v-else class="flex flex-wrap gap-2">
      <div
        v-for="tag in filtered"
        :key="tag.id"
        class="group relative flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700
               bg-white dark:bg-gray-800 px-3 py-1.5 text-sm transition-colors hover:border-blue-300 dark:hover:border-blue-600"
      >
        <!-- Tag name (clickable → search) -->
        <router-link
          :to="`/search?tag=${tag.slug}`"
          class="text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400"
        >{{ tag.name }}</router-link>

        <!-- Count badge -->
        <span class="rounded-full bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">{{ tag.usage_count }}</span>

        <!-- Hover actions -->
        <div class="hidden group-hover:flex items-center gap-0.5 ml-1">
          <button title="Rename" class="rounded p-0.5 text-gray-400 hover:text-blue-500" @click.prevent="startRename(tag)">
            <span class="material-icons text-sm">edit</span>
          </button>
          <button title="Merge" class="rounded p-0.5 text-gray-400 hover:text-blue-500" @click.prevent="startMerge(tag)">
            <span class="material-icons text-sm">merge</span>
          </button>
          <button title="Delete" class="rounded p-0.5 text-gray-400 hover:text-red-500" @click.prevent="startDelete(tag)">
            <span class="material-icons text-sm">close</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Inline rename bar -->
    <div v-if="renaming" class="mt-4 flex items-center gap-2 rounded-lg border border-blue-400 dark:border-blue-600 bg-white dark:bg-gray-800 px-4 py-2">
      <span class="text-xs text-gray-500 dark:text-gray-400">Rename "{{ renaming }}":</span>
      <input
        ref="renameInput"
        v-model="renameName"
        class="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
        @keydown.enter="doRename(renaming)"
        @keydown.escape="renaming = ''"
      />
      <button class="text-xs text-blue-500 hover:text-blue-400" @click="doRename(renaming)">Save</button>
      <button class="text-xs text-gray-400 hover:text-gray-300" @click="renaming = ''">Cancel</button>
    </div>

    <!-- Sort controls -->
    <div v-if="tags.length" class="mt-4 flex items-center gap-2 text-xs text-gray-400">
      <span>Sort:</span>
      <button :class="sortBy === 'count' ? 'text-blue-500' : ''" @click="toggleSort('count')">
        Usage <span v-if="sortBy === 'count'" class="material-icons align-middle text-xs">{{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
      </button>
      <button :class="sortBy === 'name' ? 'text-blue-500' : ''" @click="toggleSort('name')">
        Name <span v-if="sortBy === 'name'" class="material-icons align-middle text-xs">{{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span>
      </button>
    </div>

    <!-- Merge modal -->
    <MergeDialog v-if="merging" :source="merging" :tags="tags" @cancel="merging = null" @confirm="doMerge" />
    <!-- Delete confirm -->
    <ConfirmDialog
      v-if="deleting"
      :title="`Delete &quot;${deleting.name}&quot;?`"
      message="This removes the tag from all files. This cannot be undone."
      confirm-label="Delete"
      :destructive="true"
      @cancel="deleting = null"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useTagsStore, type Tag } from 'stores/tags-store'
import { useToastStore } from 'stores/toast-store'
import MergeDialog from 'components/tags/MergeDialog.vue'
import ConfirmDialog from 'components/shell/ConfirmDialog.vue'

const tagsStore = useTagsStore()
const toast = useToastStore()
const { tags, loading } = storeToRefs(tagsStore)

const filter = ref('')
const sortBy = ref<'name' | 'count'>('count')
const sortDir = ref<'asc' | 'desc'>('desc')
const renaming = ref('')
const renameName = ref('')
const merging = ref<Tag | null>(null)
const deleting = ref<Tag | null>(null)
const renameInput = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  let list = [...tags.value]
  if (filter.value) {
    const q = filter.value.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(q))
  }
  list.sort((a, b) => {
    const dir = sortDir.value === 'asc' ? 1 : -1
    if (sortBy.value === 'name') return dir * a.name.localeCompare(b.name)
    return dir * (a.usage_count - b.usage_count)
  })
  return list
})

function toggleSort(col: 'name' | 'count') {
  if (sortBy.value === col) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortBy.value = col; sortDir.value = col === 'count' ? 'desc' : 'asc' }
}

function startRename(tag: Tag) {
  renaming.value = tag.slug
  renameName.value = tag.name
  nextTick(() => renameInput.value?.focus())
}

async function doRename(slug: string) {
  if (!renameName.value.trim()) return
  const ok = await tagsStore.renameTag(slug, renameName.value)
  if (ok) toast.show({ message: 'Tag renamed', type: 'success' })
  else toast.show({ message: 'Rename failed (slug conflict?)', type: 'error' })
  renaming.value = ''
}

function startMerge(tag: Tag) { merging.value = tag }
function startDelete(tag: Tag) { deleting.value = tag }

async function doMerge(targetSlug: string) {
  if (!merging.value) return
  const ok = await tagsStore.mergeTagSlugs(merging.value.slug, targetSlug)
  if (ok) toast.show({ message: 'Tags merged', type: 'success' })
  else toast.show({ message: 'Merge failed', type: 'error' })
  merging.value = null
}

async function doDelete() {
  if (!deleting.value) return
  const ok = await tagsStore.deleteTagBySlug(deleting.value.slug)
  if (ok) toast.show({ message: 'Tag deleted', type: 'success' })
  else toast.show({ message: 'Delete failed', type: 'error' })
  deleting.value = null
}

onMounted(() => tagsStore.fetchTags())
</script>
