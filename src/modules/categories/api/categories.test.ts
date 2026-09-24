import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { createCategory, deleteCategory, updateCategory } from './categories';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

describe('createCategory', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({ id: 'category-id', name: 'Tin tức', slug: 'tin-tuc' });
  });

  it('posts the category input', async () => {
    const input = {
      name: 'Tin tức',
      slug: 'tin-tuc',
      description: 'Danh mục tin tức',
      sortOrder: 1,
    };

    await expect(createCategory(input)).resolves.toMatchObject({ id: 'category-id' });
    expect(apiClient).toHaveBeenCalledWith('/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });
});

describe('updateCategory / deleteCategory', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({});
  });

  it('patches the category by id', async () => {
    const input = { name: 'Sự kiện', slug: 'su-kien', description: null };

    await updateCategory('category-id', input);
    expect(apiClient).toHaveBeenCalledWith('/categories/category-id', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  });

  it('deletes the category by id', async () => {
    await deleteCategory('category-id');
    expect(apiClient).toHaveBeenCalledWith('/categories/category-id', { method: 'DELETE' });
  });
});
