import { RedoOutlined } from '@ant-design/icons';
import { App, Button, Popconfirm, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import type { RenderBatch } from '../api/render';
import { useRetryFailedRenderBatchJobs } from '../hooks/use-render';
import { canRetryFailedRenderJobs } from '../utils/render-format';

type RetryFailedBatchButtonProps = {
  batch: RenderBatch;
  /** Shows the label next to the icon instead of only in a tooltip. */
  withLabel?: boolean;
};

/** Queues every failed job of a render batch again, after a confirmation. */
export function RetryFailedBatchButton({ batch, withLabel }: RetryFailedBatchButtonProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const retryFailed = useRetryFailedRenderBatchJobs();
  if (!canRetryFailedRenderJobs(batch)) {
    return null;
  }
  const label = t('render.retryFailedJobs');
  const button = (
    <Button
      size="small"
      icon={<RedoOutlined />}
      aria-label={label}
      loading={retryFailed.isPending && retryFailed.variables === batch.id}
    >
      {withLabel ? label : null}
    </Button>
  );
  return (
    <Popconfirm
      title={t('render.retryFailedJobsConfirm', { count: batch.failedJobs })}
      onConfirm={() =>
        retryFailed
          .mutateAsync(batch.id)
          .then(({ retriedJobs }) =>
            message.success(t('render.retryFailedJobsQueued', { count: retriedJobs })),
          )
          .catch((error: Error) => void message.error(error.message))
      }
    >
      {withLabel ? button : <Tooltip title={label}>{button}</Tooltip>}
    </Popconfirm>
  );
}
