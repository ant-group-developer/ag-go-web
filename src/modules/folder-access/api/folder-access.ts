import { apiClient } from '../../../shared/lib/api-client';
import type { FolderAccessUsersPage } from '../types/folder-access-users-page.type';
import type { FolderAccessUsersParams } from '../types/folder-access-users-params.type';
import type { FolderGrant } from '../types/folder-grant.type';
import type { FolderGrantsResult } from '../types/folder-grants-result.type';
import type { SetFolderGrantInput } from '../types/set-folder-grant-input.type';
import type { UserFolderGrant } from '../types/user-folder-grant.type';
import type { UserSearchResponse } from '../types/user-search-response.type';

export function searchUsers(keyword: string, page = 1, limit = 20): Promise<UserSearchResponse> {
  const params = new URLSearchParams({ keyword, page: String(page), limit: String(limit) });
  return apiClient<UserSearchResponse>(`/account/users/search?${params.toString()}`);
}

export function getFolderGrants(folderId: string): Promise<FolderGrantsResult> {
  return apiClient<FolderGrantsResult>(`/folders/${folderId}/access-grants`);
}

export function getUserGrants(userId: string): Promise<UserFolderGrant[]> {
  return apiClient<UserFolderGrant[]>(`/folder-access/users/${encodeURIComponent(userId)}/grants`);
}

export function setFolderGrant({
  folderId,
  principalId,
  ...body
}: SetFolderGrantInput): Promise<FolderGrant> {
  return apiClient<FolderGrant>(
    `/folders/${folderId}/access-grants/${encodeURIComponent(principalId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export function removeFolderGrant(
  folderId: string,
  principalId: string,
): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(
    `/folders/${folderId}/access-grants/${encodeURIComponent(principalId)}`,
    { method: 'DELETE' },
  );
}

export function getFolderAccessUsers(
  params: FolderAccessUsersParams,
): Promise<FolderAccessUsersPage> {
  const search = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.keyword) {
    search.set('keyword', params.keyword);
  }
  if (params.sortBy && params.sortOrder) {
    search.set('sortBy', params.sortBy);
    search.set('sortOrder', params.sortOrder);
  }
  return apiClient<FolderAccessUsersPage>(`/folder-access/users?${search.toString()}`);
}
