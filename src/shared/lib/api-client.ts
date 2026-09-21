import axios, { AxiosError, type AxiosRequestConfig, type RawAxiosRequestHeaders } from 'axios';
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

const api = axios.create({
  baseURL: API_BASE_URL,
  adapter: 'fetch',
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  if (!config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${await getAccessToken()}`;
  }
  return config;
});

export function apiUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path}`;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = toAxiosHeaders(init?.headers);
  if (typeof init?.body === 'string' && !hasContentType(headers)) {
    headers['Content-Type'] = 'application/json';
  }
  const config: AxiosRequestConfig = {
    url: path,
    method: init?.method ?? 'GET',
    headers,
    data: init?.body,
  };

  try {
    const response = await api.request<T | ApiResponse<T>>(config);
    const body = response.data;
    const envelope = isApiResponse<T>(body) ? body : undefined;

    if (envelope?.success === false) {
      throw createApiError(envelope, response.status, response.headers);
    }

    return (envelope ? envelope.data : body) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw toApiError(error);
  }
}

export async function apiBlob(path: string): Promise<Blob> {
  try {
    const response = await api.request<Blob>({
      url: path,
      method: 'GET',
      responseType: 'blob',
      headers: { Accept: 'image/*' },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

function toAxiosHeaders(headers?: HeadersInit): RawAxiosRequestHeaders {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
}

function hasContentType(headers: RawAxiosRequestHeaders): boolean {
  return Object.keys(headers).some((name) => name.toLowerCase() === 'content-type');
}

function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError(error instanceof Error ? error.message : 'API request failed', 0);
  }

  const axiosError = error as AxiosError<unknown>;
  const responseBody = axiosError.response?.data;
  const envelope = isApiResponse<unknown>(responseBody) ? responseBody : undefined;
  const payload = envelope?.error;
  const fallbackMessage = getResponseMessage(responseBody) ?? axiosError.message;

  return new ApiError(
    payload?.message ?? fallbackMessage,
    axiosError.response?.status ?? 0,
    payload?.code,
    envelope?.requestId ?? getHeader(axiosError, 'x-request-id'),
    payload?.details,
    payload?.fieldErrors,
  );
}

function createApiError(
  envelope: ApiResponse<unknown>,
  status: number,
  headers: Record<string, unknown>,
): ApiError {
  return new ApiError(
    envelope.error?.message ?? 'API request failed',
    status,
    envelope.error?.code,
    envelope.requestId ?? getHeaderValue(headers, 'x-request-id'),
    envelope.error?.details,
    envelope.error?.fieldErrors,
  );
}

function getResponseMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'message' in value) {
    const message = value.message;
    return typeof message === 'string' ? message : undefined;
  }

  return undefined;
}

function getHeader(error: AxiosError, name: string): string | undefined {
  const value = error.response?.headers?.[name];
  return typeof value === 'string' ? value : undefined;
}

function getHeaderValue(headers: Record<string, unknown>, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
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
