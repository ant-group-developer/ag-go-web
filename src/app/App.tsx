import { ProLayout, type ProLayoutProps } from '@ant-design/pro-components';
import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  theme as antdTheme,
  Avatar,
  Button,
  Dropdown,
  Flex,
  MenuProps,
  Spin,
  Typography,
} from 'antd';
import {
  Activity,
  AppWindow,
  BarChart3,
  ClipboardCheck,
  Folder,
  FolderKanban,
  FolderOpen,
  Globe,
  LayoutDashboard,
  List,
  LogOut,
  MapPinned,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Tags,
  User,
  VideoIcon,
} from 'lucide-react';
import { Suspense, useEffect, useMemo } from 'react';
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
import { APP_LANGUAGES, changeLanguage, currentLanguage, LANGUAGE_NAMES } from '../i18n/language';
import { useAccountApplications } from '../modules/account/hooks/use-account-applications';
import { usePermissions } from '../modules/account/hooks/use-current-account';
import { usePublicSettings } from '../modules/settings/hooks/use-settings';
import { PermissionGate } from '../shared/auth/permission-gate';
import {
  CATEGORY_PAGE_PERMISSIONS,
  GO_PERMISSIONS,
  LOG_PAGE_PERMISSIONS,
  TAG_PAGE_PERMISSIONS,
} from '../shared/auth/permissions';
import { NotFoundResult } from '../shared/components/not-found-result';
import { lazyWithReload } from '../shared/lib/app-update';
import { useAppUpdate } from './use-app-update';

