import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { createCategory } from './categories';

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
