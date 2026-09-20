export type Project = {
  id: string;
  name: string;
  folderId: string;
  categoryId: string | null;
  countryId: string | null;
  provinceId: string | null;
  thumbnailProjectMediaId?: string | null;
  evaluationStatus: string;
  mediaCount: number;
  description: string | null;
  tags?: string[];
  tagIds?: string[];
};

export type ProjectPage = {
  items: Project[];
  nextCursor: string | null;
};
