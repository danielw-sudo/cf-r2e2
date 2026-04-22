<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">Upload</h1>

    <!-- Bucket + folder bar -->
    <div class="mb-4 inline-flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
      <span class="material-icons text-base text-gray-400">folder_open</span>
      <select
        v-model="selectedBucket"
        class="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
      >
        <option v-for="b in mainStore.buckets" :key="b.name" :value="b.name">{{ b.name }}</option>
      </select>
      <span class="text-gray-300 dark:text-gray-600">/</span>
      <input
        v-model="targetFolder"
        type="text"
        placeholder="(root)"
        class="w-40 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm placeholder-gray-400"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-3 items-stretch">
      <!-- Left: drop zone + queue -->
      <div class="flex flex-col gap-4 lg:col-span-2">
        <DropZone class="flex-1" @files="onFilesAdded" />
        <UploadQueue />

        <!-- Upload button -->
        <div v-if="uploadStore.pendingCount > 0" class="flex justify-end">
          <button
            class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            :disabled="uploadStore.processing"
            @click="startUpload"
          >
            {{ uploadStore.processing ? 'Uploading...' : `Upload ${uploadStore.pendingCount} file${uploadStore.pendingCount !== 1 ? 's' : ''}` }}
          </button>
        </div>
      </div>

      <!-- Right: optimization settings -->
      <div>
        <ImageOptPanel
          :options="uploadStore.options"
          @update="(key, val) => uploadStore.updateOptions({ [key]: val })"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue'
import { useMainStore } from 'stores/main-store'
import { useUploadStore } from 'stores/upload-store'
import DropZone from 'components/upload/DropZone.vue'
import UploadQueue from 'components/upload/UploadQueue.vue'
import ImageOptPanel from 'components/upload/ImageOptPanel.vue'

const mainStore = useMainStore()
const uploadStore = useUploadStore()
const instance = getCurrentInstance()

const selectedBucket = ref(mainStore.buckets[0]?.name || '')
const targetFolder = ref('')

function onFilesAdded(files: File[]) {
  if (!selectedBucket.value) return

  const folder = targetFolder.value
    ? (targetFolder.value.endsWith('/') ? targetFolder.value : `${targetFolder.value}/`)
    : ''

  uploadStore.addFiles(files, selectedBucket.value, folder)
}

async function startUpload() {
  await uploadStore.processQueue()

  // Notify file browser to refresh
  const bus = instance?.appContext.config.globalProperties.$bus
  bus?.emit('fetchFiles')
}
</script>
