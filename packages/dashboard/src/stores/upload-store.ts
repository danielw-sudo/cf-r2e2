import { defineStore } from 'pinia'
import { apiHandler } from 'src/lib/apiHandler'
import {
  type OptimizeOptions,
  type OptimizeResult,
  getDefaultOptions,
  isOptimizableImage,
  optimizeImage,
} from 'src/lib/imageOptimizer'
import { bytesToSize } from 'src/lib/formatting'

export type QueueItemStatus =
  | 'pending'
  | 'optimizing'
  | 'ready'
  | 'uploading'
  | 'done'
  | 'error'

export interface QueueItem {
  id: string
  file: File
  key: string
  bucket: string
  status: QueueItemStatus
  progress: number
  error: string | null
  optimizable: boolean
  optimizeResult: OptimizeResult | null
  originalSize: string
  optimizedSize: string | null
}

let nextId = 0

export const useUploadStore = defineStore('upload', {
  state: () => ({
    queue: [] as QueueItem[],
    options: getDefaultOptions(),
    processing: false,
  }),

  getters: {
    pendingCount: (state) => state.queue.filter((i) => i.status === 'pending').length,
    activeCount: (state) =>
      state.queue.filter((i) => ['optimizing', 'ready', 'uploading'].includes(i.status)).length,
    doneCount: (state) => state.queue.filter((i) => i.status === 'done').length,
    errorCount: (state) => state.queue.filter((i) => i.status === 'error').length,
    totalCount: (state) => state.queue.length,
    isIdle: (state) => !state.processing,
  },

  actions: {
    addFiles(files: File[], bucket: string, folder: string) {
      for (const file of files) {
        const targetFolder =
          folder && folder !== '/' ? folder : ''
        const key = targetFolder + file.name

        this.queue.push({
          id: `upload-${++nextId}`,
          file,
          key,
          bucket,
          status: 'pending',
          progress: 0,
          error: null,
          optimizable: isOptimizableImage(file),
          optimizeResult: null,
          originalSize: bytesToSize(file.size),
          optimizedSize: null,
        })
      }
    },

    updateOptions(partial: Partial<OptimizeOptions>) {
      Object.assign(this.options, partial)
    },

    async processQueue() {
      if (this.processing) return
      this.processing = true

      const pending = this.queue.filter((i) => i.status === 'pending')

      for (const item of pending) {
        try {
          // Step 1: Optimize (if applicable)
          if (item.optimizable && (this.options.compress || this.options.resize)) {
            item.status = 'optimizing'
            const result = await optimizeImage(item.file, this.options)
            item.optimizeResult = result
            item.optimizedSize = result.skipped
              ? null
              : bytesToSize(result.optimizedSize)
          }

          item.status = 'ready'

          // Step 2: Upload
          item.status = 'uploading'
          const blob = item.optimizeResult?.blob ?? item.file
          const uploadFile =
            blob instanceof File
              ? blob
              : new File([blob], item.file.name, { type: blob.type })

          await this.uploadFile(item, uploadFile)
          item.status = 'done'
          item.progress = 100
        } catch (e) {
          item.status = 'error'
          item.error = e instanceof Error ? e.message : String(e)
        }
      }

      this.processing = false
    },

    async uploadFile(item: QueueItem, file: File) {
      const chunkSize = 95 * 1024 * 1024

      if (file.size > chunkSize) {
        await this.multipartUpload(item, file, chunkSize)
      } else {
        await apiHandler.uploadObjects(file, item.key, item.bucket, (evt: any) => {
          if (evt.total) {
            item.progress = Math.round((evt.loaded * 100) / evt.total)
          }
        })
      }
    },

    async multipartUpload(item: QueueItem, file: File, chunkSize: number) {
      const { data } = await apiHandler.multipartCreate(file, item.key, item.bucket)
      const uploadId = data.uploadId
      const parts: unknown[] = []
      const totalSize = file.size

      let partNumber = 1
      for (let start = 0; start < totalSize; start += chunkSize) {
        const end = Math.min(start + chunkSize, totalSize)
        const chunk = file.slice(start, end)

        const { data: partData } = await apiHandler.multipartUpload(
          uploadId,
          partNumber,
          item.bucket,
          item.key,
          chunk,
          (evt: any) => {
            if (evt.loaded) {
              item.progress = Math.round(((start + evt.loaded) * 100) / totalSize)
            }
          },
        )

        parts.push(partData)
        partNumber++
      }

      await apiHandler.multipartComplete(file, item.key, item.bucket, parts, uploadId)
    },

    cancelItem(id: string) {
      const idx = this.queue.findIndex((i) => i.id === id)
      if (idx !== -1 && ['pending', 'ready'].includes(this.queue[idx].status)) {
        this.queue.splice(idx, 1)
      }
    },

    removeItem(id: string) {
      const idx = this.queue.findIndex((i) => i.id === id)
      if (idx !== -1) this.queue.splice(idx, 1)
    },

    clearCompleted() {
      this.queue = this.queue.filter((i) => i.status !== 'done')
    },

    clearAll() {
      this.queue = this.queue.filter((i) => i.status === 'uploading' || i.status === 'optimizing')
    },
  },
})
