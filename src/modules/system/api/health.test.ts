import { describe, expect, it, vi } from 'vitest';
import { getHealth } from './health';

describe('getHealth', () => {
  it('requests the health endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'ok',
            service: 'ag-go-api',
            timestamp: '2026-09-19T00:00:00.000Z',
            uptime: 1,
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(getHealth()).resolves.toMatchObject({
      status: 'ok',
      service: 'ag-go-api',
    });
  });
});
