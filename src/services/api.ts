import { BASE_URL } from "../constant";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  meta: Record<string, unknown>;
};

type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

export class HttpError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, statusText: string, data?: ApiResponse<unknown>) {
    super(`${status} ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
    this.message = data?.message ?? `${status} ${statusText}`;
  }
}

type HttpRequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null
  query?: QueryParams
}

type RequestOptions = Omit<HttpRequestOptions, 'method' | 'body'>;
type MutationRequestOptions = Omit<HttpRequestOptions, 'method' | 'body'>;

export type HttpRequestConfig = {
  onLogout?: () => void;
  getCrmUserId?: () => string | null | undefined;
}

export type HttpRequestInstance = {
  get: <T>(path: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
  post: <T>(path: string, body?: HttpRequestOptions['body'], options?: MutationRequestOptions) => Promise<ApiResponse<T>>;
  put: <T>(path: string, body?: HttpRequestOptions['body'], options?: MutationRequestOptions) => Promise<ApiResponse<T>>;
  patch: <T>(path: string, body?: HttpRequestOptions['body'], options?: MutationRequestOptions) => Promise<ApiResponse<T>>;
  delete: <T>(path: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
}

async function refreshTokens(): Promise<void> {
  const response = await fetch(`${BASE_URL}/v1/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('refresh_failed');
  }
}

async function rawFetch(path: string, body: HttpRequestOptions['body'], headers: HeadersInit | undefined, options: RequestInit): Promise<Response> {
  const isFormData = body instanceof FormData;
  const hasJsonBody = body !== undefined && body !== null && !isFormData;

  return fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: hasJsonBody ? JSON.stringify(body) : (body as BodyInit | null | undefined),
  });
}

function buildPath(path: string, query?: QueryParams): string {
  if (!query) {
    return path;
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          searchParams.append(key, String(item));
        }
      });
      return;
    }

    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();

  if (!queryString) {
    return path;
  }

  return `${path}${path.includes('?') ? '&' : '?'}${queryString}`;
}

export function createHttpRequest(config: HttpRequestConfig = {}): HttpRequestInstance {
  let isRefreshing = false;
  let refreshQueue: Array<() => void> = [];

  async function request<T>(
    path: string,
    { body, headers, query, ...options }: HttpRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const resolvedPath = buildPath(path, query);
    const crmUserId = config.getCrmUserId?.();
    const mergedHeaders: HeadersInit = {
      ...(crmUserId ? { 'x-crm-userid': crmUserId } : {}),
      ...(headers as Record<string, string> | undefined),
    };
    let response = await rawFetch(resolvedPath, body, mergedHeaders, options);

    if (response.status === 401 && path !== '/v1/auth/refresh-token') {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await refreshTokens();
          refreshQueue.forEach((resolve) => resolve());
        } catch {
          refreshQueue = [];
          isRefreshing = false;
          config.onLogout?.();
          throw new HttpError(401, 'Unauthorized');
        }
        refreshQueue = [];
        isRefreshing = false;
      } else {
        await new Promise<void>((resolve) => refreshQueue.push(resolve));
      }

      response = await rawFetch(resolvedPath, body, mergedHeaders, options);
    }

    const envelope = await parseResponse(response) as ApiResponse<T>;

    if (!response.ok || !envelope?.success) {
      throw new HttpError(response.status, response.statusText, envelope);
    }

    return envelope as ApiResponse<T>;
  }

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: HttpRequestOptions['body'], options?: MutationRequestOptions) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: HttpRequestOptions['body'], options?: MutationRequestOptions) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    patch: <T>(path: string, body?: HttpRequestOptions['body'], options?: MutationRequestOptions) =>
      request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options?: RequestOptions) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
}

export const httpRequest = createHttpRequest();

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}
