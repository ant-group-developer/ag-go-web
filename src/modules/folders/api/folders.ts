import { apiClient } from '../../../shared/lib/api-client';
import type { CreateFolderInput } from '../types/create-folder-input.type';
import type { Folder } from '../types/folder.type';

export function getFolders(): Promise<Folder[]> {
  return apiClient<Folder[]>('/folders/tree');
}

export function createFolder(input: CreateFolderInput): Promise<Folder> {
  return apiClient<Folder>('/folders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
