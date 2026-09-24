import { LogoutOutlined } from '@ant-design/icons';
import { ProLayout, type ProLayoutProps } from '@ant-design/pro-components';
import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';
import { theme as antdTheme, Avatar, Dropdown, Flex, MenuProps, Spin, Typography } from 'antd';
import {
  Activity,
  AppWindow,
  BarChart3,
  ClipboardCheck,
  Folder,
  FolderOpen,
  Globe,
  LayoutDashboard,
  List,
  MapPinned,
  ScrollText,
  Settings,
  Shield,
  Tags,
  User,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useAccountApplications } from '../modules/account/hooks/use-account-applications';
import { useCurrentAccount } from '../modules/account/hooks/use-current-account';
import { usePublicSettings } from '../modules/settings/hooks/use-settings';
import { isAdminUserType } from '../shared/auth/user-type';

const CategoriesPage = lazy(() =>
  import('../modules/categories/pages/categories-page').then(({ CategoriesPage }) => ({
    default: CategoriesPage,
  })),
);
const CountriesPage = lazy(() =>
  import('../modules/countries/pages/countries-page').then(({ CountriesPage }) => ({
    default: CountriesPage,
  })),
);
const ProvincesPage = lazy(() =>
  import('../modules/provinces/pages/provinces-page').then(({ ProvincesPage }) => ({
    default: ProvincesPage,
  })),
);
const TagsPage = lazy(() =>
  import('../modules/tags/pages/tags-page').then(({ TagsPage }) => ({
    default: TagsPage,
  })),
);
const FoldersPage = lazy(() =>
  import('../modules/folders/pages/folders-page').then(({ FoldersPage }) => ({
    default: FoldersPage,
  })),
);
const UserAccessPage = lazy(() =>
  import('../modules/folder-access/pages/user-access-page').then(({ UserAccessPage }) => ({
    default: UserAccessPage,
  })),
);
const HealthPage = lazy(() =>
  import('../modules/system/pages/health-page').then(({ HealthPage }) => ({
    default: HealthPage,
  })),
);
const ProjectDetailPage = lazy(() =>
  import('../modules/projects/pages/project-detail-page').then(({ ProjectDetailPage }) => ({
    default: ProjectDetailPage,
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
const StatisticsPage = lazy(() =>
  import('../modules/statistics/pages/statistics-page').then(({ StatisticsPage }) => ({
    default: StatisticsPage,
  })),
);
const RenderPage = lazy(() =>
  import('../modules/render/pages/render-page').then(({ RenderPage }) => ({
    default: RenderPage,
  })),
);
const AuditPage = lazy(() =>
  import('../modules/audit/pages/audit-page').then(({ AuditPage }) => ({
    default: AuditPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../modules/settings/pages/settings-page').then(({ SettingsPage }) => ({
    default: SettingsPage,
  })),
);
const LogsPage = lazy(() =>
  import('../modules/logs/pages/logs-page').then(({ LogsPage }) => ({
    default: LogsPage,
  })),
);

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth0();
  const applications = useAccountApplications();
  const webSettings = usePublicSettings();
  const currentAccount = useCurrentAccount();
  const hasPermission = (permission: string) =>
    currentAccount.isLoading
      ? true
      : isAdminUserType(currentAccount.data?.user_type) ||
        currentAccount.data?.permissions.includes(permission) ||
        false;

  const { token } = antdTheme.useToken();

  const handleLogout = () => {
    void logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const userEmail = user?.email ?? '';
  const userInitials = userEmail.slice(0, 2).toUpperCase();
  const nickname = user?.name ?? '';
  const avatarUrl = user?.picture ?? '';

  useEffect(() => {
    const settings = webSettings.data;
    if (!settings) {
      return;
    }

    const siteName = settings.siteName || 'AG Go';
    const description = settings.siteDescription || 'AG Go internal media workspace';
    document.title = siteName;
    setMetaContent('description', description);
    setMetaContent('og:title', siteName, 'property');
    setMetaContent('og:description', description, 'property');
    setMetaContent('og:image', settings.logoUrl ?? '', 'property');
    setMetaContent('twitter:card', settings.logoUrl ? 'summary_large_image' : 'summary');

    const faviconUrl = settings.faviconUrl || settings.logoUrl;
    if (faviconUrl) {
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = faviconUrl;
    }
  }, [webSettings.data]);
  const appList = useMemo<NonNullable<ProLayoutProps['appList']>>(
    () =>
      (applications.data ?? []).map((application) => ({
        title: application.name,
        desc: application.description,
        icon: application.logo ? (
          <img
            src={application.logo}
            alt=""
            style={{ width: 46, height: 46, objectFit: 'contain', borderRadius: 6 }}
          />
        ) : (
          <AppWindow size={46} />
        ),
        url: application.website ?? undefined,
        target: application.website ? '_blank' : undefined,
      })),
    [applications.data],
  );

  const avatarDropdownMenu: MenuProps = {
    items: [
      {
        key: 'user',
        label: (
          <Flex gap={12} align="center">
            <Avatar
              src={avatarUrl}
              size={40}
              style={{
                backgroundColor: token.colorPrimary,
                flexShrink: 0,
              }}
            >
              {userInitials}
            </Avatar>

            <Flex vertical style={{ minWidth: 0 }}>
              <Typography.Text strong ellipsis>
                {nickname}
              </Typography.Text>

              <Typography.Text type="secondary" ellipsis>
                {userEmail}
              </Typography.Text>
            </Flex>
          </Flex>
        ),
        disabled: true,
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: t('menu.logout'),
        onClick: handleLogout,
        danger: true,
      },
    ],
  };

  const route: ProLayoutProps['route'] = {
    path: '/',
    routes: [
      {
        path: '/',
        name: t('menu.dashboard'),
        icon: <LayoutDashboard size={16} />,
      },
      ...(hasPermission('go.statistics.read')
        ? [
            {
              path: '/statistics',
              name: t('menu.statistics'),
              icon: <BarChart3 size={16} />,
            },
          ]
        : []),
      {
        path: '/content',
        name: t('menu.content'),
        routes: [
          ...(hasPermission('go.project.read')
            ? [
                {
                  path: '/projects',
                  name: t('menu.projects'),
                  icon: <FolderOpen size={16} />,
                },
              ]
            : []),
          ...(hasPermission('go.project.evaluate')
            ? [
                {
                  path: '/project-evaluations',
                  name: t('menu.projectEvaluations'),
                  icon: <ClipboardCheck size={16} />,
                },
              ]
            : []),
          ...(hasPermission('go.project.read')
            ? [
                {
                  path: '/my-projects',
                  name: t('menu.myProjects'),
                  icon: <User size={16} />,
                },
              ]
            : []),
        ],
      },
      ...(hasPermission('go.folder.manage') || hasPermission('go.catalog.manage')
        ? [
            {
              path: '/common-catalogs',
              name: t('menu.commonCatalogs'),
              routes: [
                ...(hasPermission('go.folder.manage')
                  ? [
                      {
                        path: '/folders',
                        name: t('menu.folders'),
                        icon: <Folder size={16} />,
                      },
                      {
                        path: '/folder-access',
                        name: t('menu.folderAccess'),
                        icon: <Shield size={16} />,
                      },
                    ]
                  : []),
                ...(hasPermission('go.catalog.manage')
                  ? [
                      {
                        path: '/catalogs/categories',
                        name: t('menu.categories'),
                        icon: <List size={16} />,
                      },
                      {
                        path: '/catalogs/countries',
                        name: t('menu.countries'),
                        icon: <Globe size={16} />,
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
                    ]
                  : []),
              ],
            },
          ]
        : []),
      {
        path: '/system',
        name: t('menu.system'),
        routes: [
          ...(hasPermission('go.settings.manage')
            ? [
                {
                  path: '/system/settings',
                  name: t('menu.settings'),
                  icon: <Settings size={16} />,
                },
              ]
            : []),
          ...(hasPermission('go.logs.read')
            ? [
                {
                  path: '/system/logs',
                  name: t('menu.logs'),
                  icon: <ScrollText size={16} />,
                },
              ]
            : []),
          ...(hasPermission('go.render.read')
            ? [
                {
                  path: '/render',
                  name: t('menu.render'),
                  icon: <Activity size={16} />,
                },
              ]
            : []),
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
        // header: {
        //   colorBgHeader: token.colorBgContainer,
        // },
        sider: {
          colorTextMenuSelected: token.colorPrimary,
          colorBgMenuItemSelected: token.colorPrimaryBg,
        },
        // bgLayout: token.colorBgLayout,
        // pageContainer: {
        //   paddingBlockPageContainerContent: screens.md ? 40 : 16,
        //   paddingInlinePageContainerContent: screens.md ? 40 : 16,
        // },
      }}
      siderWidth={220}
      className="app-shell"
      appList={appList}
      title={webSettings.data?.siteName ?? t('app.title')}
      logo={
        webSettings.data?.logoUrl ? (
          <img
            src={webSettings.data.logoUrl}
            alt={webSettings.data.siteName ?? t('app.title')}
            style={{ maxHeight: 32, maxWidth: 120, objectFit: 'contain' }}
          />
        ) : (
          false
        )
      }
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
      avatarProps={{
        src: user?.picture,
        size: 'small',
        style: { backgroundColor: token.colorPrimary },
        children: !user?.picture ? userInitials : undefined,
        title: <span style={{ fontSize: 14, fontWeight: 500 }}>{nickname}</span>,
        render: (_props, dom) => (
          <Dropdown
            menu={avatarDropdownMenu}
            trigger={['click']}
            placement="bottomRight"
            className="user-dropdown"
          >
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {dom}
            </span>
          </Dropdown>
        ),
      }}
    >
      <Suspense fallback={<Spin fullscreen />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/statistics"
            element={
              <PermissionGate permissions={['go.statistics.read']}>
                <StatisticsPage />
              </PermissionGate>
            }
          />
          <Route
            path="/render"
            element={
              <PermissionGate permissions={['go.render.read']}>
                <RenderPage />
              </PermissionGate>
            }
          />
          <Route path="/google-drive/callback" element={<GoogleDriveCallbackRoute />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/downloads" element={<Navigate to="/projects" replace />} />
          <Route path="/google-drive" element={<Navigate to="/projects" replace />} />
          <Route path="/folders" element={<FoldersPage />} />
          <Route
            path="/folder-access"
            element={
              <PermissionGate permissions={['go.folder.manage']}>
                <UserAccessPage />
              </PermissionGate>
            }
          />
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
          <Route path="/projects/:projectId" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/edit" element={<ProjectDetailPage />} />
          <Route path="/projects/:projectId/media" element={<LegacyProjectMediaRedirect />} />
          <Route path="/projects/:projectId/audit" element={<AuditPage />} />
          <Route path="/catalogs" element={<Navigate to="/catalogs/categories" replace />} />
          <Route
            path="/catalogs/overview"
            element={<Navigate to="/catalogs/categories" replace />}
          />
          <Route path="/catalogs/categories" element={<CategoriesPage />} />
          <Route path="/catalogs/countries" element={<CountriesPage />} />
          <Route path="/catalogs/provinces" element={<ProvincesPage />} />
          <Route path="/catalogs/tags" element={<TagsPage />} />
          <Route
            path="/system/settings"
            element={
              <PermissionGate permissions={['go.settings.manage']}>
                <SettingsPage />
              </PermissionGate>
            }
          />
          <Route
            path="/system/logs"
            element={
              <PermissionGate permissions={['go.logs.read']}>
                <LogsPage />
              </PermissionGate>
            }
          />
        </Routes>
      </Suspense>
    </ProLayout>
  );
}

function setMetaContent(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function PermissionGate({ permissions, children }: { permissions: string[]; children: ReactNode }) {
  const account = useCurrentAccount();
  if (account.isLoading) {
    return <Spin fullscreen />;
  }
  if (
    !account.data ||
    (!isAdminUserType(account.data.user_type) &&
      !permissions.some((permission) => account.data.permissions.includes(permission)))
  ) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function GoogleDriveCallbackRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['google-drive', 'connection'] });
    navigate(projectId ? `/projects/${projectId}/edit` : '/projects', {
      replace: true,
      state: { googleDriveStatus: status },
    });
  }, [navigate, projectId, queryClient, status]);

  return <Spin fullscreen />;
}

function LegacyProjectMediaRedirect() {
  const { projectId = '' } = useParams();
  return <Navigate to={`/projects/${projectId}`} replace />;
}
