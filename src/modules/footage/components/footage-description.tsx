import type { DescriptionsProps } from 'antd';
import { Descriptions, Space, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import { formatFileSize } from '../../../shared/lib/format-file-size';
import {
  actorName,
  CAMERA_MOTION_LABELS_VI,
  formatMs,
  ORIENTATION_LABELS_VI,
  PEOPLE_COUNT_LABELS_VI,
  qualityStars,
  RESOLUTION_LABELS,
  resolutionOf,
  SETTING_LABELS_VI,
  SHOT_SIZE_LABELS_VI,
  TIME_OF_DAY_LABELS_VI,
  type FootageFileInfo,
} from '../api/footage';

/** One row of an info table; falsy entries are skipped so optional rows read inline. */
export type InfoRow = { label: string; value: ReactNode } | false | null | undefined | '' | 0;

/** The one look every block of the footage views uses: bordered, one column, same label width. */
export function InfoDescriptions({
  rows,
  title,
  extra,
  column = 1,
  labelWidth = 160,
}: {
  rows: InfoRow[];
  title?: ReactNode;
  extra?: ReactNode;
  column?: DescriptionsProps['column'];
  labelWidth?: number;
}) {
  const items: DescriptionsProps['items'] = rows
    .filter((row): row is { label: string; value: ReactNode } => Boolean(row))
    .map((row) => ({ key: row.label, label: row.label, children: row.value }));
  return (
    <Descriptions
      bordered
      size="small"
      column={column}
      title={title}
      extra={extra}
      items={items}
      styles={{ label: { fontWeight: 600, color: '#374151', width: labelWidth } }}
    />
  );
}

export function TagList({ values, color }: { values: string[]; color?: string }) {
  return (
    <Space size={[4, 4]} wrap>
      {values.map((value) => (
        <Tag key={value} color={color} style={{ marginInlineEnd: 0 }}>
          {value}
        </Tag>
      ))}
    </Space>
  );
}

/**
 * The AI description of a video. Footage search results and the raw analysis of an asset carry
 * the same fields; the ones only footage knows (orientation, audio, approval) are optional.
 */
export type FootageDescriptionData = {
  titleVi: string;
  summaryVi: string;
  summaryEn: string;
  genre: string;
  mood: string;
  timeOfDay: string;
  setting: string;
  peopleCount: string;
  shotVariety: string[];
  cameraMotions: string[];
  visibleText: string;
  hasWatermark: boolean;
  quality: number;
  usable: boolean;
  usableReason: string;
  topics: string[];
  subjects: string[];
  places: string[];
  actions: string[];
  tags: string[];
  keywordsVi: string[];
  orientation?: string | null;
  hasAudio?: boolean | null;
  hasSpeech?: boolean | null;
  approved?: boolean;
};

/** Vietnamese label of an enum value; unknown values (newer prompt versions) show as they are. */
function labelOf(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value;
}

export function FootageDescription({
  description,
  labelWidth,
}: {
  description: FootageDescriptionData;
  labelWidth?: number;
}) {
  const { t } = useTranslation();
  const item = description;
  const tagRow = (label: string, values: string[], color?: string): InfoRow =>
    values.length > 0 && { label, value: <TagList values={values} color={color} /> };
  return (
    <InfoDescriptions
      labelWidth={labelWidth}
      rows={[
        item.titleVi && { label: t('footage.titleVi'), value: item.titleVi },
        item.summaryVi && { label: t('footage.summaryVi'), value: item.summaryVi },
        item.summaryEn && { label: t('footage.summaryEn'), value: item.summaryEn },
        item.genre && { label: t('footage.genre'), value: <Tag color="blue">{item.genre}</Tag> },
        item.mood && { label: t('footage.mood'), value: item.mood },
        item.timeOfDay && {
          label: t('footage.timeOfDay'),
          value: labelOf(TIME_OF_DAY_LABELS_VI, item.timeOfDay),
        },
        item.setting && {
          label: t('footage.setting'),
          value: labelOf(SETTING_LABELS_VI, item.setting),
        },
        item.peopleCount && {
          label: t('footage.peopleCount'),
          value: labelOf(PEOPLE_COUNT_LABELS_VI, item.peopleCount),
        },
        item.orientation && {
          label: t('footage.orientation'),
          value: labelOf(ORIENTATION_LABELS_VI, item.orientation),
        },
        tagRow(
          t('footage.shotVariety'),
          item.shotVariety.map((s) => labelOf(SHOT_SIZE_LABELS_VI, s)),
        ),
        tagRow(
          t('footage.cameraMotion'),
          item.cameraMotions.map((cm) => labelOf(CAMERA_MOTION_LABELS_VI, cm)),
        ),
        typeof item.hasAudio === 'boolean' && {
          label: t('footage.hasAudio'),
          value: (
            <Space size={4} wrap>
              <Tag color={item.hasAudio ? 'success' : 'default'}>
                {item.hasAudio ? t('footage.yes') : t('footage.no')}
              </Tag>
              {typeof item.hasSpeech === 'boolean' && (
                <Tag color={item.hasSpeech ? 'processing' : 'default'}>
                  {item.hasSpeech ? t('footage.hasSpeech') : t('footage.noSpeech')}
                </Tag>
              )}
            </Space>
          ),
        },
        item.visibleText && { label: t('footage.visibleText'), value: item.visibleText },
        item.hasWatermark && {
          label: t('footage.hasWatermark'),
          value: <Tag color="warning">{t('footage.yes')}</Tag>,
        },
        {
          label: t('footage.quality'),
          value: (
            <>
              <span style={{ color: '#f59e0b' }}>{qualityStars(item.quality)}</span>
              <span style={{ color: '#6b7280', marginLeft: 6 }}>({item.quality}/5)</span>
            </>
          ),
        },
        {
          label: t('footage.usable'),
          value: (
            <>
              <Tag color={item.usable ? 'success' : 'default'}>
                {item.usable ? t('footage.usableYes') : t('footage.usableNo')}
              </Tag>
              {!item.usable && item.usableReason && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {item.usableReason}
                </Typography.Text>
              )}
            </>
          ),
        },
        item.approved && {
          label: t('footage.approved'),
          value: <Tag color="success">{t('footage.approvedYes')}</Tag>,
        },
        tagRow(t('footage.topics'), item.topics, 'geekblue'),
        tagRow(t('footage.subjects'), item.subjects, 'purple'),
        tagRow(t('footage.places'), item.places, 'orange'),
        tagRow(t('footage.actions'), item.actions, 'cyan'),
        tagRow(t('footage.tags'), item.tags),
        tagRow(t('footage.keywordsVi'), item.keywordsVi, 'blue'),
      ]}
    />
  );
}

