import type { Project } from './project.type';

export type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (project: Project) => void;
};
