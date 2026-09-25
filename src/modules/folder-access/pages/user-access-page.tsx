import { PageContainer, ProTable, type ProColumns } from '@ant-design/pro-components';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Empty,
  Form,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { parseAsString, useQueryStates } from 'nuqs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderCascader } from '../../folders/components/folder-cascader';
import type { Folder } from '../../folders/types/folder.type';
import { formatDate } from '../../projects/utils/date.util';
import { AccessLevelSelect } from '../components/access-level-select';
import { FolderAccessDrawer } from '../components/folder-access-drawer';
import { FolderAccessUsersTable } from '../components/folder-access-users-table';
import { UserCell } from '../components/user-cell';
import { UserSearchSelect } from '../components/user-search-select';
import { useUserGrants } from '../hooks/use-folder-access';
import { useGrantActions } from '../hooks/use-grant-actions';
import type { AccessLevel } from '../types/access-level.type';
import type { AccountUserSummary } from '../types/account-user-summary.type';
import type { UserFolderGrant } from '../types/user-folder-grant.type';

const isManagedFolder = (folder: Folder) => folder.myAccessLevel === 'manager';

type AddGrantValues = {
  folderPath: string[];
  accessLevel: AccessLevel;
  inheritChildren: boolean;
};

const userAccessUrlParams = {
  // Opening a user pushes a history entry so the browser Back button returns to the overview.
  userId: parseAsString.withOptions({ history: 'push' }),
};

export function UserAccessPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm<AddGrantValues>();
  const [urlState, setUrlState] = useQueryStates(userAccessUrlParams, { history: 'replace' });
  const [pickedUser, setPickedUser] = useState<AccountUserSummary>();
  const [addOpen, setAddOpen] = useState(false);
  const [drawerFolderId, setDrawerFolderId] = useState<string>();
  const userId = urlState.userId ?? undefined;
  const grants = useUserGrants(userId);
  const actions = useGrantActions();

  const selectedUser =
    pickedUser?.id === userId ? pickedUser : (grants.data?.[0]?.principalUser ?? undefined);

  const openUser = (nextUserId?: string, user?: AccountUserSummary) => {
    setPickedUser(user);
    void setUrlState({ userId: nextUserId ?? null });
  };

  const columns: ProColumns<UserFolderGrant>[] = [
    {
      title: t('folderAccess.folder'),
      key: 'folder',
      ellipsis: true,
      render: (_, grant) => (
        <Typography.Link onClick={() => setDrawerFolderId(grant.folder.id)}>
          {grant.folder.pathText}
        </Typography.Link>
      ),
    },
    {
      title: t('folderAccess.accessLevel'),
      key: 'accessLevel',
      width: 170,
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
      width: 150,
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
      width: 220,
      ellipsis: true,
      render: (_, grant) => <UserCell user={grant.grantedByUser} showEmail={false} />,
    },
    {
      title: t('folderAccess.updatedAt'),
      key: 'updatedAt',
      width: 170,
      render: (_, grant) => formatDate(grant.updatedAt),
    },
    {
      title: t('folders.actions'),
      key: 'actions',
      width: 90,
      fixed: 'right',
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
              icon={<Trash2 size={16} />}
              loading={actions.isRemoving(grant.folderId, grant.principalId)}
            />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  return (
    <PageContainer title={t('folderAccess.pageTitle')} subTitle={t('folderAccess.pageDescription')}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small">
          <Space wrap>
            <Typography.Text strong>{t('folderAccess.user')}</Typography.Text>
            <UserSearchSelect
              value={userId}
              selectedUser={selectedUser}
              style={{ width: 360 }}
              onChange={openUser}
            />
          </Space>
        </Card>

        {!userId ? (
          <FolderAccessUsersTable onOpenUser={openUser} />
        ) : grants.isError ? (
          <Alert type="error" message={grants.error.message} />
        ) : (
          <ProTable<UserFolderGrant>
            rowKey="id"
            headerTitle={
              <Breadcrumb
                items={[
                  {
                    title: <a>{t('folderAccess.allUsers')}</a>,
                    onClick: () => openUser(),
                  },
                  {
                    title: selectedUser ? (
                      <UserCell user={selectedUser} showEmail={false} />
                    ) : (
                      userId
                    ),
                  },
                ]}
              />
            }
            dataSource={grants.data}
            loading={grants.isFetching}
            search={false}
            options={{
              reload: () => void grants.refetch(),
              density: false,
              setting: false,
              fullScreen: false,
            }}
            toolBarRender={() => [
              <Button
                key="add"
                type="primary"
                icon={<Plus size={16} />}
                onClick={() => setAddOpen(true)}
              >
                {t('folderAccess.addFolder')}
              </Button>,
            ]}
            locale={{ emptyText: <Empty description={t('folderAccess.userHasNoGrants')} /> }}
            pagination={false}
            columns={columns}
          />
        )}
      </Space>

      <Modal
        open={addOpen}
        title={t('folderAccess.addFolder')}
        okText={t('folderAccess.add')}
        cancelText={t('common.cancel')}
        confirmLoading={actions.isSubmitting}
        onCancel={() => setAddOpen(false)}
        onOk={() => form.submit()}
        forceRender
      >
        <Form<AddGrantValues>
          form={form}
          layout="vertical"
          initialValues={{ accessLevel: 'viewer', inheritChildren: true }}
          onFinish={async (values) => {
            const folderId = values.folderPath.at(-1);
            if (!userId || !folderId) {
              return;
            }
            const exists = grants.data?.some((grant) => grant.folderId === folderId);
            const saved = await actions.save(
              {
                folderId,
                principalId: userId,
                accessLevel: values.accessLevel,
                inheritChildren: values.inheritChildren,
              },
              exists ? t('folderAccess.updateSuccess') : t('folderAccess.addSuccess'),
            );
            if (saved) {
              form.resetFields();
              setAddOpen(false);
            }
          }}
        >
          <Form.Item
            name="folderPath"
            label={t('folderAccess.folder')}
            extra={t('folderAccess.managedFoldersOnly')}
            rules={[{ required: true, message: t('folderAccess.folderRequired') }]}
          >
            <FolderCascader
              allowCreate={false}
              filterFolders={isManagedFolder}
              changeOnSelect
              placeholder={t('folderAccess.folderPlaceholder')}
            />
          </Form.Item>
          <Form.Item name="accessLevel" label={t('folderAccess.accessLevel')}>
            <AccessLevelSelect style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="inheritChildren"
            valuePropName="checked"
            label={t('folderAccess.inheritChildren')}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <FolderAccessDrawer
        folderId={drawerFolderId}
        onClose={() => setDrawerFolderId(undefined)}
        onOpenFolder={setDrawerFolderId}
      />
    </PageContainer>
  );
}
