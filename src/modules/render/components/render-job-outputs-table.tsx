import { Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import type { RenderJobOutput } from '../api/render';
import { formatResolution, isThumbnailOutput } from '../utils/render-format';

/** Expanded row of a render job: every output variant, previews first (smallest first), thumbnail last. */
export function RenderJobOutputsTable({ outputs }: { outputs: RenderJobOutput[] }) {
  const { t } = useTranslation();
  const sorted = [...outputs].sort(
    (a, b) =>
      Number(isThumbnailOutput(a)) - Number(isThumbnailOutput(b)) ||
      (a.width ?? 0) - (b.width ?? 0),
  );
  return (
    <Table<RenderJobOutput>
      size="small"
      rowKey="variantCode"
      pagination={false}
      dataSource={sorted}
      locale={{ emptyText: t('render.noOutputs') }}
      columns={[
        {
          key: 'variant',
          title: t('render.variant'),
          render: (_, output) =>
            isThumbnailOutput(output)
              ? t('render.thumbnail')
              : t('render.previewSize', { width: output.width ?? '-' }),
        },
        {
          key: 'resolution',
          title: t('render.resolution'),
          render: (_, output) => formatResolution(output.width, output.height),
        },
        {
          key: 'size',
          title: t('render.fileSize'),
          render: (_, output) => formatFileSize(output.fileSizeBytes),
        },
        { key: 'format', title: t('render.format'), dataIndex: 'mimeType' },
        {
          key: 'watermark',
          title: t('render.watermark'),
          render: (_, output) =>
            output.hasWatermark ? (
              <Tag color="blue">{t('render.withWatermark')}</Tag>
            ) : (
              <Tag>{t('render.withoutWatermark')}</Tag>
            ),
        },
        {
          key: 'version',
          title: t('render.profileVersion'),
          render: (_, output) => `v${output.renderVersion}`,
        },
      ]}
    />
  );
}
