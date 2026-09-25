import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { createTag, deleteTag, updateTag } from './tags';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

describe('createTag', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({ id: 'tag-id', name: 'Du lịch' });
  });

  it('posts the tag input', async () => {
    const input = { name: 'Du lịch' };

    await expect(createTag(input)).resolves.toMatchObject({ id: 'tag-id' });
    expect(apiClient).toHaveBeenCalledWith('/tags', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });
});

describe('updateTag / deleteTag', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({});
  });

  it('patches the tag by id', async () => {
    await updateTag('tag-id', { name: 'Ẩm thực' });
    expect(apiClient).toHaveBeenCalledWith('/tags/tag-id', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Ẩm thực' }),
    });
  });

  it('deletes the tag by id', async () => {
    await deleteTag('tag-id');
    expect(apiClient).toHaveBeenCalledWith('/tags/tag-id', { method: 'DELETE' });
  });
});
