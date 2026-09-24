import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function ForbiddenResult() {
  const { t } = useTranslation();

  return (
    <Result
      status="403"
      title={t('common.forbiddenTitle')}
      subTitle={t('common.forbiddenDescription')}
      extra={
        <Link to="/">
          <Button type="primary">{t('common.backHome')}</Button>
        </Link>
      }
    />
  );
}
