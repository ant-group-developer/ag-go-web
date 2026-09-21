import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { importCountries } from './countries';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

describe('importCountries', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue({
      totalRows: 1,
      inserted: 1,
      failed: 0,
      errors: [],
    });
  });

  it('posts the selected CSV as multipart form data', async () => {
    const file = new File(['Tên quốc gia,Code,Flag\nViệt Nam,VN,'], 'countries.csv', {
      type: 'text/csv',
    });

    await expect(importCountries(file)).resolves.toMatchObject({ inserted: 1, failed: 0 });

    const [path, init] = vi.mocked(apiClient).mock.calls[0];
    const body = init?.body as FormData;
    expect(path).toBe('/countries/import');
    expect(init?.method).toBe('POST');
    expect(body).toBeInstanceOf(FormData);
    expect((body.get('file') as File).name).toBe('countries.csv');
  });
});
