import { Button, Result } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function NotFoundResult() {
  const { t } = useTranslation();

  return (
    <Result
      status="404"
      title={t('common.notFoundTitle')}
      subTitle={t('common.notFoundDescription')}
      extra={
        <Link to="/">
          <Button type="primary">{t('common.backHome')}</Button>
        </Link>
      }
    />
  );
}
