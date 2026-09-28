export type UpdateFolderInput = {
  name?: string;
  /** New parent folder; `null` moves the folder to the root, omitted keeps it in place. */
  parentId?: string | null;
  sortOrder?: number;
};
