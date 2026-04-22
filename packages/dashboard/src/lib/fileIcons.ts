const EXT_MAP: Record<string, { icon: string; color: string }> = {}

const types: [string[], string, string][] = [
  [['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg', 'bmp', 'ico'], 'image', 'text-blue-400'],
  [['mp4', 'webm', 'mov', 'avi', 'mkv'], 'movie', 'text-purple-400'],
  [['mp3', 'wav', 'ogg', 'flac', 'aac'], 'audio_file', 'text-pink-400'],
  [['pdf'], 'picture_as_pdf', 'text-red-400'],
  [['zip', 'tar', 'gz', 'rar', '7z'], 'folder_zip', 'text-yellow-500'],
  [['js', 'ts', 'py', 'html', 'css', 'json', 'xml', 'yml', 'yaml'], 'code', 'text-green-400'],
  [['txt', 'md', 'doc', 'docx'], 'description', 'text-gray-400'],
  [['xls', 'xlsx', 'csv'], 'table_chart', 'text-emerald-400'],
  [['ppt', 'pptx'], 'slideshow', 'text-orange-400'],
  [['eml'], 'email', 'text-cyan-400'],
]

for (const [exts, icon, color] of types) {
  for (const ext of exts) EXT_MAP[ext] = { icon, color }
}

const DEFAULT = { icon: 'article', color: 'text-gray-400' }

export function getFileIcon(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return (EXT_MAP[ext] ?? DEFAULT).icon
}

export function getFileIconColor(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? ''
  return (EXT_MAP[ext] ?? DEFAULT).color
}
