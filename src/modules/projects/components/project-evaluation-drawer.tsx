import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getProjectMedia,
  getProjectMediaEvaluationHistory,
  updateProjectMedia,
  type ProjectMedia,
  type ProjectMediaEvaluation,
} from '../../media/api/media';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { getProject } from '../api/projects';
import { projectQueryKeys } from '../queries/project-query-keys';

type Props = {
  open: boolean;
  projectId?: string;
  onClose: () => void;
};

type EvaluationForm = {
  evaluationStatus: ProjectMedia['evaluationStatus'];
  comment?: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

export function ProjectEvaluationDrawer({ open, projectId, onClose }: Props) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();
  const [form] = Form.useForm<EvaluationForm>();
  const project = useQuery({
    queryKey: projectQueryKeys.detail(projectId ?? ''),
    queryFn: () => getProject(projectId ?? ''),
    enabled: open && Boolean(projectId),
  });
  const media = useQuery({
    queryKey: mediaQueryKeys.projectReview(projectId ?? ''),
    queryFn: () => getProjectMedia(projectId ?? '', { limit: 100 }),
    enabled: open && Boolean(projectId),
  });
  const items = useMemo(() => media.data?.items ?? [], [media.data]);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const history = useQuery({
    queryKey: mediaQueryKeys.evaluationHistory(selected?.id ?? ''),
    queryFn: () => getProjectMediaEvaluationHistory(selected?.id ?? ''),
    enabled: open && Boolean(selected?.id),
  });
  const update = useMutation({
    mutationFn: (values: EvaluationForm) => updateProjectMedia(selected?.id ?? '', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: mediaQueryKeys.projectReview(projectId ?? ''),
      });
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId ?? '') });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId ?? '') });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
      void message.success(t('evaluations.updateSuccess'));
    },
    onError: (error) => {
      void message.error(error instanceof Error ? error.message : t('evaluations.updateFailed'));
    },
  });

  useEffect(() => {
    if (!selected) {
      form.resetFields();
      return;
    }
    form.setFieldsValue({
      evaluationStatus: selected.evaluationStatus,
      comment: selected.caption ?? '',
    });
  }, [form, selected]);

  useEffect(() => {
    setSelectedId(undefined);
  }, [projectId, open]);

  const evaluationStatusLabels: Record<string, string> = {
    pending: t('projects.evaluationPending'),
    approved: t('projects.evaluationApproved'),
    rejected: t('projects.evaluationRejected'),
  };

  return (
    <Drawer
      destroyOnClose
      open={open}
      placement="right"
      width={720}
      title={`${t('evaluations.title')}${project.data?.name ? ` - ${project.data.name}` : ''}`}
      onClose={onClose}
    >
      {project.isError || media.isError ? (
        <Alert type="error" showIcon message={t('evaluations.loadFailed')} />
      ) : null}
      {project.isLoading || media.isLoading ? <Spin /> : null}
      {!items.length && !media.isLoading ? <Empty description={t('evaluations.noMedia')} /> : null}
      {selected ? (
        <>
          <Card title={t('evaluations.fileList')} size="small">
            <List
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    background: item.id === selected.id ? '#e6f4ff' : undefined,
                    paddingInline: 8,
                  }}
                  onClick={() => setSelectedId(item.id)}
                >
                  <List.Item.Meta
                    title={item.asset.originalFilename}
                    description={
                      <Space>
                        <Tag>{item.asset.assetType}</Tag>
                        <Tag
                          color={
                            item.evaluationStatus === 'approved'
                              ? 'success'
                              : item.evaluationStatus === 'rejected'
                                ? 'error'
                                : 'processing'
                          }
                        >
                          {evaluationStatusLabels[item.evaluationStatus] ?? item.evaluationStatus}
                        </Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card title={t('evaluations.updateTitle')} style={{ marginTop: 16 }}>
            <Form<EvaluationForm>
              form={form}
              layout="vertical"
              onFinish={(values) => update.mutate(values)}
            >
              <Form.Item name="evaluationStatus" label={t('evaluations.status')} rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: t('projects.evaluationPending'), value: 'pending' },
                    { label: t('projects.evaluationApproved'), value: 'approved' },
                    { label: t('projects.evaluationRejected'), value: 'rejected' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="comment" label={t('evaluations.comment')}>
                <Input.TextArea rows={5} placeholder={t('evaluations.commentPlaceholder')} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={update.isPending}>
                {t('evaluations.save')}
              </Button>
            </Form>
          </Card>
          <Card title={t('evaluations.historyTitle')} style={{ marginTop: 16 }}>
            <List
              loading={history.isLoading}
              dataSource={history.data ?? []}
              locale={{ emptyText: t('evaluations.noHistory') }}
              renderItem={(item: ProjectMediaEvaluation) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Tag
                        color={
                          item.evaluationStatus === 'approved'
                            ? 'success'
                            : item.evaluationStatus === 'rejected'
                              ? 'error'
                              : 'processing'
                        }
                      >
                        {evaluationStatusLabels[item.evaluationStatus] ?? item.evaluationStatus}
                      </Tag>
                    }
                    description={`${item.comment || '-'} · ${item.evaluatedBy} · ${formatDate(item.createdAt)}`}
                  />
                </List.Item>
              )}
            />
            <Typography.Text type="secondary">
              {t('evaluations.permissionNote')}
            </Typography.Text>
          </Card>
        </>
      ) : null}
    </Drawer>
  );
}
