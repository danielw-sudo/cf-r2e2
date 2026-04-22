<template>
  <!-- View mode -->
  <div v-if="meta && !editing" class="space-y-2">
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">AI Insights</h4>
      <div class="flex gap-1">
        <button class="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Edit" @click="startEdit">
          <span class="material-icons text-sm">edit</span>
        </button>
        <button class="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Re-analyze" @click="$emit('reanalyze')">
          <span class="material-icons text-sm">refresh</span>
        </button>
      </div>
    </div>
    <div class="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/20 p-3 space-y-1.5">
      <p v-if="meta.title" class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ meta.title }}</p>
      <p v-if="meta.description" class="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{{ meta.description }}</p>
      <p v-if="meta.source" class="text-xs">
        <span class="font-medium text-gray-500 dark:text-gray-400">Source:</span>
        <span class="ml-1 text-gray-700 dark:text-gray-300">{{ meta.source }}</span>
      </p>
    </div>

    <!-- Tags -->
    <div v-if="tags.length || tagsLoading" class="space-y-1">
      <div class="flex items-center justify-between">
        <h5 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Tags</h5>
        <button class="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Auto-tag" @click="runAutoTag">
          <span class="material-icons text-sm">{{ tagsLoading ? 'hourglass_empty' : 'auto_awesome' }}</span>
        </button>
      </div>
      <TagPills :tags="tags" removable @remove="removeTag" @click-tag="$emit('click-tag', $event)" />
    </div>

    <!-- File Info -->
    <div v-if="meta.fileInfo" class="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-3 space-y-1">
      <h5 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">File Info</h5>
      <p class="text-xs">
        <span class="font-medium text-gray-500 dark:text-gray-400">Uploaded:</span>
        <span class="ml-1 text-gray-700 dark:text-gray-300">{{ formatDate(meta.fileInfo.uploaded) }}</span>
      </p>
      <p class="text-xs">
        <span class="font-medium text-gray-500 dark:text-gray-400">Size:</span>
        <span class="ml-1 text-gray-700 dark:text-gray-300">{{ formatSize(meta.fileInfo.size) }}</span>
      </p>
      <p class="text-xs">
        <span class="font-medium text-gray-500 dark:text-gray-400">Type:</span>
        <span class="ml-1 text-gray-700 dark:text-gray-300">{{ meta.fileInfo.contentType }}</span>
      </p>
    </div>
  </div>

  <!-- Edit mode -->
  <div v-else-if="editing" class="space-y-2">
    <h4 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Edit AI Metadata</h4>
    <div class="space-y-2">
      <div v-for="field in editableFields" :key="field">
        <label class="mb-0.5 block text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{{ field }}</label>
        <input
          v-model="editFields[field]"
          type="text"
          class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
    <div class="flex gap-2">
      <button
        class="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        @click="cancelEdit"
      >Cancel</button>
      <button
        class="flex-1 rounded-lg bg-blue-600 px-2 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        :disabled="saving"
        @click="saveEdit"
      >{{ saving ? 'Saving...' : 'Save' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useToastStore } from 'stores/toast-store'
import { useTagsStore } from 'stores/tags-store'
import { api } from 'src/lib/api'
import { encode } from 'src/lib/encoding'
import { bytesToSize } from 'src/lib/formatting'
import TagPills from 'components/gallery/TagPills.vue'

const props = defineProps({
  meta: { type: Object, default: null },
  fileKey: { type: String, required: true },
  bucket: { type: String, required: true },
})
const emit = defineEmits(['reanalyze', 'update', 'click-tag'])

const toast = useToastStore()
const tagsStore = useTagsStore()
const editing = ref(false)
const saving = ref(false)
const tags = ref([])
const tagsLoading = ref(false)

onMounted(async () => {
  tags.value = await tagsStore.getTagsForFile(props.bucket, props.fileKey)
})

async function runAutoTag() {
  tagsLoading.value = true
  try {
    const newTags = await tagsStore.autoTag(props.bucket, props.fileKey)
    if (newTags.length) tags.value = await tagsStore.getTagsForFile(props.bucket, props.fileKey)
    toast.show({ message: `Tagged: ${newTags.join(', ') || 'none'}`, type: newTags.length ? 'success' : 'warning' })
  } catch { toast.show({ message: 'Auto-tag failed', type: 'error' }) }
  finally { tagsLoading.value = false }
}

async function removeTag(name) {
  await tagsStore.detachTags(props.bucket, props.fileKey, [name])
  tags.value = tags.value.filter((t) => t.name !== name)
}
const editFields = reactive({})
const editableFields = ['title', 'description', 'source']

function formatDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

function formatSize(bytes) {
  return typeof bytes === 'number' ? bytesToSize(bytes) : '—'
}

function startEdit() {
  Object.keys(editFields).forEach((k) => delete editFields[k])
  for (const f of editableFields) {
    editFields[f] = props.meta?.[f] ?? ''
  }
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveEdit() {
  saving.value = true
  try {
    const sidecar = { ...editFields }
    if (props.meta?.fileInfo) sidecar.fileInfo = props.meta.fileInfo
    const sidecarKey = `${props.fileKey}.meta.json`
    const body = JSON.stringify(sidecar, null, 2)
    await api.put(`/buckets/${props.bucket}/upload`, body, {
      params: {
        key: encode(sidecarKey),
        httpMetadata: encode(JSON.stringify({ contentType: 'application/json' })),
      },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    emit('update', sidecar)
    editing.value = false
    toast.show({ message: 'Metadata saved', type: 'success' })
  } catch {
    toast.show({ message: 'Failed to save metadata', type: 'error' })
  } finally {
    saving.value = false
  }
}
</script>
