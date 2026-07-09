import type {
  CreateWorldPayload,
  CreateWorldResponse,
  WorldsResponse,
} from '../types/world'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (Array.isArray(body.message)) return body.message.join(', ')
    if (typeof body.message === 'string') return body.message
  } catch {
    // ignore
  }
  return response.statusText || '请求失败'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return response.json() as Promise<T>
}

export const worldsApi = {
  list: () => request<WorldsResponse>('/worlds'),

  create: (payload: CreateWorldPayload) =>
    request<CreateWorldResponse>('/worlds', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  start: (path: string) =>
    request<WorldsResponse>('/worlds/start', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  stop: (path: string) =>
    request<WorldsResponse>('/worlds/stop', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  restart: (path: string) =>
    request<WorldsResponse>('/worlds/restart', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  delete: (path: string) =>
    request<WorldsResponse>('/worlds', {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    }),

  export: async (path: string): Promise<void> => {
    const response = await fetch(
      `${API_BASE}/worlds/export?path=${encodeURIComponent(path)}`,
    )

    if (!response.ok) {
      throw new Error(await parseError(response))
    }

    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
    const plainMatch = /filename="?([^";]+)"?/i.exec(disposition)
    const fileName = utf8Match
      ? decodeURIComponent(utf8Match[1])
      : plainMatch
        ? plainMatch[1]
        : 'world-export.zip'

    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  },
}
