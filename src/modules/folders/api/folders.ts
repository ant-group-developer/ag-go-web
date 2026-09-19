import { apiClient } from '../../../shared/lib/api-client';

export type Folder = {
  id: string;
  parentId: string | null;
  name: string;
  pathText: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
};

export function getFolders(): Promise<Folder[]> {
  return apiClient<Folder[]>('/folders/tree');
}
