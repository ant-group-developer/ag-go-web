export type Folder = {
  id: string;
  parentId: string | null;
  name: string;
  pathText: string;
  pathIds?: string[];
  depth: number;
  sortOrder: number;
  isActive: boolean;
};
