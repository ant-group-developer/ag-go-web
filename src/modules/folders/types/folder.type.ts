export type Folder = {
  id: string;
  parentId: string | null;
  name: string;
  pathText: string;
  pathIds?: string[];
  depth: number;
  sortOrder: number;
  isActive: boolean;
  childCount?: number;
  projectCount?: number;
  createdBy?: string;
  createdByUser?: {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};