function formatBitrate(bps: number | null): string {
  if (!bps) return '-';
  return bps >= 1_000_000
    ? `${(bps / 1_000_000).toFixed(1)} Mbps`
    : `${Math.round(bps / 1000)} kbps`;
}

/**
 * Technical metadata of an original file. Images skip the rows only a video has (duration,
 * frame rate, bitrate, audio); `extraRows` lets a view append rows of its own.
 */
export function FileInfoDescriptions({
  file,
  isVideo = true,
  labelWidth,
  extraRows = [],
}: {
  file: FootageFileInfo;
  isVideo?: boolean;
  labelWidth?: number;
  extraRows?: InfoRow[];
}) {
  const { t } = useTranslation();
  const { width, height } = file;
  const resolution = width && height ? resolutionOf(width, height) : null;
  const sourceLabels: Record<string, string> = {
    local: t('footage.sourceLocal'),
    google_drive: 'Google Drive',
  };
  return (
    <InfoDescriptions
      labelWidth={labelWidth}
      rows={[
        {
          label: t('footage.assetName'),
          value: <Typography.Text copyable>{file.filename}</Typography.Text>,
        },
        {
          label: t('footage.fileFormat'),
          value: [file.mimeType, file.format, file.extension && `.${file.extension}`]
            .filter(Boolean)
            .join(' · '),
        },
        { label: t('footage.fileSize'), value: formatFileSize(file.fileSizeBytes) },
        {
          label: t('footage.resolution'),
          value:
            width && height ? (
              <Space size={6} wrap>
                <span>
                  {width} × {height}
                </span>
                {resolution && <Tag>{RESOLUTION_LABELS[resolution]}</Tag>}
              </Space>
            ) : (
              '-'
            ),
        },
        isVideo && {
          label: t('footage.duration'),
          value: file.durationMs !== null ? formatMs(file.durationMs) : '-',
        },
        isVideo && {
          label: t('footage.frameRate'),
          value: file.frameRate ? `${Math.round(file.frameRate * 100) / 100} fps` : '-',
        },
        { label: t('footage.codec'), value: file.codec ?? '-' },
        isVideo && { label: t('footage.bitrate'), value: formatBitrate(file.bitrateBps) },
        isVideo && {
          label: t('footage.hasAudio'),
          value: file.hasAudio === null ? '-' : file.hasAudio ? t('footage.yes') : t('footage.no'),
        },
        { label: t('footage.source'), value: sourceLabels[file.sourceType] ?? file.sourceType },
        { label: t('footage.uploadedAt'), value: formatDate(file.uploadedAt) },
        {
          label: t('footage.uploadedBy'),
          value: actorName(file.uploadedByUser, file.uploadedBy) || '-',
        },
        isVideo && { label: t('footage.analyzedAt'), value: formatDate(file.analyzedAt) },
        file.analysisModel && { label: t('footage.analysisModel'), value: file.analysisModel },
        ...extraRows,
      ]}
    />
  );
}
