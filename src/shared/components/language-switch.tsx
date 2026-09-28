import { Button, Dropdown } from 'antd';
import { Languages } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  APP_LANGUAGES,
  type AppLanguage,
  changeLanguage,
  currentLanguage,
  LANGUAGE_NAMES,
} from '../../i18n/language';

type LanguageSwitchProps = {
  className?: string;
  style?: CSSProperties;
};

/** Vietnamese / English toggle; the choice is kept in localStorage. */
export function LanguageSwitch({ className, style }: LanguageSwitchProps) {
  const { t } = useTranslation();
  const language = currentLanguage();

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      menu={{
        selectable: true,
        selectedKeys: [language],
        items: APP_LANGUAGES.map((key) => ({ key, label: LANGUAGE_NAMES[key] })),
        onClick: ({ key }) => void changeLanguage(key as AppLanguage),
      }}
    >
      <Button
        type="text"
        className={className}
        style={style}
        icon={<Languages size={16} />}
        aria-label={t('common.language')}
        title={t('common.language')}
      >
        {language.toUpperCase()}
      </Button>
    </Dropdown>
  );
}
