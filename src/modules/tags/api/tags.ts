import { apiClient } from '../../../shared/lib/api-client';
import type { CreateTagInput } from '../types/create-tag-input.type';
import type { Tag } from '../types/tag.type';

export function getTags(): Promise<Tag[]> {
  return apiClient<Tag[]>('/tags');
}

export function createTag(input: CreateTagInput): Promise<Tag> {
  return apiClient<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
