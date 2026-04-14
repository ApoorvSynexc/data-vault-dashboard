import dayjs from 'dayjs';

export function formatDate(date: Date | string): string {
  return dayjs(date).format('MMM D, YYYY');
}

export function capitalize(value: string): string {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
