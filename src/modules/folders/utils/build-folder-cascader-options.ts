import type { FolderCascaderOption } from '../types/folder-cascader-option.type';
import type { Folder } from '../types/folder.type';

export function buildFolderCascaderOptions(folders: Folder[]): FolderCascaderOption[] {
  const options = new Map<string, FolderCascaderOption>();

  for (const folder of folders) {
    options.set(folder.id, {
      value: folder.id,
      label: folder.name,
    });
  }

  const roots: FolderCascaderOption[] = [];

  for (const folder of folders) {
    const option = options.get(folder.id);
    if (!option) {
      continue;
    }

    if (!folder.parentId) {
      roots.push(option);
      continue;
    }

    const parent = options.get(folder.parentId);
    if (parent) {
      parent.children ??= [];
      parent.children.push(option);
    } else {
      roots.push(option);
    }
  }

  return roots;
}

/** Maps each option value to its path within the given options tree (from the visible root). */
export function buildFolderOptionPaths(options: FolderCascaderOption[]): Map<string, string[]> {
  const paths = new Map<string, string[]>();
  const visit = (items: FolderCascaderOption[], parentPath: string[]) => {
    for (const item of items) {
      const path = [...parentPath, item.value];
      paths.set(item.value, path);
      if (item.children) {
        visit(item.children, path);
      }
    }
  };
  visit(options, []);
  return paths;
}
