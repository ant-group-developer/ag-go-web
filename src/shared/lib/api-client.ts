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

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
  if (!headers.has('Authorization') && AUTH0_ACCESS_TOKEN) {
    headers.set('Authorization', `Bearer ${AUTH0_ACCESS_TOKEN}`);
  }
  if (!headers.has('Authorization') && !headers.has('X-User-Id')) {
    headers.set('X-User-Id', DEV_USER_ID);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(body || `API request failed: ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}
