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
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.projectReview(projectId ?? '') });
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.project(projectId ?? '') });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(projectId ?? '') });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.list() });
      void message.success('Đã cập nhật đánh giá');
    },
    onError: (error) => {
      void message.error(error instanceof Error ? error.message : 'Không thể cập nhật đánh giá');
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

  return (
    <Drawer
      destroyOnClose
      open={open}
      placement="right"
      width={720}
      title={`Đánh giá${project.data?.name ? ` — ${project.data.name}` : ''}`}
      onClose={onClose}
    >
      {project.isError || media.isError ? (
        <Alert type="error" showIcon message="Không thể tải dữ liệu đánh giá" />
      ) : null}
      {project.isLoading || media.isLoading ? <Spin /> : null}
      {!items.length && !media.isLoading ? <Empty description="Project chưa có media" /> : null}
      {selected ? (
        <>
          <Card title="Danh sách file" size="small">
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
                          {item.evaluationStatus}
                        </Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
          <Card title="Cập nhật đánh giá" style={{ marginTop: 16 }}>
            <Form<EvaluationForm>
              form={form}
              layout="vertical"
              onFinish={(values) => update.mutate(values)}
            >
              <Form.Item
                name="evaluationStatus"
                label="Trạng thái"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="comment" label="Nhận xét">
                <Input.TextArea rows={5} placeholder="Nhập nhận xét cho file" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={update.isPending}>
                Lưu đánh giá
              </Button>
            </Form>
          </Card>
          <Card title="Lịch sử đánh giá" style={{ marginTop: 16 }}>
            <List
              loading={history.isLoading}
              dataSource={history.data ?? []}
              locale={{ emptyText: 'Chưa có lịch sử' }}
              renderItem={(item: ProjectMediaEvaluation) => (
                <List.Item>
                  <List.Item.Meta
                    title={<Tag>{item.evaluationStatus}</Tag>}
                    description={`${item.comment || '—'} · ${item.evaluatedBy} · ${formatDate(item.createdAt)}`}
                  />
                </List.Item>
              )}
            />
            <Typography.Text type="secondary">
              Đánh giá được kiểm tra permission ở backend; drawer này chỉ là giao diện thao tác.
            </Typography.Text>
          </Card>
        </>
      ) : null}
    </Drawer>
  );
}
