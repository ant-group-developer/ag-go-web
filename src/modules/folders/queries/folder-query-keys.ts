export const folderQueryKeys = {
  all: () => ['folders'] as const,
  tree: () => [...folderQueryKeys.all(), 'tree'] as const,
};
