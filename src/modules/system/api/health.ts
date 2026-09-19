import { apiClient } from '../../../shared/lib/api-client';

export type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
};

export function getHealth(): Promise<HealthResponse> {
  return apiClient<HealthResponse>('/health');
}
