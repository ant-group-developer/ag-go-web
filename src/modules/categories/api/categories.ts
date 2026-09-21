import { apiClient } from '../../../shared/lib/api-client';
import type { Category } from '../types/category.type';
import type { CreateCategoryInput } from '../types/create-category-input.type';

export function getCategories(): Promise<Category[]> {
  return apiClient<Category[]>('/categories');
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return apiClient<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
