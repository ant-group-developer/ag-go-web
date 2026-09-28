import { describe, expect, it } from 'vitest';
import type { Folder } from '../types/folder.type';
import {
  buildFolderCascaderOptions,
  buildFolderOptionPaths,
} from './build-folder-cascader-options';

function folder(id: string, parentId: string | null, name: string): Folder {
  return {
    id,
    parentId,
    name,
    pathText: name,
    depth: 0,
    sortOrder: 0,
    isActive: true,
  };
}

describe('buildFolderOptionPaths', () => {
  it('maps each folder to its path from the visible root', () => {
    const options = buildFolderCascaderOptions([
      folder('a', null, 'Test'),
      folder('b', 'a', 'Test 1'),
      folder('c', 'b', 'Test 1.1'),
    ]);

    const paths = buildFolderOptionPaths(options);

    expect(paths.get('a')).toEqual(['a']);
    expect(paths.get('b')).toEqual(['a', 'b']);
    expect(paths.get('c')).toEqual(['a', 'b', 'c']);
  });

  it('anchors paths at an accessible subfolder when its ancestors are not visible', () => {
    // User only has access to "Test 1.1" and its child; "Test" / "Test 1" are not returned.
    const options = buildFolderCascaderOptions([
      folder('c', 'b', 'Test 1.1'),
      folder('d', 'c', 'Test 1.1.1'),
    ]);

    const paths = buildFolderOptionPaths(options);

    expect(paths.get('c')).toEqual(['c']);
    expect(paths.get('d')).toEqual(['c', 'd']);
    expect(paths.has('a')).toBe(false);
  });
});
