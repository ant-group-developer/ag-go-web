import { apiClient } from '../../../shared/lib/api-client';

export type WebSettings = {
  siteName: string;
  siteDescription?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  supportEmail?: string | null;
  supportUrl?: string | null;
  primaryColor?: string | null;
};

export function getSettings(): Promise<WebSettings> {
  return apiClient<WebSettings>('/settings');
}

/** Public branding (name, logo, colours). Reachable before login, so no token is sent. */
export function getPublicSettings(): Promise<WebSettings> {
  return apiClient<WebSettings>('/settings/public', { auth: false });
}

export function updateSettings(input: WebSettings): Promise<WebSettings> {
  return apiClient<WebSettings>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
