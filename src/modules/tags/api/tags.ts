import { apiClient } from '../../../shared/lib/api-client';
import type { Tag } from '../types/tag.type';

export function getTags(): Promise<Tag[]> {
  return apiClient<Tag[]>('/tags');
}
