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

  select: (path: string) =>
    request<WorldsResponse>('/worlds/active', {
      method: 'PATCH',
      body: JSON.stringify({ path }),
    }),
}
