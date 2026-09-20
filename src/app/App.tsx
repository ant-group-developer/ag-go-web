import { ProLayout, type ProLayoutProps } from '@ant-design/pro-components';
import { theme as antdTheme, Spin } from 'antd';
import {
  Activity,
  BarChart3,
  ClipboardCheck,
  Folder,
  FolderTree,
  Globe2,
  LayoutDashboard,
  List,
  MapPinned,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  User,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const CatalogItemPage = lazy(() =>
  import('../modules/catalogs/pages/catalog-item-page').then(({ CatalogItemPage }) => ({
    default: CatalogItemPage,
  })),
);
const CatalogsPage = lazy(() =>
  import('../modules/catalogs/pages/catalogs-page').then(({ CatalogsPage }) => ({
    default: CatalogsPage,
  })),
);
const FoldersPage = lazy(() =>
  import('../modules/folders/pages/folders-page').then(({ FoldersPage }) => ({
    default: FoldersPage,
  })),
);
const HealthPage = lazy(() =>
  import('../modules/system/pages/health-page').then(({ HealthPage }) => ({
    default: HealthPage,
  })),
);
const ProjectMediaPage = lazy(() =>
  import('../modules/media/pages/project-media-page').then(({ ProjectMediaPage }) => ({
    default: ProjectMediaPage,
  })),
);
const ProjectsPage = lazy(() =>
  import('../modules/projects/pages/projects-page').then(({ ProjectsPage }) => ({
    default: ProjectsPage,
  })),
);
const FeaturePlaceholderPage = lazy(() =>
  import('../modules/system/pages/feature-placeholder-page').then(({ FeaturePlaceholderPage }) => ({
    default: FeaturePlaceholderPage,
  })),
);
const HomePage = lazy(() =>
  import('../modules/system/pages/home-page').then(({ HomePage }) => ({ default: HomePage })),
);

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { token } = antdTheme.useToken();

  const route: ProLayoutProps['route'] = {
    path: '/',
    routes: [
      {
        path: '/',
        name: t('menu.dashboard'),
        icon: <LayoutDashboard size={16} />,
      },
      {
        path: '/statistics',
        name: t('menu.statistics'),
        icon: <BarChart3 size={16} />,
      },
      {
        path: '/content',
        name: t('menu.content'),
        routes: [
          {
            path: '/projects',
            name: t('menu.projects'),
            icon: <Folder size={16} />,
          },
          {
            path: '/project-evaluations',
            name: t('menu.projectEvaluations'),
            icon: <ClipboardCheck size={16} />,
          },
          {
            path: '/my-projects',
            name: t('menu.myProjects'),
            icon: <User size={16} />,
          },
        ],
      },
      {
        path: '/common-catalogs',
        name: t('menu.commonCatalogs'),
        routes: [
          {
            path: '/folders',
            name: t('menu.folders'),
            icon: <FolderTree size={16} />,
          },
          {
            path: '/catalogs/categories',
            name: t('menu.categories'),
            icon: <List size={16} />,
          },
          {
            path: '/catalogs/countries',
            name: t('menu.countries'),
            icon: <Globe2 size={16} />,
          },
          {
            path: '/catalogs/provinces',
            name: t('menu.provinces'),
            icon: <MapPinned size={16} />,
          },
          {
            path: '/catalogs/tags',
            name: t('menu.tags'),
            icon: <Tags size={16} />,
          },
        ],
      },
      {
        path: '/system',
        name: t('menu.system'),
        routes: [
          {
            path: '/system/permissions',
            name: t('menu.permissions'),
            icon: <ShieldCheck size={16} />,
          },
          {
            path: '/system/settings',
            name: t('menu.settings'),
            icon: <Settings size={16} />,
          },
          {
            path: '/system/logs',
            name: t('menu.logs'),
            icon: <ScrollText size={16} />,
          },
          {
            path: '/health',
            name: t('menu.health'),
            icon: <Activity size={16} />,
          },
        ],
      },
    ],
  };

  return (
    <ProLayout
      token={{
        header: {
          colorBgHeader: token.colorBgContainer,
        },
        sider: {
          colorTextMenuSelected: token.colorPrimary,
          colorBgMenuItemSelected: token.colorPrimaryBg,
        },
        bgLayout: token.colorBgLayout,
        // pageContainer: {
        //   paddingBlockPageContainerContent: screens.md ? 40 : 16,
        //   paddingInlinePageContainerContent: screens.md ? 40 : 16,
        // },
      }}
      className="app-shell"
      title={t('app.title')}
      logo={false}
      layout="mix"
      siderMenuType="group"
      fixSiderbar
      fixedHeader
      location={{ pathname: location.pathname }}
      route={route}
      menu={{ locale: false }}
      menuItemRender={(item, dom) => (item.path ? <Link to={item.path}>{dom}</Link> : dom)}
      onMenuHeaderClick={() => navigate('/')}
      contentStyle={{ padding: 24 }}
    >
      <Suspense fallback={<Spin fullscreen />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/statistics"
            element={
              <FeaturePlaceholderPage
                title={t('placeholder.statisticsTitle')}
                description={t('placeholder.statisticsDescription')}
              />
            }
          />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/folders" element={<FoldersPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/project-evaluations"
            element={
              <FeaturePlaceholderPage
                title={t('placeholder.projectEvaluationsTitle')}
                description={t('placeholder.projectEvaluationsDescription')}
              />
            }
          />
          <Route
            path="/my-projects"
            element={
              <FeaturePlaceholderPage
                title={t('placeholder.myProjectsTitle')}
                description={t('placeholder.myProjectsDescription')}
              />
            }
          />
          <Route path="/projects/:projectId/media" element={<ProjectMediaPage />} />
          <Route path="/catalogs" element={<Navigate to="/catalogs/categories" replace />} />
          <Route path="/catalogs/overview" element={<CatalogsPage />} />
          <Route path="/catalogs/categories" element={<CatalogItemPage resource="categories" />} />
          <Route path="/catalogs/countries" element={<CatalogItemPage resource="countries" />} />
          <Route path="/catalogs/provinces" element={<CatalogItemPage resource="provinces" />} />
          <Route path="/catalogs/tags" element={<CatalogItemPage resource="tags" />} />
          <Route
            path="/system/permissions"
            element={
              <FeaturePlaceholderPage
                title={t('placeholder.permissionsTitle')}
                description={t('placeholder.permissionsDescription')}
              />
            }
          />
          <Route
            path="/system/settings"
            element={
              <FeaturePlaceholderPage
                title={t('placeholder.settingsTitle')}
                description={t('placeholder.settingsDescription')}
              />
            }
          />
          <Route
            path="/system/logs"
            element={
              <FeaturePlaceholderPage
                title={t('placeholder.logsTitle')}
                description={t('placeholder.logsDescription')}
              />
            }
          />
        </Routes>
      </Suspense>
    </ProLayout>
  );
}
