import type { Folder } from './folder.type';

export type CreateFolderModalProps = {
  open: boolean;
  onClose: () => void;
  defaultParentPath?: string[];
  /** Called with the created folder after a successful create. */
  onCreated?: (folder: Folder) => void;
};
