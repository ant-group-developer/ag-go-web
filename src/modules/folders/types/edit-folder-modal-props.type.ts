import type { Folder } from './folder.type';

export type EditFolderModalProps = {
  folder?: Folder;
  onClose: () => void;
};
