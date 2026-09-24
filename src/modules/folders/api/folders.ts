import { apiClient } from '../../../shared/lib/api-client';
import type { CreateFolderInput } from '../types/create-folder-input.type';
import type { Folder } from '../types/folder.type';
import type { UpdateFolderInput } from '../types/update-folder-input.type';

export function getFolders(): Promise<Folder[]> {
  return apiClient<Folder[]>('/folders/tree');
}

export function createFolder(input: CreateFolderInput): Promise<Folder> {
  return apiClient<Folder>('/folders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateFolder(id: string, input: UpdateFolderInput): Promise<Folder> {
  return apiClient<Folder>(`/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteFolder(id: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/folders/${id}`, { method: 'DELETE' });
}
