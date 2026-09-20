import type { UploadFile } from 'antd';
import type { ProjectFormValues } from './project-form-values.type';

export type ProjectDetailFormValues = ProjectFormValues & {
  thumbnail?: UploadFile[];
};
