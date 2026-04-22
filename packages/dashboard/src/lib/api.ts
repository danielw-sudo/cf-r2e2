let baseUrl = window.location.origin
if (import.meta.env.DEV) {
  baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:8787'
}

const BASE = `${baseUrl}/api`

const defaultHeaders: Record<string, string> = {}

export interface ApiOptions {
  params?: Record<string, string | number | null | undefined>
  responseType?: 'arraybuffer'
  signal?: AbortSignal
  onDownloadProgress?: (e: ProgressEvent) => void
  onUploadProgress?: (e: ProgressEvent) => void
  headers?: Record<string, string>
  validateStatus?: (status: number) => boolean
}

export interface ApiResponse<T = unknown> {
  status: number
  data: T
  headers: Record<string, string>
}

function buildUrl(path: string, params?: Record<string, string | number | null | undefined>): string {
  const url = new URL(BASE + path)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const line of raw.split('\r\n')) {
    const idx = line.indexOf(': ')
    if (idx > 0) headers[line.slice(0, idx)] = line.slice(idx + 2)
  }
  return headers
}

function request<T = unknown>(
  method: string,
  path: string,
  body: unknown,
  opts: ApiOptions = {},
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest()
    req.open(method, buildUrl(path, opts.params))

    if (opts.responseType === 'arraybuffer') req.responseType = 'arraybuffer'
    if (opts.signal) opts.signal.addEventListener('abort', () => req.abort())

    const allHeaders = { ...defaultHeaders, ...(opts.headers ?? {}) }
    for (const [k, v] of Object.entries(allHeaders)) req.setRequestHeader(k, v)

    if (opts.onDownloadProgress) req.addEventListener('progress', opts.onDownloadProgress)
    if (opts.onUploadProgress) req.upload.addEventListener('progress', opts.onUploadProgress)

    req.onload = () => {
      const validateStatus = opts.validateStatus ?? ((s) => s >= 200 && s < 300)

      let data: unknown
      if (opts.responseType === 'arraybuffer') {
        data = req.response
      } else {
        try { data = JSON.parse(req.responseText) } catch { data = req.responseText }
      }

      const resp: ApiResponse<T> = {
        status: req.status,
        data: data as T,
        headers: parseHeaders(req.getAllResponseHeaders()),
      }

      if (validateStatus(req.status)) {
        resolve(resp)
      } else {
        reject(Object.assign(new Error(`Request failed: ${req.status}`), { response: resp }))
      }
    }

    req.onerror = () => reject(new Error('Network error'))
    req.onabort = () => reject(Object.assign(new DOMException('Aborted', 'AbortError'), { response: null }))

    if (body instanceof Blob || body instanceof FormData || body instanceof ArrayBuffer) {
      req.send(body)
    } else if (body != null) {
      if (!allHeaders['Content-Type'] && !allHeaders['content-type']) {
        req.setRequestHeader('Content-Type', 'application/json')
      }
      req.send(JSON.stringify(body))
    } else {
      req.send()
    }
  })
}

export const api = {
  defaults: { headers: { common: defaultHeaders } },
  get: <T = unknown>(path: string, opts?: ApiOptions) => request<T>('GET', path, null, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>('POST', path, body, opts),
  put: <T = unknown>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>('PUT', path, body, opts),
  delete: <T = unknown>(path: string, body?: unknown, opts?: ApiOptions) =>
    request<T>('DELETE', path, body, opts),
}
