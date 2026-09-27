import { describe, expect, it } from 'vitest';
import type { ProjectMedia } from '../api/media';
import { sortProjectMedia } from './sort-project-media';

function media(
  id: string,
  filename: string,
  createdAt: string,
  updatedAt: string,
  modifiedAt?: string | null,
): ProjectMedia {
  return {
    id,
    createdAt,
    updatedAt,
    modifiedAt,
    asset: { originalFilename: filename },
  } as ProjectMedia;
}

const items = [
  media('a', 'IMG 10.jpg', '2026-09-02T00:00:00Z', '2026-09-05T00:00:00Z'),
  media('b', 'img 2.jpg', '2026-09-03T00:00:00Z', '2026-09-03T00:00:00Z', '2026-09-01T00:00:00Z'),
  media('c', 'Ảnh bìa.png', '2026-09-01T00:00:00Z', '2026-09-04T00:00:00Z'),
];

const ids = (list: ProjectMedia[]) => list.map((item) => item.id);

describe('sortProjectMedia', () => {
  it('sorts by file name naturally', () => {
    expect(ids(sortProjectMedia(items, { sortBy: 'name', sortOrder: 'asc' }))).toEqual([
      'c',
      'b',
      'a',
    ]);
    expect(ids(sortProjectMedia(items, { sortBy: 'name', sortOrder: 'desc' }))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('sorts by created date', () => {
    expect(ids(sortProjectMedia(items, { sortBy: 'createdAt', sortOrder: 'desc' }))).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('sorts by the file modified date, falling back to updatedAt', () => {
    expect(ids(sortProjectMedia(items, { sortBy: 'modifiedAt', sortOrder: 'desc' }))).toEqual([
      'a',
      'c',
      'b',
    ]);
    expect(ids(sortProjectMedia(items, { sortBy: 'modifiedAt', sortOrder: 'asc' }))).toEqual([
      'b',
      'c',
      'a',
    ]);
  });
});
