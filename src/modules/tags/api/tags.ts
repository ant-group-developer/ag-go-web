import { apiClient } from '../../../shared/lib/api-client';
import type { CreateTagInput } from '../types/create-tag-input.type';
import type { Tag } from '../types/tag.type';
import type { UpdateTagInput } from '../types/update-tag-input.type';

export function getTags(): Promise<Tag[]> {
  return apiClient<Tag[]>('/tags');
}

export function createTag(input: CreateTagInput): Promise<Tag> {
  return apiClient<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTag(id: string, input: UpdateTagInput): Promise<Tag> {
  return apiClient<Tag>(`/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteTag(id: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/tags/${id}`, { method: 'DELETE' });
}
