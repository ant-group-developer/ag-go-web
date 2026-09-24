import { apiClient } from '../../../shared/lib/api-client';
import type { Category } from '../types/category.type';
import type { CreateCategoryInput } from '../types/create-category-input.type';
import type { UpdateCategoryInput } from '../types/update-category-input.type';

export function getCategories(): Promise<Category[]> {
  return apiClient<Category[]>('/categories');
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return apiClient<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  return apiClient<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteCategory(id: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' });
}
