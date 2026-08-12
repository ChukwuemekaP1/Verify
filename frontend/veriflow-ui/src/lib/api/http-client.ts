import { appEnv } from '@/lib/config/env';

import type { ApiResponse } from './contracts';

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;
  requestId?: string;

  constructor(message: string, statusCode: number, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.requestId = requestId;
  }
}

async function request<TData>(path: string, init?: RequestInit): Promise<ApiResponse<TData>> {
  const finalHeaders: Record<string, string> = {
    ...(init?.headers ?? {}),
  };
  const hasContentType = Object.keys(finalHeaders).some((k) => k.toLowerCase() === 'content-type');
  const isMultipart =
    init?.body instanceof FormData ||
    (init?.headers &&
      typeof init.headers === 'object' &&
      'forEach' in init.headers === false &&
      String(Object.fromEntries(Object.entries(init.headers))['content-type'] || '').includes('multipart/form-data'));
  if (!hasContentType && !isMultipart) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${appEnv.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
    headers: finalHeaders,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<TData> | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? 'Request failed',
      response.status,
      payload?.details,
      payload?.requestId,
    );
  }

  return payload ?? { status: 'success' };
}

export const httpClient = {
  get: <TData>(path: string) => request<TData>(path),
  post: <TData>(path: string, body?: unknown) =>
    request<TData>(path, {
      method: 'POST',
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <TData>(path: string, body?: unknown) =>
    request<TData>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <TData>(path: string) =>
    request<TData>(path, {
      method: 'DELETE',
    }),
  upload: <TData>(path: string, file: File, extraFields?: Record<string, unknown>) => {
    const form = new FormData();
    form.append('file', file);
    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'object') {
          form.append(key, JSON.stringify(value));
        } else {
          form.append(key, String(value));
        }
      }
    }
    return request<TData>(path, {
      method: 'POST',
      body: form,
    });
  },
  uploadPatch: <TData>(path: string, file?: File, extraFields?: Record<string, unknown>) => {
    const form = new FormData();
    if (file) form.append('file', file);
    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'object') {
          form.append(key, JSON.stringify(value));
        } else {
          form.append(key, String(value));
        }
      }
    }
    return request<TData>(path, {
      method: 'PATCH',
      body: form,
    });
  },
};
