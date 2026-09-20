export type Folder = {
  id: string;
  parentId: string | null;
  name: string;
  pathText: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
};
