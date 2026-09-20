export type UpdateProjectInput = {
  folderId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  countryId: string | null;
  provinceId: string | null;
  tags: string[];
};
