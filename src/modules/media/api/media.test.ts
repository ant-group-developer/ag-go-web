import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { getAssetPreviewUrl } from './media';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
  apiUrl: (path: string) => path,
}));

describe('getAssetPreviewUrl', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({
      url: 'https://r2.example.test/signed-preview',
    });
  });

  it('requests a presigned URL instead of downloading the asset through the API', async () => {
    await expect(getAssetPreviewUrl('asset-1', 'preview')).resolves.toBe(
      'https://r2.example.test/signed-preview',
    );
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-1/preview-url?variantCode=preview');
  });
});
