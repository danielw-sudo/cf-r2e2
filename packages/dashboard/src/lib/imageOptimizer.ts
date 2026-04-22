/**
 * Client-side image optimization via Canvas API.
 * Supports compress, resize, and format conversion.
 * Uses OffscreenCanvas where available, falls back to <canvas>.
 */

export interface OptimizeOptions {
  compress: boolean
  resize: boolean
  quality: number       // 0–100
  maxWidth: number
  maxHeight: number
  format: OutputFormat
}

export type OutputFormat = 'webp' | 'jpeg' | 'png' | 'original'

export interface OptimizeResult {
  blob: Blob
  originalSize: number
  optimizedSize: number
  width: number
  height: number
  format: string
  skipped: boolean
}

const IMAGE_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'avif', 'bmp', 'gif',
])

const MIME_MAP: Record<string, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export function isOptimizableImage(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTS.has(ext) && file.type.startsWith('image/')
}

export function getDefaultOptions(): OptimizeOptions {
  return {
    compress: true,
    resize: true,
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'webp',
  }
}

/**
 * Load a File into an ImageBitmap (works in workers and main thread).
 */
async function loadImage(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

/**
 * Calculate scaled dimensions that fit within max bounds while preserving aspect ratio.
 */
function fitDimensions(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  if (w <= maxW && h <= maxH) return { width: w, height: h }

  const ratio = Math.min(maxW / w, maxH / h)
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  }
}

/**
 * Render bitmap to a canvas and export as blob.
 */
async function renderToBlob(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  // Try OffscreenCanvas first (better perf, no DOM needed)
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.convertToBlob({ type: mimeType, quality: quality / 100 })
  }

  // Fallback: DOM canvas (Safari < 16.4)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      mimeType,
      quality / 100,
    )
  })
}

/**
 * Optimize an image file. Returns the original unchanged for non-image files
 * or when both compress and resize are disabled.
 */
export async function optimizeImage(
  file: File,
  options: OptimizeOptions,
): Promise<OptimizeResult> {
  const originalSize = file.size

  // Not an optimizable image — return as-is
  if (!isOptimizableImage(file)) {
    return {
      blob: file,
      originalSize,
      optimizedSize: originalSize,
      width: 0,
      height: 0,
      format: file.type,
      skipped: true,
    }
  }

  // Both disabled — return original
  if (!options.compress && !options.resize) {
    return {
      blob: file,
      originalSize,
      optimizedSize: originalSize,
      width: 0,
      height: 0,
      format: file.type,
      skipped: true,
    }
  }

  const bitmap = await loadImage(file)
  let { width, height } = bitmap

  // Resize if enabled
  if (options.resize) {
    const fitted = fitDimensions(width, height, options.maxWidth, options.maxHeight)
    width = fitted.width
    height = fitted.height
  }

  // Determine output format
  let mimeType: string
  let formatLabel: string

  if (options.format === 'original') {
    mimeType = file.type
    formatLabel = file.type.split('/')[1] || 'unknown'
  } else {
    mimeType = MIME_MAP[options.format] || 'image/webp'
    formatLabel = options.format
  }

  // Quality: use provided when compressing, max otherwise
  const quality = options.compress ? options.quality : 100

  const blob = await renderToBlob(bitmap, width, height, mimeType, quality)
  const origW = bitmap.width
  const origH = bitmap.height
  bitmap.close()

  // If optimized is larger, return original
  if (blob.size >= originalSize) {
    return {
      blob: file,
      originalSize,
      optimizedSize: originalSize,
      width: origW,
      height: origH,
      format: file.type,
      skipped: true,
    }
  }

  return {
    blob,
    originalSize,
    optimizedSize: blob.size,
    width,
    height,
    format: formatLabel,
    skipped: false,
  }
}
