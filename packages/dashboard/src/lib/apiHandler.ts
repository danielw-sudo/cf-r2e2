import { api } from './api'
import { encode } from './encoding'
import { getFileIcon } from './fileIcons'
import { bytesToSize, retryWithBackoff, timeSince } from './formatting'
import { useMainStore } from 'stores/main-store'

interface R2Object {
  key: string
  uploaded: string
  size: number
  [key: string]: unknown
}

interface MappedFile extends R2Object {
  hash: string
  nameHash: string
  name: string
  lastModified: string
  timestamp: number
  type: string
  icon: string
  color: string
  sizeRaw: number
}

function mapFile(obj: R2Object, prefix: string): MappedFile {
  const date = new Date(obj.uploaded)
  return {
    ...obj,
    hash: encode(obj.key),
    nameHash: encode(obj.key.replace(prefix, '')),
    name: obj.key.replace(prefix, ''),
    lastModified: timeSince(date),
    timestamp: date.getTime(),
    size: bytesToSize(obj.size),
    sizeRaw: obj.size,
    type: 'file',
    icon: getFileIcon(obj.key),
    color: 'grey',
  }
}

export const apiHandler = {
  search: async (query: string, opts?: { bucket?: string; limit?: number; tag?: string; sort?: string }) => {
    const params: Record<string, string | number> = { q: query }
    if (opts?.bucket) params.bucket = opts.bucket
    if (opts?.limit) params.limit = opts.limit
    if (opts?.tag) params.tag = opts.tag
    if (opts?.sort) params.sort = opts.sort
    const res = await api.get('/search', { params })
    return res.data as { results: Array<{ bucket: string; key: string; title?: string; description?: string; contentType?: string; size?: number }> }
  },

  createFolder: (key: string, bucket: string) => {
    return api.post(`/buckets/${bucket}/folder`, { key: encode(key) })
  },

  deleteObject: (key: string, bucket: string) => {
    return api.post(`/buckets/${bucket}/delete`, { key: encode(key) })
  },

  downloadFile: (
    bucket: string,
    key: string,
    previewConfig: { downloadType?: string },
    onDownloadProgress?: (e: unknown) => void,
    abortControl?: AbortController,
  ) => {
    const extra: Record<string, unknown> = {}
    if (
      previewConfig.downloadType === 'objectUrl' ||
      previewConfig.downloadType === 'blob'
    ) {
      extra.responseType = 'arraybuffer'
    }
    if (abortControl) extra.signal = abortControl.signal
    if (onDownloadProgress) extra.onDownloadProgress = onDownloadProgress

    return api.get(`/buckets/${bucket}/${encode(key)}`, extra)
  },

  headFile: async (bucket: string, key: string) => {
    let prefix = ''
    if (key.includes('/')) {
      prefix = key.replace(key.split('/').pop()!, '')
    }
    const resp = await api.get(`/buckets/${bucket}/${encode(key)}/head`)
    if (resp.status === 200) return mapFile(resp.data, prefix)
  },

  renameObject: (bucket: string, oldKey: string, newKey: string) => {
    return api.post(`/buckets/${bucket}/move`, {
      oldKey: encode(oldKey),
      newKey: encode(newKey),
    })
  },

  updateMetadata: async (
    bucket: string,
    key: string,
    customMetadata: Record<string, string>,
    httpMetadata: Record<string, string> = {},
  ) => {
    let prefix = ''
    if (key.includes('/')) {
      prefix = key.replace(key.split('/').pop()!, '')
    }
    const resp = await api.post(`/buckets/${bucket}/${encode(key)}`, {
      customMetadata,
      httpMetadata,
    })
    if (resp.status === 200) return mapFile(resp.data, prefix)
  },

  multipartCreate: (file: File, key: string, bucket: string) => {
    return api.post(`/buckets/${bucket}/multipart/create`, null, {
      params: {
        key: encode(key),
        httpMetadata: encode(JSON.stringify({ contentType: file.type })),
      },
    })
  },

  multipartComplete: (
    _file: File,
    key: string,
    bucket: string,
    parts: unknown[],
    uploadId: string,
  ) => {
    return api.post(`/buckets/${bucket}/multipart/complete`, {
      key: encode(key),
      uploadId,
      parts,
    })
  },

  multipartUpload: (
    uploadId: string,
    partNumber: number,
    bucket: string,
    key: string,
    chunk: Blob,
    callback?: (e: unknown) => void,
  ) => {
    return api.post(`/buckets/${bucket}/multipart/upload`, chunk, {
      params: { key: encode(key), uploadId, partNumber },
      onUploadProgress: callback,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadObjects: async (
    file: File,
    key: string,
    bucket: string,
    callback?: (e: unknown) => void,
  ) => {
    return await retryWithBackoff(
      async () => {
        return await api.post(`/buckets/${bucket}/upload`, file, {
          params: {
            key: encode(key),
            httpMetadata: encode(JSON.stringify({ contentType: file.type })),
          },
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: callback,
        })
      },
      5,
      1000,
      10000,
      2,
    )
  },

  listObjects: async (
    bucket: string,
    prefix: string,
    delimiter = '/',
    cursor: string | null = null,
  ) => {
    return await api.get(
      `/buckets/${bucket}?include=customMetadata&include=httpMetadata`,
      {
        params: {
          delimiter,
          prefix: prefix && prefix !== '/' ? encode(prefix) : '',
          cursor,
        },
      },
    )
  },

  fetchFile: async (bucket: string, prefix: string, delimiter = '/') => {
    const mainStore = useMainStore()
    let truncated = true
    let cursor: string | null = null
    const contentFiles: MappedFile[] = []
    const contentFolders: unknown[] = []

    while (truncated) {
      const response = await apiHandler.listObjects(
        bucket,
        prefix,
        delimiter,
        cursor,
      )

      truncated = response.data.truncated
      cursor = response.data.cursor

      if (response.data.objects) {
        const files = response.data.objects
          .filter((obj: R2Object) => {
            return (
              !(obj.key.endsWith('/') && delimiter !== '') &&
              obj.key !== prefix &&
              !obj.key.endsWith('.meta.json') &&
              !obj.key.startsWith('_r2e2/')
            )
          })
          .map((obj: R2Object) => mapFile(obj, prefix))
          .filter((obj: MappedFile) => {
            return !(
              mainStore.showHiddenFiles !== true && obj.name.startsWith('.')
            )
          })

        for (const f of files) contentFiles.push(f)
      }

      if (response.data.delimitedPrefixes) {
        const folders = response.data.delimitedPrefixes
          .map((obj: string) => ({
            name: obj.replace(prefix, ''),
            hash: encode(obj),
            key: obj,
            lastModified: '--',
            timestamp: 0,
            size: '--',
            sizeRaw: 0,
            type: 'folder',
            icon: 'folder',
            color: 'orange',
          }))
          .filter((obj: { name: string }) => {
            return !(
              mainStore.showHiddenFiles !== true && obj.name.startsWith('.')
            )
          })

        for (const f of folders) contentFolders.push(f)
      }
    }

    return [...contentFolders, ...contentFiles]
  },
}
