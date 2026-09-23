import { apiClient } from '../../../shared/lib/api-client';

export type WebSettings = {
  siteName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  supportEmail?: string | null;
  supportUrl?: string | null;
  primaryColor?: string | null;
};

export function getSettings(): Promise<WebSettings> {
  return apiClient<WebSettings>('/settings');
}

export function updateSettings(input: WebSettings): Promise<WebSettings> {
  return apiClient<WebSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
