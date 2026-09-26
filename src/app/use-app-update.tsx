import { App as AntApp, Button } from 'antd';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { fetchDeployedBuildId } from '../shared/lib/app-update';

const CHECK_INTERVAL_MS = 60_000;
const NOTIFICATION_KEY = 'app-update';

/**
 * Watches `/version.json` for a newer deploy. Once one is out, it offers a reload and reloads by
 * itself on the next route change, so users never run old code against deleted chunks.
 */
export function useAppUpdate() {
  const { t } = useTranslation();
  const { notification } = AntApp.useApp();
  const location = useLocation();
  const updateReady = useRef(false);
  const currentPath = useRef(location.pathname);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }
    let stopped = false;

    const check = async () => {
      if (updateReady.current || document.visibilityState !== 'visible') {
        return;
      }
      const deployedBuildId = await fetchDeployedBuildId();
      if (stopped || !deployedBuildId || deployedBuildId === __APP_BUILD_ID__) {
        return;
      }
      updateReady.current = true;
      notification.info({
        key: NOTIFICATION_KEY,
        message: t('appUpdate.title'),
        description: t('appUpdate.description'),
        duration: 0,
        placement: 'bottomRight',
        actions: (
          <Button type="primary" size="small" onClick={() => window.location.reload()}>
            {t('appUpdate.reload')}
          </Button>
        ),
      });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };
    void check();
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [notification, t]);

  // Moving to another page is a safe moment to swap in the new build: nothing is being edited.
  useEffect(() => {
    if (location.pathname === currentPath.current) {
      return;
    }
    currentPath.current = location.pathname;
    if (updateReady.current) {
      window.location.reload();
    }
  }, [location.pathname]);
}
