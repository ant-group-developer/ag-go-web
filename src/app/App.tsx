import { ProLayout, type ProLayoutProps } from '@ant-design/pro-components';
import { useTranslation } from 'react-i18next';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CatalogsPage } from '../modules/catalogs/pages/catalogs-page';
import { FoldersPage } from '../modules/folders/pages/folders-page';
import { ProjectsPage } from '../modules/projects/pages/projects-page';
import { HealthPage } from '../modules/system/pages/health-page';
import { HomePage } from '../modules/system/pages/home-page';

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const route: ProLayoutProps['route'] = {
    path: '/',
    routes: [
      {
        path: '/',
        name: t('menu.dashboard'),
      },
      {
        path: '/health',
        name: t('menu.health'),
      },
      {
        path: '/folders',
        name: t('menu.folders'),
      },
      {
        path: '/projects',
        name: t('menu.projects'),
      },
      {
        path: '/catalogs',
        name: t('menu.catalogs'),
      },
    ],
  };

  return (
    <ProLayout
      className="app-shell"
      title={t('app.title')}
      logo={false}
      layout="mix"
      fixSiderbar
      fixedHeader
      location={{ pathname: location.pathname }}
      route={route}
      menu={{ locale: false }}
      menuItemRender={(item, dom) => (item.path ? <Link to={item.path}>{dom}</Link> : dom)}
      onMenuHeaderClick={() => navigate('/')}
      contentStyle={{ padding: 24 }}
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/catalogs" element={<CatalogsPage />} />
      </Routes>
    </ProLayout>
  );
}
