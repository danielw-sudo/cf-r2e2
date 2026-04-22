<template>
  <!-- Delete modal -->
  <template v-if="deleteModal">
    <div class="fixed inset-0 z-40 bg-black/50" @click="reset" />
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-5 shadow-2xl dark:shadow-gray-900/50">
        <div v-if="row" class="mb-4">
          <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <span class="material-icons text-red-600">delete</span>
          </div>
          <p v-if="row.type === 'folder'" class="text-sm text-gray-700 dark:text-gray-300">
            Delete folder <code class="rounded bg-gray-100 dark:bg-gray-700 px-1">{{ row.name }}</code>
            and <code class="rounded bg-gray-100 dark:bg-gray-700 px-1">{{ deleteFolderInnerFilesCount ?? '...' }}</code> files inside?
          </p>
          <p v-else class="text-sm text-gray-700 dark:text-gray-300">
            Delete <code class="rounded bg-gray-100 dark:bg-gray-700 px-1">{{ row.name }}</code>?
          </p>
        </div>
        <div class="flex justify-end gap-2">
          <button class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" @click="reset">Cancel</button>
          <button class="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50" :disabled="loading" @click="deleteConfirm">
            {{ loading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </template>

  <!-- Rename modal -->
  <template v-if="renameModal">
    <div class="fixed inset-0 z-40 bg-black/50" @click="reset" />
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-5 shadow-2xl dark:shadow-gray-900/50">
        <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <span class="material-icons text-orange-600">edit</span>
        </div>
        <label class="mb-1 block text-sm text-gray-600 dark:text-gray-400">New name</label>
        <input v-model="renameInput" type="text" class="mb-4 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm" @keyup.enter="renameConfirm" />
        <div class="flex justify-end gap-2">
          <button class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" @click="reset">Cancel</button>
          <button class="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50" :disabled="loading" @click="renameConfirm">Rename</button>
        </div>
      </div>
    </div>
  </template>

  <!-- Metadata modal (extracted) -->
  <MetadataModal
    ref="metaModal"
    :visible="updateMetadataModal"
    :saving="loading"
    @close="reset"
    @save="updateConfirm"
  />
</template>

<script>
import { useMainStore } from 'stores/main-store'
import { useToastStore } from 'stores/toast-store'
import { ROOT_FOLDER, decode } from 'src/lib/encoding'
import { apiHandler } from 'src/lib/apiHandler'
import { defineComponent } from 'vue'
import MetadataModal from './MetadataModal.vue'

export default defineComponent({
  name: 'FileOptions',
  components: { MetadataModal },
  props: {
    bucket: { type: String, default: null },
  },
  data: () => ({
    row: null,
    deleteFolderContents: [],
    deleteModal: false,
    renameModal: false,
    updateMetadataModal: false,
    deleteFolderInnerFilesCount: null,
    renameInput: '',
    loading: false,
  }),
  methods: {
    async deleteObject(row) {
      this.deleteModal = true
      this.row = row
      if (row.type === 'folder') {
        this.deleteFolderContents = await apiHandler.fetchFile(this.selectedBucket, row.key, '')
        this.deleteFolderInnerFilesCount = this.deleteFolderContents.length
      }
    },
    renameObject(row) {
      this.renameModal = true
      this.row = row
      this.renameInput = row.name
    },
    updateMetadataObject(row) {
      this.row = row
      this.updateMetadataModal = true
      this.$nextTick(() => {
        this.$refs.metaModal?.open(row.httpMetadata, row.customMetadata)
      })
    },
    async renameConfirm() {
      if (!this.renameInput.length) return
      this.loading = true
      await apiHandler.renameObject(this.selectedBucket, this.row.key, this.row.key.replace(this.row.name, this.renameInput))
      this.$bus.emit('fetchFiles')
      this.reset()
      this.toast.show({ message: 'File renamed!', type: 'success' })
    },
    async updateConfirm({ customMetadata, httpMetadata }) {
      this.loading = true
      await apiHandler.updateMetadata(this.selectedBucket, this.row.key, customMetadata, httpMetadata)
      this.$bus.emit('fetchFiles')
      this.reset()
      this.toast.show({ message: 'Metadata updated!', type: 'success' })
    },
    async deleteConfirm() {
      if (this.row.type === 'folder') {
        const originalFolder = { ...this.row }
        const folderContents = [...this.deleteFolderContents]
        const count = this.deleteFolderInnerFilesCount
        this.deleteModal = false

        const notif = this.toast.show({ message: 'Deleting files...', spinner: true, caption: '0%', timeout: 0 })

        for (const [i, innerFile] of folderContents.entries()) {
          if (innerFile.key) await apiHandler.deleteObject(innerFile.key, this.selectedBucket)
          notif({ caption: `${Math.round((i * 100) / (count + 1))}%` })
        }

        await apiHandler.deleteObject(originalFolder.key, this.selectedBucket)
        notif({ message: 'Folder deleted!', spinner: false, timeout: 2500 })
      } else {
        this.deleteModal = false
        await apiHandler.deleteObject(this.row.key, this.selectedBucket)
        this.toast.show({ message: 'File deleted!', type: 'success' })
      }

      this.$bus.emit('fetchFiles')
      this.reset()
    },
    reset() {
      this.loading = false
      this.deleteModal = false
      this.renameModal = false
      this.updateMetadataModal = false
      this.renameInput = ''
      this.row = null
      this.deleteFolderInnerFilesCount = null
      this.deleteFolderContents = []
    },
  },
  computed: {
    selectedBucket() { return this.bucket || this.$route.params.bucket },
    selectedFolder() {
      if (this.$route.params.folder && this.$route.params.folder !== ROOT_FOLDER) {
        return decode(this.$route.params.folder)
      }
      return ''
    },
  },
  setup() {
    return {
      mainStore: useMainStore(),
      toast: useToastStore(),
    }
  },
})
</script>
