<template>
  <div class="flex h-full gap-0">
    <div class="flex flex-1 flex-col overflow-hidden">
      <div class="mb-3 flex items-center justify-between">
        <Breadcrumbs :crumbs="breadcrumbs" @navigate="navigateCrumb" />

        <div class="flex items-center gap-2">
          <button
            class="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            :class="galleryStore.viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : ''"
            @click="galleryStore.viewMode = 'table'"
            title="List view"
          >
            <span class="material-icons text-lg">view_list</span>
          </button>
          <button
            class="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            :class="galleryStore.viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : ''"
            @click="galleryStore.viewMode = 'grid'"
            title="Grid view"
          >
            <span class="material-icons text-lg">grid_view</span>
          </button>
        </div>
      </div>

      <BatchActions
        :count="galleryStore.selectedItems.length"
        @delete="handleBatchDelete"
        @clear="galleryStore.clearSelection()"
      />

      <div class="flex-1 overflow-auto">
        <FileTable
          v-if="galleryStore.viewMode === 'table'"
          :files="rows"
          :loading="loading"
          @open="openObject"
          @select="selectFile"
          @contextmenu="openContextMenu"
        />
        <FileGrid
          v-else
          :files="rows"
          :loading="loading"
          @open="openObject"
          @select="selectFile"
          @contextmenu="openContextMenu"
        />
      </div>
    </div>

    <FileDetailsPanel
      v-if="selectedFile"
      :file="selectedFile"
      @close="selectedFile = null"
    />

    <FileContextMenu ref="contextMenu" @action="handleContextAction" />

    <file-preview ref="preview" />
    <file-options ref="options" />
    <PresignUrlModal ref="presignModal" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore } from 'stores/main-store'
import { useGalleryStore } from 'stores/gallery-store'
import { apiHandler } from 'src/lib/apiHandler'
import { useToastStore } from 'stores/toast-store'
import { ROOT_FOLDER, decode, encode } from 'src/lib/encoding'
import { api } from 'src/lib/api'
import Breadcrumbs from 'components/browser/Breadcrumbs.vue'
import FileTable from 'components/browser/FileTable.vue'
import FileGrid from 'components/browser/FileGrid.vue'
import FileContextMenu from 'components/browser/FileContextMenu.vue'
import FileDetailsPanel from 'components/browser/FileDetailsPanel.vue'
import BatchActions from 'components/browser/BatchActions.vue'
import FilePreview from 'components/preview/FilePreview.vue'
import FileOptions from 'components/files/FileOptions.vue'
import PresignUrlModal from 'components/browser/PresignUrlModal.vue'

const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()
const galleryStore = useGalleryStore()
const instance = getCurrentInstance()

const toast = useToastStore()
const loading = ref(false)
const rows = ref([])
const selectedFile = ref(null)
const contextMenu = ref(null)
const preview = ref(null)
const options = ref(null)
const presignModal = ref(null)

const selectedBucket = computed(() => route.params.bucket)
const selectedFolder = computed(() => {
  if (route.params.folder && route.params.folder !== ROOT_FOLDER) {
    return decode(route.params.folder)
  }
  return ''
})

const breadcrumbs = computed(() => {
  if (selectedFolder.value) {
    return [
      { name: selectedBucket.value, path: '/' },
      ...selectedFolder.value
        .split('/')
        .filter((s) => s !== '')
        .map((item, index, arr) => ({
          name: item,
          path: `${arr.slice(0, index + 1).join('/').replace('Home/', '')}/`,
        })),
    ]
  }
  return [{ name: selectedBucket.value, path: '/' }]
})

function navigateCrumb(crumb) {
  router.push({
    name: 'files-folder',
    params: { bucket: selectedBucket.value, folder: encode(crumb.path) },
  })
}

function openObject(row) {
  if (row.type === 'folder') {
    router.push({
      name: 'files-folder',
      params: { bucket: selectedBucket.value, folder: encode(row.key) },
    })
  } else {
    preview.value?.openFile(row)
  }
}

const selectFile = (file) => { selectedFile.value = file }
const openContextMenu = (event, file) => { contextMenu.value?.open(event, file) }

function handleContextAction(action) {
  const file = contextMenu.value?.file
  contextMenu.value?.close()
  if (!file) return
  const map = { open: openObject, download: downloadFile, presignUrl, publicUrl: togglePublicUrl,
    rename: () => options.value?.renameObject(file),
    metadata: () => options.value?.updateMetadataObject(file),
    delete: () => options.value?.deleteObject(file) }
  ;(map[action] ?? (() => {}))(file)
}

function downloadFile(file) {
  const link = Object.assign(document.createElement('a'), {
    download: file.name,
    href: `${mainStore.serverUrl}/api/buckets/${selectedBucket.value}/${encode(file.key)}`,
  })
  document.body.appendChild(link); link.click(); document.body.removeChild(link)
}

async function togglePublicUrl(file) {
  if (file.type === 'folder') return
  try {
    const res = await api.post(`/buckets/${selectedBucket.value}/public/${encodeURIComponent(encode(file.key))}`)
    if (res.data?.url) {
      presignModal.value?.show(res.data.url, 'Permanent (public)')
    } else {
      toast.show({ message: 'Public sharing disabled', type: 'info' })
    }
  } catch {
    toast.show({ message: 'Failed to toggle public URL', type: 'error' })
  }
}

async function presignUrl(file) {
  if (file.type === 'folder') return
  try {
    const res = await api.post(`/buckets/${selectedBucket.value}/presign/${encodeURIComponent(encode(file.key))}`)
    if (res.data?.url) {
      presignModal.value?.show(res.data.url, res.data.expiresAt)
    }
  } catch {
    toast.show({ message: 'Failed to generate presigned URL', type: 'error' })
  }
}

const handleBatchDelete = () => galleryStore.clearSelection()

async function fetchFiles() {
  loading.value = true
  rows.value = await apiHandler.fetchFile(selectedBucket.value, selectedFolder.value, '/')
  loading.value = false
}
watch(selectedBucket, fetchFiles); watch(selectedFolder, fetchFiles)

onMounted(() => {
  fetchFiles()
  const bus = instance?.appContext.config.globalProperties.$bus
  bus?.on('fetchFiles', fetchFiles)
  if (route.params.file) {
    const rawKey = decode(route.params.file)
    const key = selectedFolder.value ? `${selectedFolder.value}${rawKey}` : rawKey
    apiHandler.headFile(selectedBucket.value, key).then((f) => preview.value?.openFile(f))
  }
})

onBeforeUnmount(() => {
  const bus = instance?.appContext.config.globalProperties.$bus
  bus?.off('fetchFiles', fetchFiles)
})
</script>
