import { Flex, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../shared/lib/format-date';
import { PAGE_TABLE_STICKY } from '../../../shared/lib/sticky-table-header';
import {
  formatMs,
  qualityStars,
  RESOLUTION_LABELS,
  resolutionOf,
  type FootageVideo,
} from '../api/footage';

interface FootageTableProps {
  items: FootageVideo[];
  /** Folder path by id, to name the folders of a video. */
  folderPaths: Map<string, string>;
  onOpen: (item: FootageVideo) => void;
}

/** First name with a "+n" for the rest; the tooltip lists them all. */
function NameList({ names }: { names: string[] }) {
  if (names.length === 0) return <Typography.Text type="secondary">-</Typography.Text>;
  return (
    <Tooltip
      title={names.map((name, index) => (
        <div key={index}>{name}</div>
      ))}
    >
      <Flex align="center" gap={4} style={{ minWidth: 0 }}>
        <Typography.Text ellipsis>{names[0]}</Typography.Text>
        {names.length > 1 && (
          <Tag style={{ marginInlineEnd: 0, flexShrink: 0 }}>+{names.length - 1}</Tag>
        )}
      </Flex>
    </Tooltip>
  );
}

function ThumbnailCell({ item }: { item: FootageVideo }) {
  const { t } = useTranslation();
  // Fixed box that never shrinks, so long titles can't squeeze the thumbnail.
  return (
    <div
      style={{
        position: 'relative',
        flex: '0 0 auto',
        width: 96,
        height: 54,
        borderRadius: 6,
        overflow: 'hidden',
        background: '#111',
      }}
    >
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt={item.titleVi || item.name}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Flex align="center" justify="center" style={{ height: '100%' }}>
          <span style={{ color: '#6b7280', fontSize: 10 }}>{t('footage.noKeyframe')}</span>
        </Flex>
      )}
      <span
        style={{
          position: 'absolute',
          bottom: 3,
          right: 4,
          background: 'rgba(0,0,0,0.65)',
          color: '#fff',
          fontSize: 10,
          padding: '0 4px',
          borderRadius: 3,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatMs(item.durationMs)}
      </span>
    </div>
  );
}

/** Footage as table rows; a row opens the video drawer. */
export function FootageTable({ items, folderPaths, onOpen }: FootageTableProps) {
  const { t } = useTranslation();

  const columns: ColumnsType<FootageVideo> = [
    {
      title: t('footage.video'),
      key: 'video',
      width: 380,
      fixed: 'left',
      render: (_, item) => (
        <Flex align="center" gap={10} style={{ minWidth: 0 }}>
          <ThumbnailCell item={item} />
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <Typography.Link
              ellipsis
              strong
              title={item.titleVi || item.name}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(item);
              }}
            >
              {item.titleVi || item.name}
            </Typography.Link>
            <Typography.Text type="secondary" ellipsis={{ tooltip: item.name }}>
              {item.name}
            </Typography.Text>
            {item.approved && (
              <div>
                <Tag color="success" style={{ fontSize: 11, margin: 0, padding: '0 5px' }}>
                  {t('footage.approved')}
                </Tag>
              </div>
            )}
          </Flex>
        </Flex>
      ),
    },
    {
      title: t('footage.filterFolder'),
      key: 'folder',
      width: 240,
      render: (_, item) => (
        <NameList
          names={item.folderIds.flatMap((id) => {
            const path = folderPaths.get(id);
            return path ? [path] : [];
          })}
        />
      ),
    },
    {
      title: t('footage.filterProject'),
      key: 'project',
      width: 220,
      render: (_, item) => <NameList names={item.projectNames} />,
    },
    {
      title: t('footage.duration'),
      key: 'duration',
      width: 120,
      render: (_, item) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMs(item.durationMs)}</span>
      ),
    },
    {
      title: t('footage.resolution'),
      key: 'resolution',
      width: 180,
      render: (_, item) => {
        const resolution = resolutionOf(item.width, item.height);
        return (
          <Flex align="center" gap={6}>
            {resolution ? (
              <Tooltip title={RESOLUTION_LABELS[resolution]}>
                <Typography.Text strong style={{ textTransform: 'uppercase' }}>
                  {resolution}
                </Typography.Text>
              </Tooltip>
            ) : null}
            {item.width && item.height ? (
              <Typography.Text type="secondary">
                {item.width}×{item.height}
              </Typography.Text>
            ) : null}
          </Flex>
        );
      },
    },
    {
      title: t('footage.genre'),
      key: 'genre',
      width: 150,
      render: (_, item) =>
        item.genre ? (
          <Tag color="blue" style={{ margin: 0 }}>
            {item.genre}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: t('footage.quality'),
      key: 'quality',
      width: 110,
      render: (_, item) => {
        const stars = qualityStars(item.quality);
        return stars ? (
          <span
            style={{ color: '#f59e0b', letterSpacing: 1 }}
            title={`${t('footage.quality')}: ${item.quality}`}
          >
            {stars}
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      title: t('footage.analyzedAt'),
      key: 'analyzedAt',
      width: 150,
      render: (_, item) => formatDate(item.analyzedAt),
    },
  ];

  return (
    <Table<FootageVideo>
      rowKey="assetId"
      columns={columns}
      dataSource={items}
      pagination={false}
      scroll={{ x: 1550 }}
      sticky={PAGE_TABLE_STICKY}
      onRow={(item) => ({ onClick: () => onOpen(item), style: { cursor: 'pointer' } })}
    />
  );
}
