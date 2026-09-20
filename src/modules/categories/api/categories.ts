import { apiClient } from '../../../shared/lib/api-client';
import type { Category } from '../types/category.type';

export function getCategories(): Promise<Category[]> {
  return apiClient<Category[]>('/categories');
}
