<template>
  <div
    ref="zoneEl"
    class="relative flex flex-col rounded-xl border-2 border-dashed transition-colors"
    :class="isDragging
      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30'
      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400'"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Drop overlay -->
    <div
      v-if="isDragging"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-blue-50/80 dark:bg-blue-900/40"
    >
      <span class="material-icons mb-2 text-5xl text-blue-500">cloud_upload</span>
      <p class="text-sm font-medium text-blue-600">Drop files to upload</p>
    </div>

    <!-- Default content -->
    <div class="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <span class="material-icons mb-2 text-4xl text-gray-300 dark:text-gray-600">cloud_upload</span>
      <p class="mb-0.5 text-sm font-medium text-gray-600 dark:text-gray-300">
        Drag &amp; drop files here
      </p>
      <p class="mb-4 text-xs text-gray-400 dark:text-gray-500">or</p>
      <div class="flex gap-2">
        <button
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          @click="openFilePicker"
        >
          Choose files
        </button>
        <button
          class="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="openFolderPicker"
        >
          Choose folder
        </button>
      </div>
    </div>

    <input ref="fileInput" type="file" multiple class="hidden" @change="onFileInput" />
    <input ref="folderInput" type="file" multiple webkitdirectory class="hidden" @change="onFolderInput" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'files', files: File[]): void
}>()

const zoneEl = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const folderInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

let dragBounds = { top: 0, bottom: 0, left: 0, right: 0 }

function onDragOver() {
  if (!isDragging.value && zoneEl.value) {
    const r = zoneEl.value.getBoundingClientRect()
    dragBounds = { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
  }
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  if (
    e.clientX < dragBounds.left ||
    e.clientX > dragBounds.right ||
    e.clientY > dragBounds.bottom ||
    e.clientY < dragBounds.top
  ) {
    isDragging.value = false
  }
}

async function onDrop(e: DragEvent) {
  isDragging.value = false
  if (!e.dataTransfer) return

  const items = e.dataTransfer.items
  const files: File[] = []

  // Traverse entries for folder support
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.()
    if (entry) {
      await traverseEntry(entry, '', files)
    }
  }

  // Fallback: plain files if no entries found
  if (files.length === 0) {
    for (const f of e.dataTransfer.files) files.push(f)
  }

  if (files.length > 0) emit('files', files)
}

async function traverseEntry(
  entry: FileSystemEntry,
  path: string,
  out: File[],
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve) => {
      ;(entry as FileSystemFileEntry).file(resolve)
    })
    out.push(file)
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries((e) => resolve(e))
    })
    for (const child of entries) {
      await traverseEntry(child, `${path}${entry.name}/`, out)
    }
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

function openFolderPicker() {
  folderInput.value?.click()
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    emit('files', Array.from(input.files))
    input.value = ''
  }
}

function onFolderInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    emit('files', Array.from(input.files))
    input.value = ''
  }
}

defineExpose({ openFilePicker, openFolderPicker })
</script>
