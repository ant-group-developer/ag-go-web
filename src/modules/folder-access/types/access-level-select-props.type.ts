import type { AccessLevel } from './access-level.type';

export type AccessLevelSelectProps = {
  value?: AccessLevel;
  onChange?: (value: AccessLevel) => void;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
};
