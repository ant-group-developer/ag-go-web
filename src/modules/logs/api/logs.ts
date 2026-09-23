import { apiClient } from '../../../shared/lib/api-client';

export type LogActor = {
  id: string;
  name?: string;
  email?: string;
  avatar?: string | null;
} | null;

export type SystemLog = {
  id: string;
  category: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  userId?: string | null;
  projectId?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
  actorUser?: LogActor;
};

export type LogsPage = {
  items: SystemLog[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type LogsQuery = {
  page?: number;
  pageSize?: number;
  category?: string;
  level?: 'info' | 'warn' | 'error';
  action?: string;
  from?: string;
  to?: string;
};

export function getLogs(query: LogsQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });
  return apiClient<LogsPage>(`/logs?${params.toString()}`);
}
