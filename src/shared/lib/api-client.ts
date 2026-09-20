import { getAccessToken } from '../../auth/auth-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

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
  return /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path}`;
}

export async function apiHeaders(init?: HeadersInit): Promise<Headers> {
  const headers = new Headers(init);
  headers.set('Accept', headers.get('Accept') ?? 'application/json');
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${await getAccessToken()}`);
  }
  return headers;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await apiHeaders(init?.headers);
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
