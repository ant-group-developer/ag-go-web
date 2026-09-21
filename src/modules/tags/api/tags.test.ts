import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { createTag } from './tags';

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
