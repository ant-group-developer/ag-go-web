import {
  Alert,
  Button,
  Drawer,
  Flex,
  Form,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd';
import { Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFolders } from '../../folders/hooks/use-folders';
import { formatDate } from '../../projects/utils/date.util';
import { useFolderGrants } from '../hooks/use-folder-access';
import { useGrantActions } from '../hooks/use-grant-actions';
import type { AccessLevel } from '../types/access-level.type';
import type { FolderAccessDrawerProps } from '../types/folder-access-drawer-props.type';
import type { FolderGrant } from '../types/folder-grant.type';
import type { InheritedFolderGrant } from '../types/inherited-folder-grant.type';
import { AccessLevelSelect } from './access-level-select';
import { UserCell } from './user-cell';
import { UserSearchSelect } from './user-search-select';

type AddGrantValues = {
  principalId: string;
  accessLevel: AccessLevel;
  inheritChildren: boolean;
};

export function FolderAccessDrawer({ folderId, onClose, onOpenFolder }: FolderAccessDrawerProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm<AddGrantValues>();
  const folders = useFolders(Boolean(folderId));
  const grants = useFolderGrants(folderId);
  const actions = useGrantActions();
  const folder = folders.data?.find((item) => item.id === folderId);

  const directColumns: TableColumnsType<FolderGrant> = [
    {
      title: t('folderAccess.user'),
      key: 'user',
      ellipsis: true,
      render: (_, grant) => <UserCell user={grant.principalUser} fallbackId={grant.principalId} />,
    },
    {
      title: t('folderAccess.accessLevel'),
      key: 'accessLevel',
      width: 150,
      render: (_, grant) => (
        <AccessLevelSelect
          size="small"
          value={grant.accessLevel}
          disabled={actions.isSaving(grant.folderId, grant.principalId)}
          onChange={(accessLevel) =>
            void actions.save({
              folderId: grant.folderId,
              principalId: grant.principalId,
              accessLevel,
              inheritChildren: grant.inheritChildren,
            })
          }
        />
      ),
    },
    {
      title: t('folderAccess.inheritChildren'),
      key: 'inheritChildren',
      width: 120,
      render: (_, grant) => (
        <Switch
          size="small"
          checked={grant.inheritChildren}
          loading={actions.isSaving(grant.folderId, grant.principalId)}
          onChange={(inheritChildren) =>
            void actions.save({
              folderId: grant.folderId,
              principalId: grant.principalId,
              accessLevel: grant.accessLevel,
              inheritChildren,
            })
          }
        />
      ),
    },
    {
      title: t('folderAccess.grantedBy'),
      key: 'grantedBy',
      width: 170,
      ellipsis: true,
      render: (_, grant) => (
        <Flex vertical style={{ minWidth: 0 }}>
          <Typography.Text
            ellipsis={{ tooltip: grant.grantedByUser?.name || grant.grantedByUser?.email }}
          >
            {grant.grantedByUser?.name || grant.grantedByUser?.email || '-'}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(grant.updatedAt)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      key: 'actions',
      width: 48,
      render: (_, grant) => (
        <Popconfirm
          title={t('folderAccess.removeConfirm')}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
          onConfirm={() => actions.remove(grant.folderId, grant.principalId)}
        >
          <Tooltip title={t('folderAccess.remove')}>
            <Button
              aria-label={t('folderAccess.remove')}
              danger
              type="text"
              size="small"
              icon={<Trash2 size={16} />}
              loading={actions.isRemoving(grant.folderId, grant.principalId)}
            />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  const inheritedColumns: TableColumnsType<InheritedFolderGrant> = [
    {
      title: t('folderAccess.user'),
      key: 'user',
      ellipsis: true,
      render: (_, grant) => <UserCell user={grant.principalUser} fallbackId={grant.principalId} />,
    },
    {
      title: t('folderAccess.accessLevel'),
      key: 'accessLevel',
      width: 150,
      render: (_, grant) => <Tag>{t(`folderAccess.levels.${grant.accessLevel}`)}</Tag>,
    },
    {
      title: t('folderAccess.sourceFolder'),
      key: 'sourceFolder',
      ellipsis: true,
      render: (_, grant) =>
        grant.sourceFolder ? (
          <Typography.Link onClick={() => onOpenFolder(grant.sourceFolder!.id)}>
            {grant.sourceFolder.pathText}
          </Typography.Link>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <Drawer
      open={Boolean(folderId)}
      width={860}
      title={
        <Space direction="vertical" size={0}>
          <span>{t('folderAccess.drawerTitle')}</span>
          {folder ? (
            <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
              {folder.pathText}
            </Typography.Text>
          ) : null}
        </Space>
      }
      onClose={onClose}
      destroyOnClose
    >
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Form<AddGrantValues>
          form={form}
          layout="inline"
          initialValues={{ accessLevel: 'viewer', inheritChildren: true }}
          onFinish={async (values) => {
            if (!folderId) {
              return;
            }
            const exists = grants.data?.direct.some(
              (grant) => grant.principalId === values.principalId,
            );
            const saved = await actions.save(
              { folderId, ...values },
              exists ? t('folderAccess.updateSuccess') : t('folderAccess.addSuccess'),
            );
            if (saved) {
              form.resetFields(['principalId']);
            }
          }}
          style={{ rowGap: 8 }}
        >
          <Form.Item
            name="principalId"
            rules={[{ required: true, message: t('folderAccess.userRequired') }]}
          >
            <UserSearchSelect style={{ width: 300 }} />
          </Form.Item>
          <Form.Item name="accessLevel">
            <AccessLevelSelect />
          </Form.Item>
          <Form.Item
            name="inheritChildren"
            valuePropName="checked"
            label={t('folderAccess.inheritChildren')}
          >
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<UserPlus size={16} />}
              loading={actions.isSubmitting}
            >
              {t('folderAccess.add')}
            </Button>
          </Form.Item>
        </Form>

        {grants.isError ? <Alert type="error" message={grants.error.message} /> : null}

        <div>
          <Typography.Title level={5}>{t('folderAccess.directGrants')}</Typography.Title>
          <Table<FolderGrant>
            rowKey="id"
            size="small"
            loading={grants.isLoading}
            dataSource={grants.data?.direct}
            columns={directColumns}
            pagination={false}
            locale={{ emptyText: t('folderAccess.noDirectGrants') }}
          />
        </div>

        <div>
          <Typography.Title level={5}>{t('folderAccess.inheritedGrants')}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {t('folderAccess.inheritedHint')}
          </Typography.Paragraph>
          <Table<InheritedFolderGrant>
            rowKey="id"
            size="small"
            loading={grants.isLoading}
            dataSource={grants.data?.inherited}
            columns={inheritedColumns}
            pagination={false}
            locale={{ emptyText: t('folderAccess.noInheritedGrants') }}
          />
        </div>
      </Space>
    </Drawer>
  );
}
