const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class HttpError extends Error {
  status: number
  data: unknown

  constructor(status: number, statusText: string, data: unknown) {
    super(`${status} ${statusText}`)
    this.name = 'HttpError'
    this.status = status
    this.data = data
  }
}

type HttpRequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null
}

export async function request<T>(
  path: string,
  { body, headers, ...options }: HttpRequestOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData
  const hasJsonBody = body !== undefined && body !== null && !isFormData

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: hasJsonBody ? JSON.stringify(body) : body,
  })

  const data = await parseResponse(response)
  
  if (!response.ok) {
    throw new HttpError(response.status, response.statusText, data)
  }

  return data as T
}

export const httpRequest = {
  get: <T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: HttpRequestOptions['body'], options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: HttpRequestOptions['body'], options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: HttpRequestOptions['body'], options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}
