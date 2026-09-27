import type { GlobalToken } from 'antd';
import type { ProjectEvaluationStatus } from '../../projects/types/project-list-params.type';

/**
 * Media evaluation colors (antd green6 / red6 / orange6), in the order they are stacked. Checked
 * with the dataviz palette validator: adjacent pairs stay apart for colour-blind readers
 * (deutan ΔE 9.0). Green and orange are light on white, so every use also shows the numbers
 * (legend, tooltip or label).
 */
export const EVALUATION_COLORS = {
  approved: '#52c41a',
  rejected: '#f5222d',
  pending: '#fa8c16',
} as const;

export type EvaluationKey = keyof typeof EVALUATION_COLORS;
export const EVALUATION_KEYS: EvaluationKey[] = ['approved', 'rejected', 'pending'];

/** Media added per bucket in the trend chart. */
export const ADDED_MEDIA_COLOR = '#1677ff';

/** Project statuses keep the colors of their status tags elsewhere in the app. */
export function projectStatusColor(status: ProjectEvaluationStatus, token: GlobalToken): string {
  switch (status) {
    case 'draft':
      return token.colorTextQuaternary;
    case 'pending':
      return token.colorPrimary;
    case 'completed':
      return token.colorSuccess;
    case 'partially_completed':
      return token.colorWarning;
    case 'failed':
      return token.colorError;
  }
}
