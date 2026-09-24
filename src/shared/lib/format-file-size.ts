export function formatFileSize(value: number | string | null | undefined): string {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const normalized = bytes / 1024 ** unitIndex;
  const decimals = unitIndex === 0 ? 0 : normalized >= 10 ? 1 : 2;
  return `${normalized.toFixed(decimals)} ${units[unitIndex]}`;
}
