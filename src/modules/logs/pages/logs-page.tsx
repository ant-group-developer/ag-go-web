import { PageContainer } from '@ant-design/pro-components';
import { Tabs, type TabsProps } from 'antd';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GO_PERMISSIONS, type GoPermission } from '../../../shared/auth/permissions';
import { usePermissions } from '../../account/hooks/use-current-account';
import { AnalysisPanel } from '../../analysis/components/analysis-panel';
import { ImportHistoryPanel } from '../../google-drive/components/import-history-panel';
import { RenderPanel } from '../../render/components/render-panel';
import { SystemLogsPanel } from '../components/system-logs-panel';

export const LOG_PAGE_TABS = ['log', 'render', 'import', 'analysis'] as const;
export type LogPageTab = (typeof LOG_PAGE_TABS)[number];

/** Each tab and the permission that shows it. */
const TAB_PERMISSIONS: Record<LogPageTab, GoPermission> = {
  log: GO_PERMISSIONS.LOGS_READ,
  render: GO_PERMISSIONS.RENDER_READ,
  import: GO_PERMISSIONS.DRIVE_IMPORT,
  analysis: GO_PERMISSIONS.ANALYSIS_MANAGE,
};

export function LogsPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringLiteral(LOG_PAGE_TABS).withOptions({ history: 'replace' }),
  );

  const visibleTabs = LOG_PAGE_TABS.filter((key) => can(TAB_PERMISSIONS[key]));
  const activeTab = tab && visibleTabs.includes(tab) ? tab : visibleTabs[0];

  const panels: Record<LogPageTab, { label: string; render: () => ReactNode }> = {
    log: { label: t('logs.tabLog'), render: () => <SystemLogsPanel /> },
    render: { label: t('logs.tabRender'), render: () => <RenderPanel /> },
    import: { label: t('logs.tabImport'), render: () => <ImportHistoryPanel /> },
    analysis: { label: t('logs.tabAnalysis'), render: () => <AnalysisPanel /> },
  };
  // Only the active tab mounts, so hidden tabs do not fetch or poll.
  const items: TabsProps['items'] = visibleTabs.map((key) => ({
    key,
    label: panels[key].label,
    children: key === activeTab ? panels[key].render() : null,
  }));

  return (
    <PageContainer pageHeaderRender={false}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => void setTab(key as LogPageTab)}
        items={items}
      />
    </PageContainer>
  );
}
