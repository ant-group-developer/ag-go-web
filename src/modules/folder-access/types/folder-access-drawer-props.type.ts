export type FolderAccessDrawerProps = {
  folderId?: string;
  onClose: () => void;
  onOpenFolder: (folderId: string) => void;
};
