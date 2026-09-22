import { apiClient } from '../../../shared/lib/api-client';

export type AccountUser = {
  id: string;
  name?: string;
  email?: string;
  department?: string | null;
  phone_number?: string | null;
  birthday?: string | null;
  avatar?: string | null;
  is_active?: boolean;
  email_verified?: boolean;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type AccountApplication = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  website?: string | null;
  logo?: string | null;
  visibility?: string;
  is_active?: boolean;
};

export function getCurrentAccountUser(fields?: string): Promise<AccountUser> {
  const query = fields ? `?fields=${encodeURIComponent(fields)}` : '';
  return apiClient<AccountUser>(`/account/me${query}`);
}

export function getAccountApplications(): Promise<AccountApplication[]> {
  return apiClient<AccountApplication[]>('/account/applications');
}
