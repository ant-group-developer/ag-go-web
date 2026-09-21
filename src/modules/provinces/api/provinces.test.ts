import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { importProvinces } from './provinces';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

describe('importProvinces', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({
      totalRows: 1,
      inserted: 1,
      failed: 0,
      errors: [],
    });
  });

  it('posts the selected CSV as multipart form data', async () => {
    const file = new File(['Country code,Tên,Code\nVN,Hà Nội,HN'], 'provinces.csv', {
      type: 'text/csv',
    });

    await expect(importProvinces(file)).resolves.toMatchObject({ inserted: 1, failed: 0 });

    const [path, init] = vi.mocked(apiClient).mock.calls[0];
    const body = init?.body as FormData;
    expect(path).toBe('/provinces/import');
    expect(init?.method).toBe('POST');
    expect(body).toBeInstanceOf(FormData);
    expect((body.get('file') as File).name).toBe('provinces.csv');
  });
});
