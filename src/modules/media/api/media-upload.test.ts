import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/lib/api-client';
import { uploadAssetContent, type UploadSession } from './media';

vi.mock('axios', () => ({
  default: { put: vi.fn(), isAxiosError: () => false },
}));
vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: vi.fn(),
  apiUrl: (path: string) => path,
  ApiError: class extends Error {},
}));

const PART_SIZE = 4;

function multipartSession(partCount: number): UploadSession {
  return {
    assetId: 'asset-1',
    uploadSessionId: 'session-1',
    uploadUrl: null,
    multipart: { partSize: PART_SIZE, partCount },
    expiresAt: '2030-01-01T00:00:00.000Z',
    status: 'initiated',
  };
}

/** Answers part URL requests with one URL per part number, counting how often each was asked. */
function servePartUrls() {
  vi.mocked(apiClient).mockImplementation(async (_path, init) => {
    const { partNumbers } = JSON.parse(String(init?.body)) as { partNumbers: number[] };
    return {
      parts: partNumbers.map((partNumber) => ({
        partNumber,
        url: `https://r2.test/part-${partNumber}`,
      })),
    };
  });
}

/** jsdom's Blob has no text(). */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function uploadedBytes(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [url, body] of vi.mocked(axios.put).mock.calls) {
    result[url] = await readBlob(body as Blob);
  }
  return result;
}

describe('uploadAssetContent with a multipart session', () => {
  beforeEach(() => {
    vi.mocked(axios.put).mockReset().mockResolvedValue({});
    vi.mocked(apiClient).mockReset();
    servePartUrls();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uploads each slice of the file to its own part URL', async () => {
    const file = new File(['aaaabbbbcc'], 'clip.mp4', { type: 'video/mp4' });
    const progress: number[] = [];

    await uploadAssetContent(multipartSession(3), file, (value) => progress.push(value));

    expect(await uploadedBytes()).toEqual({
      'https://r2.test/part-1': 'aaaa',
      'https://r2.test/part-2': 'bbbb',
      'https://r2.test/part-3': 'cc',
    });
    expect(apiClient).toHaveBeenCalledWith('/assets/asset-1/upload-parts', {
      method: 'POST',
      body: JSON.stringify({ uploadSessionId: 'session-1', partNumbers: [1, 2, 3] }),
    });
    expect(progress.at(-1)).toBe(100);
    expect(Math.max(...progress.slice(0, -1))).toBeLessThan(100);
  });

  it('requests part URLs in batches of 20', async () => {
    const file = new File(['x'.repeat(PART_SIZE * 45)], 'clip.mp4');

    await uploadAssetContent(multipartSession(45), file);

    const batches = vi
      .mocked(apiClient)
      .mock.calls.map(
        ([, init]) => (JSON.parse(String(init?.body)) as { partNumbers: number[] }).partNumbers,
      );
    expect(batches.map((numbers) => [numbers[0], numbers.at(-1)])).toEqual([
      [1, 20],
      [21, 40],
      [41, 45],
    ]);
    expect(axios.put).toHaveBeenCalledTimes(45);
  });

  it('retries a failed part with a fresh URL', async () => {
    vi.useFakeTimers();
    vi.mocked(axios.put).mockRejectedValueOnce(new Error('network')).mockResolvedValue({});
    const file = new File(['aaaa'], 'clip.mp4');

    const upload = uploadAssetContent(multipartSession(1), file);
    await vi.runAllTimersAsync();
    await upload;

    expect(axios.put).toHaveBeenCalledTimes(2);
    expect(apiClient).toHaveBeenCalledTimes(2);
  });

  it('gives up on a part after three attempts', async () => {
    vi.useFakeTimers();
    vi.mocked(axios.put).mockRejectedValue(new Error('network'));
    const file = new File(['aaaa'], 'clip.mp4');

    const upload = uploadAssetContent(multipartSession(1), file);
    const outcome = expect(upload).rejects.toThrow('network');
    await vi.runAllTimersAsync();
    await outcome;

    expect(axios.put).toHaveBeenCalledTimes(3);
  });
});
