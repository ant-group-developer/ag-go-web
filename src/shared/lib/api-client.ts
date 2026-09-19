const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID ?? 'dev-user';
const AUTH0_ACCESS_TOKEN = import.meta.env.VITE_AUTH0_ACCESS_TOKEN;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function apiHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  if (!headers.has('Authorization') && AUTH0_ACCESS_TOKEN) {
    headers.set('Authorization', `Bearer ${AUTH0_ACCESS_TOKEN}`);
  }
  if (!headers.has('Authorization') && !headers.has('X-User-Id')) {
    headers.set('X-User-Id', DEV_USER_ID);
  }
  return headers;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = apiHeaders(init?.headers);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(body || `API request failed: ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}
