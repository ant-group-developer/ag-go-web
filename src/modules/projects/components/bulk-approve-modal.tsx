import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Checkbox, Flex, Input, Modal, Typography } from 'antd';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  bulkApproveProjectMedia,
  bulkApproveProjects,
  type BulkApprovalResult,
} from '../../media/api/media';
import { mediaQueryKeys } from '../../media/queries/media-query-keys';
import { projectQueryKeys } from '../queries/project-query-keys';

/** What the quick "Approved" action applies to. */
export type BulkApproveTarget =
  | { kind: 'media'; mediaIds: string[] }
  | { kind: 'projects'; projects: Array<{ id: string; name: string }> };

type BulkApproveModalProps = {
  /** The modal is open while a target is set. */
  target?: BulkApproveTarget;
  onClose: () => void;
  onApproved?: (result: BulkApprovalResult) => void;
};

export function BulkApproveModal({ target, onClose, onApproved }: BulkApproveModalProps) {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [overrideRejected, setOverrideRejected] = useState(false);

  const close = () => {
    setComment('');
    setOverrideRejected(false);
    onClose();
  };

  const approve = useMutation({
    mutationFn: (current: BulkApproveTarget) =>
      current.kind === 'media'
        ? bulkApproveProjectMedia(current.mediaIds, comment.trim())
        : bulkApproveProjects({
            projectIds: current.projects.map((project) => project.id),
            overrideRejected,
            comment: comment.trim(),
          }),
    onSuccess: (result, current) => {
      // File lists, evaluation histories, project details and lists all change.
      void queryClient.invalidateQueries({ queryKey: mediaQueryKeys.all() });
      void queryClient.invalidateQueries({ queryKey: projectQueryKeys.all() });
      const summary = describeResult(result, current, overrideRejected, t);
      void (result.approvedCount > 0 ? message.success(summary) : message.info(summary));
      onApproved?.(result);
      close();
    },
    onError: (error) => {
      void message.error(error instanceof Error ? error.message : t('projects.bulkApproveFailed'));
    },
  });

  const title = !target
    ? ''
    : target.kind === 'media'
      ? t('projects.bulkApproveFilesTitle', { count: target.mediaIds.length })
      : target.projects.length === 1
        ? t('projects.bulkApproveProjectTitle', { name: target.projects[0].name })
        : t('projects.bulkApproveProjectsTitle', { count: target.projects.length });

  return (
    <Modal
      destroyOnClose
      open={Boolean(target)}
      title={title}
      okText={t('projects.bulkApproveConfirm')}
      cancelText={t('common.cancel')}
      okButtonProps={{ loading: approve.isPending }}
      cancelButtonProps={{ disabled: approve.isPending }}
      maskClosable={!approve.isPending}
      onOk={() => target && approve.mutate(target)}
      onCancel={() => !approve.isPending && close()}
    >
      <Flex vertical gap={12}>
        <Typography.Text type="secondary">
          {target?.kind === 'media'
            ? t('projects.bulkApproveFilesDescription')
            : t('projects.bulkApproveProjectsDescription')}
        </Typography.Text>
        {target?.kind === 'projects' ? (
          <Flex vertical gap={2}>
            <Checkbox
              checked={overrideRejected}
              disabled={approve.isPending}
              onChange={(event) => setOverrideRejected(event.target.checked)}
            >
              {t('projects.bulkApproveOverrideRejected')}
            </Checkbox>
            {!overrideRejected ? (
              <Typography.Text type="secondary" style={{ fontSize: 12, paddingInlineStart: 24 }}>
                {t('projects.bulkApproveOverrideRejectedHint')}
              </Typography.Text>
            ) : null}
          </Flex>
        ) : null}
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 5 }}
          disabled={approve.isPending}
          maxLength={2000}
          placeholder={t('projects.bulkApproveCommentPlaceholder')}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </Flex>
    </Modal>
  );
}

function describeResult(
  result: BulkApprovalResult,
  target: BulkApproveTarget,
  overrideRejected: boolean,
  t: TFunction,
): string {
  const parts = [
    result.approvedCount > 0
      ? t('projects.bulkApproveSuccess', { count: result.approvedCount })
      : t('projects.bulkApproveNothingChanged'),
  ];
  if (target.kind === 'media') {
    if (result.unchangedCount > 0) {
      parts.push(t('projects.bulkApproveUnchanged', { count: result.unchangedCount }));
    }
    return parts.join(' ');
  }
  const rejectedKept = result.projects.reduce((sum, project) => sum + project.rejectedCount, 0);
  if (!overrideRejected && rejectedKept > 0) {
    parts.push(t('projects.bulkApproveRejectedKept', { count: rejectedKept }));
  }
  const emptyProjects = result.projects.filter((project) => project.totalMedia === 0).length;
  if (emptyProjects > 0) {
    parts.push(t('projects.bulkApproveEmptyProjects', { count: emptyProjects }));
  }
  return parts.join(' ');
}
