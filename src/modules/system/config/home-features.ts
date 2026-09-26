import {
  Activity,
  BarChart3,
  ClipboardCheck,
  Folder,
  FolderOpen,
  Globe,
  HeartPulse,
  List,
  MapPinned,
  ScrollText,
  Settings,
  Shield,
  Tags,
  User,
  type LucideIcon,
} from 'lucide-react';
import {
  CATEGORY_PAGE_PERMISSIONS,
  GO_PERMISSIONS,
  TAG_PAGE_PERMISSIONS,
  type GoPermission,
} from '../../../shared/auth/permissions';

export type HomeFeatureGroup = 'content' | 'catalogs' | 'system';

export type HomeFeature = {
  /** i18n suffix: title is `menu.<key>`, description is `home.features.<key>`. */
  key: string;
  path: string;
  icon: LucideIcon;
  group: HomeFeatureGroup;
  /** User needs at least one of these. Omit for features every signed-in user can open. */
  permission?: GoPermission | GoPermission[];
};

export const HOME_FEATURE_GROUPS: { key: HomeFeatureGroup; color: string }[] = [
  { key: 'content', color: '#1677ff' },
  { key: 'catalogs', color: '#13a8a8' },
  { key: 'system', color: '#722ed1' },
];

export const HOME_FEATURES: HomeFeature[] = [
  {
    key: 'projects',
    path: '/projects',
    icon: FolderOpen,
    group: 'content',
    permission: GO_PERMISSIONS.PROJECT_READ,
  },
  {
    key: 'myProjects',
    path: '/my-projects',
    icon: User,
    group: 'content',
    permission: GO_PERMISSIONS.PROJECT_READ,
  },
  {
    key: 'projectEvaluations',
    path: '/project-evaluations',
    icon: ClipboardCheck,
    group: 'content',
    permission: GO_PERMISSIONS.PROJECT_EVALUATE,
  },
  {
    key: 'statistics',
    path: '/statistics',
    icon: BarChart3,
    group: 'content',
    permission: GO_PERMISSIONS.STATISTICS_READ,
  },
  {
    key: 'folders',
    path: '/folders',
    icon: Folder,
    group: 'catalogs',
    permission: GO_PERMISSIONS.FOLDER_MANAGE,
  },
  {
    key: 'folderAccess',
    path: '/folder-access',
    icon: Shield,
    group: 'catalogs',
    permission: GO_PERMISSIONS.FOLDER_MANAGE,
  },
  {
    key: 'categories',
    path: '/catalogs/categories',
    icon: List,
    group: 'catalogs',
    permission: CATEGORY_PAGE_PERMISSIONS,
  },
  {
    key: 'countries',
    path: '/catalogs/countries',
    icon: Globe,
    group: 'catalogs',
    permission: GO_PERMISSIONS.CATALOG_MANAGE,
  },
  {
    key: 'provinces',
    path: '/catalogs/provinces',
    icon: MapPinned,
    group: 'catalogs',
    permission: GO_PERMISSIONS.CATALOG_MANAGE,
  },
  {
    key: 'tags',
    path: '/catalogs/tags',
    icon: Tags,
    group: 'catalogs',
    permission: TAG_PAGE_PERMISSIONS,
  },
  {
    key: 'settings',
    path: '/system/settings',
    icon: Settings,
    group: 'system',
    permission: GO_PERMISSIONS.SETTINGS_MANAGE,
  },
  {
    key: 'logs',
    path: '/system/logs',
    icon: ScrollText,
    group: 'system',
    permission: GO_PERMISSIONS.LOGS_READ,
  },
  {
    key: 'render',
    path: '/system/logs?tab=render',
    icon: Activity,
    group: 'system',
    permission: GO_PERMISSIONS.RENDER_READ,
  },
  {
    key: 'health',
    path: '/health',
    icon: HeartPulse,
    group: 'system',
  },
];
