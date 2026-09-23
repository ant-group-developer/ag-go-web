import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { getAccountApplications } from './account';

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

describe('getAccountApplications', () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockResolvedValue([{ id: 'app-id', name: 'AG Go', code: 'AG_GO' }]);
  });

  it('gets applications through ag-go-api', async () => {
    await expect(getAccountApplications()).resolves.toEqual([
      { id: 'app-id', name: 'AG Go', code: 'AG_GO' },
    ]);
    expect(apiClient).toHaveBeenCalledWith('/account/applications');
  });
});
