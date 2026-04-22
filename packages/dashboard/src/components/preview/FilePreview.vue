<template>
  <!-- Backdrop -->
  <div v-if="open" class="fixed inset-0 z-40 bg-black/50" @click="close" />

  <!-- Modal -->
  <div
    v-if="open"
    class="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl dark:shadow-gray-900/50"
  >
    <!-- Header -->
    <div class="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-2">
      <span class="truncate text-lg font-medium text-gray-800 dark:text-gray-200">{{ filename }}</span>

      <template v-if="editMode">
        <button class="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600" @click="cancelEdit">
          <span class="material-icons mr-1 align-middle text-sm">close</span> Cancel
        </button>
        <button class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600" @click="saveEdit">
          <span class="material-icons mr-1 align-middle text-sm">save</span> Save
        </button>
      </template>
      <template v-else>
        <button class="rounded bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600" @click="enableEdit">
          <span class="material-icons mr-1 align-middle text-sm">edit</span> Edit
        </button>
      </template>

      <div class="flex-1" />
      <button class="rounded-full p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600" @click="close">
        <span class="material-icons">close</span>
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4">
      <!-- Edit mode -->
      <template v-if="editMode">
        <div class="mb-2 rounded border border-orange-200 bg-orange-50 dark:bg-orange-900/30 px-3 py-2 text-sm text-orange-700 dark:text-orange-400">
          File editing is still in tests!
        </div>
        <textarea
          v-model="fileDataEdited"
          class="h-full w-full resize-none rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 font-mono text-sm"
        />
      </template>

      <!-- Preview content -->
      <PreviewContent
        v-else
        :type="type"
        :file-data="fileData"
        :progress="downloadProgress"
      />
    </div>
  </div>
</template>

<script>
import { useMainStore } from 'stores/main-store'
import { useToastStore } from 'stores/toast-store'
import { ROOT_FOLDER } from 'src/lib/encoding'
import { apiHandler } from 'src/lib/apiHandler'
import { bytesToMegabytes } from 'src/lib/formatting'
import PreviewContent from './PreviewContent.vue'

export default {
  components: { PreviewContent },
  props: {
    bucket: { type: String, default: '' },
  },
  data: () => ({
    open: false,
    editMode: false,
    downloadProgress: 0,
    abortControl: undefined,
    type: undefined,
    file: undefined,
    filename: undefined,
    fileData: undefined,
    fileDataEdited: undefined,
    previewConfig: [
      { extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif'], type: 'image', downloadType: 'objectUrl' },
      { extensions: ['mp3'], type: 'audio', downloadType: 'objectUrl' },
      { extensions: ['mp4', 'ogg'], type: 'video', downloadType: 'objectUrl' },
      { extensions: ['pdf'], type: 'pdf', downloadType: 'objectUrl' },
      { extensions: ['txt'], type: 'text', downloadType: 'text' },
      { extensions: ['md'], type: 'markdown', downloadType: 'text' },
      { extensions: ['csv'], type: 'csv', downloadType: 'text' },
      { extensions: ['json'], type: 'json', downloadType: 'text' },
      { extensions: ['html'], type: 'html', downloadType: 'text' },
      { extensions: ['log.gz'], type: 'logs', downloadType: 'blob' },
      { extensions: ['eml'], type: 'email', downloadType: 'text' },
    ],
  }),
  methods: {
    getType(filename) {
      for (const config of this.previewConfig) {
        for (const extension of config.extensions) {
          if (filename.toLowerCase().endsWith(extension)) {
            return { type: config.type, downloadType: config.downloadType }
          }
        }
      }
      return { type: 'unknown', downloadType: 'text' }
    },
    async openFile(file, overrideBucket) {
      if (bytesToMegabytes(file.size) > 200) {
        this.toast.show({ message: 'File is too big to preview.', type: 'warning' })
        return
      }

      const previewConfig = this.getType(file.name)
      this.abortControl = new AbortController()

      // Only update route when on a files page (has bucket param)
      const routeBucket = this.$route.params.bucket
      if (routeBucket) {
        await this.$router.push({
          name: 'files-file',
          params: {
            bucket: routeBucket,
            folder: this.$route.params.folder || ROOT_FOLDER,
            file: file.nameHash,
          },
        })
      }

      this.filename = file.name
      this.file = file
      this.open = true

      const activeBucket = overrideBucket || routeBucket || this.bucket || this.mainStore.buckets[0]?.name

      if (previewConfig) {
        this.type = previewConfig.type
        const response = await apiHandler.downloadFile(
          activeBucket,
          file.key,
          previewConfig,
          (progressEvent) => {
            this.downloadProgress = progressEvent.loaded / progressEvent.total
          },
          this.abortControl,
        )

        let data
        if (previewConfig.downloadType === 'objectUrl') {
          const blob = new Blob([response.data])
          data = URL.createObjectURL(blob)
        } else {
          data = response.data
        }
        this.fileData = data
      }
    },
    close() {
      if (this.abortControl) this.abortControl.abort()
      this.cancelEdit()

      // Only navigate back if we pushed a files route on open
      if (this.$route.params.file) {
        if (this.$route.params.folder === ROOT_FOLDER) {
          this.$router.push({ name: 'files-home', params: { bucket: this.$route.params.bucket } })
        } else {
          this.$router.push({ name: 'files-folder', params: { bucket: this.$route.params.bucket, folder: this.$route.params.folder } })
        }
      }

      this.type = undefined
      this.fileData = undefined
      this.filename = undefined
      this.abortControl = undefined
      this.downloadProgress = 0
      this.open = false
    },
    enableEdit() {
      this.fileDataEdited = typeof this.fileData === 'object'
        ? JSON.stringify(this.fileData, null, 2)
        : this.fileData
      this.editMode = true
    },
    cancelEdit() {
      this.editMode = false
      this.fileDataEdited = undefined
    },
    validateEdit(type, content) {
      if (type === 'json') {
        try { JSON.parse(content); return true } catch { return false }
      }
      return true
    },
    async saveEdit() {
      if (!this.validateEdit(this.type, this.fileDataEdited)) {
        this.toast.show({ message: `Content is not valid ${this.type}.`, type: 'error' })
        return
      }

      const notif = this.toast.show({
        message: 'Updating file...', spinner: true, caption: '0%', timeout: 0,
      })

      const blobProperties = {}
      if (this.file.httpMetadata?.contentType) {
        blobProperties.type = this.file.httpMetadata.contentType
      }
      const newFile = new Blob([this.fileDataEdited], blobProperties)

      await apiHandler.uploadObjects(newFile, this.file.key, this.selectedBucket, (progressEvent) => {
        notif({ caption: `${Math.round((progressEvent.loaded * 100) / newFile.size)}%` })
      })

      notif({ message: 'File updated!', spinner: false, timeout: 3000 })
      this.cancelEdit()
      this.openFile(this.file)
    },
  },
  computed: {
    selectedBucket() { return this.$route.params.bucket || this.bucket || this.mainStore.buckets[0]?.name },
  },
  setup() {
    return {
      mainStore: useMainStore(),
      toast: useToastStore(),
    }
  },
}
</script>
