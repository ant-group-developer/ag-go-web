import { Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AccessLevelSelectProps } from '../types/access-level-select-props.type';
import type { AccessLevel } from '../types/access-level.type';

const accessLevels: AccessLevel[] = ['viewer', 'editor', 'manager'];

export function AccessLevelSelect({
  value,
  onChange,
  disabled,
  size,
  style,
}: AccessLevelSelectProps) {
  const { t } = useTranslation();

  return (
    <Select<AccessLevel>
      value={value}
      onChange={onChange}
      disabled={disabled}
      size={size}
      style={{ minWidth: 130, ...style }}
      popupMatchSelectWidth={false}
      options={accessLevels.map((level) => ({
        value: level,
        label: t(`folderAccess.levels.${level}`),
      }))}
      optionRender={(option) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>
            {t(`folderAccess.levels.${option.value as AccessLevel}`)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t(`folderAccess.levelDescriptions.${option.value as AccessLevel}`)}
          </Typography.Text>
        </Space>
      )}
    />
  );
}
