import mitt from 'mitt'

type Events = {
  fetchFiles: void
  openFileDetails: unknown
  openFilesUploader: void
  openFoldersUploader: void
}

export const bus = mitt<Events>()
