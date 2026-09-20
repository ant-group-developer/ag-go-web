export type CreateProjectInput = {
  folderId: string;
  name: string;
  description?: string;
  categoryId?: string;
  countryId?: string;
  provinceId?: string;
  tags?: string[];
};
