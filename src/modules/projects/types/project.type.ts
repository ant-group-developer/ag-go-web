export type Project = {
  id: string;
  ownerUserId?: string;
  name: string;
  folderId: string;
  categoryId: string | null;
  countryId: string | null;
  provinceId: string | null;
  thumbnailProjectMediaId?: string | null;
  evaluationStatus: string;
  mediaCount: number;
  imageCount: number;
  videoCount: number;
  folderPath?: string;
  countryName?: string | null;
  countryFlagUrl?: string | null;
  provinceName?: string | null;
  categoryName?: string | null;
  thumbnailAssetId?: string | null;
  originalBytes?: string;
  renderedBytes?: string;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  tags?: string[];
  tagIds?: string[];
};

export type ProjectPage = {
  items: Project[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
