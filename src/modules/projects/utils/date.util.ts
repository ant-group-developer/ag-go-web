import dayjs from 'dayjs';

export const formatDate = (dateString?: string | null) => {
  if (!dateString) return '—';

  return dayjs(dateString).format('HH:mm DD/MM/YYYY');
};

export const formatDateTimeVie = (value: string | undefined): string => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};