const CategoriesPage = lazyWithReload(() =>
  import('../modules/categories/pages/categories-page').then(({ CategoriesPage }) => ({
    default: CategoriesPage,
  })),
);
const CountriesPage = lazyWithReload(() =>
  import('../modules/countries/pages/countries-page').then(({ CountriesPage }) => ({
    default: CountriesPage,
  })),
);
const ProvincesPage = lazyWithReload(() =>
  import('../modules/provinces/pages/provinces-page').then(({ ProvincesPage }) => ({
    default: ProvincesPage,
  })),
);
const TagsPage = lazyWithReload(() =>
  import('../modules/tags/pages/tags-page').then(({ TagsPage }) => ({
    default: TagsPage,
  })),
);
const FoldersPage = lazyWithReload(() =>
  import('../modules/folders/pages/folders-page').then(({ FoldersPage }) => ({
    default: FoldersPage,
  })),
);
const UserAccessPage = lazyWithReload(() =>
  import('../modules/folder-access/pages/user-access-page').then(({ UserAccessPage }) => ({
    default: UserAccessPage,
  })),
);
const HealthPage = lazyWithReload(() =>
  import('../modules/system/pages/health-page').then(({ HealthPage }) => ({
    default: HealthPage,
  })),
);
const ProjectDetailPage = lazyWithReload(() =>
  import('../modules/projects/pages/project-detail-page').then(({ ProjectDetailPage }) => ({
    default: ProjectDetailPage,
  })),
);
const ProjectsPage = lazyWithReload(() =>
  import('../modules/projects/pages/projects-page').then(({ ProjectsPage }) => ({
    default: ProjectsPage,
  })),
);
const HomePage = lazyWithReload(() =>
  import('../modules/system/pages/home-page').then(({ HomePage }) => ({ default: HomePage })),
);
const StatisticsPage = lazyWithReload(() =>
  import('../modules/statistics/pages/statistics-page').then(({ StatisticsPage }) => ({
    default: StatisticsPage,
  })),
);
const AuditPage = lazyWithReload(() =>
  import('../modules/audit/pages/audit-page').then(({ AuditPage }) => ({
    default: AuditPage,
  })),
);
const SettingsPage = lazyWithReload(() =>
  import('../modules/settings/pages/settings-page').then(({ SettingsPage }) => ({
    default: SettingsPage,
  })),
);
const LogsPage = lazyWithReload(() =>
  import('../modules/logs/pages/logs-page').then(({ LogsPage }) => ({
    default: LogsPage,
  })),
);
const FootagePage = lazyWithReload(() =>
  import('../modules/footage/pages/footage-page').then(({ FootagePage }) => ({
    default: FootagePage,
  })),
);

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth0();
  const applications = useAccountApplications();
  const webSettings = usePublicSettings();
  // `can` is false until permissions load, so permission-gated menu items never flash.
  const { can, canAny, isAdmin, isLoading: isPermissionsLoading } = usePermissions();

  const { token } = antdTheme.useToken();
  useAppUpdate();

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
    const description = settings.siteDescription || 'AG Go media workspace';
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

  const language = currentLanguage();

  const avatarDropdownMenu: MenuProps = {
    // Only the language entries are selectable; the selection marks the active language.
    selectable: true,
    selectedKeys: [`language:${language}`],
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
        key: 'language',
        icon: <Globe size={14} />,
        label: `${t('common.language')}: ${LANGUAGE_NAMES[language]}`,
        children: APP_LANGUAGES.map((key) => ({
          key: `language:${key}`,
          label: LANGUAGE_NAMES[key],
          onClick: () => void changeLanguage(key),
        })),
      },
      {
        key: 'logout',
        icon: <LogOut size={14} />,
        label: t('menu.logout'),
        onClick: handleLogout,
        danger: true,
      },
    ],
  };

  const route: ProLayoutProps['route'] = {
    path: '/',
    routes: removeEmptyMenuGroups([
      {
        path: '/',
        name: t('menu.dashboard'),
        icon: <LayoutDashboard size={16} />,
      },
      ...(can(GO_PERMISSIONS.STATISTICS_READ)
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
          ...(isAdmin && can(GO_PERMISSIONS.PROJECT_READ)
            ? [
                {
                  path: '/all-projects',
                  name: t('menu.allProjects'),
                  icon: <FolderKanban size={16} />,
                },
              ]
            : []),
          ...(can(GO_PERMISSIONS.PROJECT_READ)
            ? [
                {
                  path: '/projects',
                  name: t('menu.projects'),
                  icon: <FolderOpen size={16} />,
                },
              ]
            : []),
          ...(can(GO_PERMISSIONS.PROJECT_EVALUATE)
            ? [
                {
                  path: '/project-evaluations',
                  name: t('menu.projectEvaluations'),
                  icon: <ClipboardCheck size={16} />,
                },
              ]
            : []),
          ...(can(GO_PERMISSIONS.PROJECT_READ)
            ? [
                {
                  path: '/my-projects',
                  name: t('menu.myProjects'),
                  icon: <User size={16} />,
                },
              ]
            : []),
          ...(can(GO_PERMISSIONS.FOOTAGE_SEARCH)
            ? [
                {
                  path: '/footage',
                  name: t('menu.footage'),
                  icon: <VideoIcon size={16} />,
                },
              ]
            : []),
        ],
      },
      ...(can(GO_PERMISSIONS.FOLDER_MANAGE) ||
      canAny(CATEGORY_PAGE_PERMISSIONS) ||
      canAny(TAG_PAGE_PERMISSIONS)
        ? [
            {
              path: '/common-catalogs',
              name: t('menu.commonCatalogs'),
              routes: [
                ...(can(GO_PERMISSIONS.FOLDER_MANAGE)
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
                ...(canAny(CATEGORY_PAGE_PERMISSIONS)
                  ? [
                      {
                        path: '/catalogs/categories',
                        name: t('menu.categories'),
                        icon: <List size={16} />,
                      },
                    ]
                  : []),
                ...(can(GO_PERMISSIONS.CATALOG_MANAGE)
                  ? [
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
                    ]
                  : []),
                ...(canAny(TAG_PAGE_PERMISSIONS)
                  ? [
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
          ...(can(GO_PERMISSIONS.SETTINGS_MANAGE)
            ? [
                {
                  path: '/system/settings',
                  name: t('menu.settings'),
                  icon: <Settings size={16} />,
                },
              ]
            : []),
          ...(canAny(LOG_PAGE_PERMISSIONS)
            ? [
                {
                  path: '/system/logs',
                  name: t('menu.logs'),
                  icon: <ScrollText size={16} />,
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
    ]),
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
      menu={{ locale: false, loading: isPermissionsLoading }}
      menuItemRender={(item, dom) => (item.path ? <Link to={item.path}>{dom}</Link> : dom)}
      onMenuHeaderClick={() => navigate('/')}
      contentStyle={{ padding: 24 }}
      // Global "create project" shortcut; `?create=true` opens the create modal on My Projects.
      actionsRender={() =>
        can(GO_PERMISSIONS.PROJECT_EDIT) && can(GO_PERMISSIONS.PROJECT_READ)
          ? [
              <Button
                key="create-project"
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => navigate('/my-projects?create=true')}
              >
                {t('projects.create')}
              </Button>,
            ]
          : []
      }
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
              <PermissionGate permissions={[GO_PERMISSIONS.STATISTICS_READ]}>
                <StatisticsPage />
              </PermissionGate>
            }
          />
          <Route path="/render" element={<Navigate to="/system/logs?tab=render" replace />} />
          <Route path="/google-drive/callback" element={<GoogleDriveCallbackRoute />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/downloads" element={<Navigate to="/projects" replace />} />
          <Route path="/google-drive" element={<Navigate to="/projects" replace />} />
          <Route
            path="/folders"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.FOLDER_MANAGE]}>
                <FoldersPage />
              </PermissionGate>
            }
          />
          <Route
            path="/folder-access"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.FOLDER_MANAGE]}>
                <UserAccessPage />
              </PermissionGate>
            }
          />
          <Route
            path="/all-projects"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.PROJECT_READ]} adminOnly>
                <ProjectsPage key="all" scope="all" />
              </PermissionGate>
            }
          />
          <Route
            path="/projects"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.PROJECT_READ]}>
                <ProjectsPage key="evaluated" scope="evaluated" />
              </PermissionGate>
            }
          />
          <Route
            path="/project-evaluations"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.PROJECT_EVALUATE]}>
                <ProjectsPage key="evaluation" scope="evaluation" />
              </PermissionGate>
            }
          />
          <Route
            path="/my-projects"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.PROJECT_READ]}>
                <ProjectsPage key="mine" scope="mine" />
              </PermissionGate>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.PROJECT_READ]}>
                <ProjectsPage key="evaluated" scope="evaluated" />
              </PermissionGate>
            }
          />
          <Route
            path="/projects/:projectId/edit"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.PROJECT_EDIT]}>
                <ProjectDetailPage />
              </PermissionGate>
            }
          />
          <Route
            path="/projects/:projectId/media"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.PROJECT_READ]}>
                <LegacyProjectMediaRedirect />
              </PermissionGate>
            }
          />
          <Route
            path="/projects/:projectId/audit"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.AUDIT_READ]}>
                <AuditPage />
              </PermissionGate>
            }
          />
          <Route path="/catalogs" element={<Navigate to="/catalogs/categories" replace />} />
          <Route
            path="/catalogs/overview"
            element={<Navigate to="/catalogs/categories" replace />}
          />
          <Route
            path="/catalogs/categories"
            element={
              <PermissionGate permissions={CATEGORY_PAGE_PERMISSIONS}>
                <CategoriesPage />
              </PermissionGate>
            }
          />
          <Route
            path="/catalogs/countries"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.CATALOG_MANAGE]}>
                <CountriesPage />
              </PermissionGate>
            }
          />
          <Route
            path="/catalogs/provinces"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.CATALOG_MANAGE]}>
                <ProvincesPage />
              </PermissionGate>
            }
          />
          <Route
            path="/catalogs/tags"
            element={
              <PermissionGate permissions={TAG_PAGE_PERMISSIONS}>
                <TagsPage />
              </PermissionGate>
            }
          />
          <Route
            path="/system/settings"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.SETTINGS_MANAGE]}>
                <SettingsPage />
              </PermissionGate>
            }
          />
          <Route
            path="/system/logs"
            element={
              <PermissionGate permissions={LOG_PAGE_PERMISSIONS}>
                <LogsPage />
              </PermissionGate>
            }
          />
          <Route
            path="/footage"
            element={
              <PermissionGate permissions={[GO_PERMISSIONS.FOOTAGE_SEARCH]}>
                <FootagePage />
              </PermissionGate>
            }
          />
          <Route path="*" element={<NotFoundResult />} />
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

/** Hides menu groups whose children were all filtered out by permissions. */
function removeEmptyMenuGroups<T extends { routes?: unknown[] }>(routes: T[]): T[] {
  return routes.filter((item) => !item.routes || item.routes.length > 0);
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
