import { getAccessToken } from '../../auth/auth-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
  fieldErrors?: Record<string, string[]>;
};

export type ApiResponse<T> = {
  data: T | null;
  requestId: string;
  timestamp: string;
  success: boolean;
  error: ApiErrorPayload | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
    readonly details?: unknown,
    readonly fieldErrors?: Record<string, string[]>,
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

  const body = await readResponseBody(response);
  const envelope = isApiResponse<unknown>(body) ? body : undefined;

  if (!response.ok || envelope?.success === false) {
    const error = envelope?.error;
    const fallbackMessage =
      typeof body === 'string'
        ? body
        : body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : `API request failed: ${response.status}`;
    throw new ApiError(
      error?.message ?? fallbackMessage,
      response.status,
      error?.code,
      envelope?.requestId ?? response.headers.get('x-request-id') ?? undefined,
      error?.details,
      error?.fieldErrors,
    );
  }

  return (envelope ? envelope.data : body) as T;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.requestId === 'string' &&
    typeof candidate.timestamp === 'string' &&
    typeof candidate.success === 'boolean' &&
    'data' in candidate &&
    'error' in candidate
  );
}
