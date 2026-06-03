import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatDate(date: Date | string | null | undefined, tz?: string): string {
  if (!date) return '--';
  const d = tz ? dayjs(date).tz(tz) : dayjs(date);
  return d.format('MMM D, YYYY');
}

export function formatTime(date: Date | string | null | undefined, tz?: string): string {
  if (!date) return '--';
  const d = tz ? dayjs(date).tz(tz) : dayjs(date);
  return d.format('h:mm A');
}

export function formatDateTime(date: Date | string | null | undefined, tz?: string): string {
  if (!date) return '--';
  const d = tz ? dayjs(date).tz(tz) : dayjs(date);
  return d.format('MMM D, YYYY h:mm A');
}

export function capitalize(value: string): string {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '--';
  if (bytes >= 1_099_511_627_776) return `${(bytes / 1_099_511_627_776).toFixed(1)} TB`;
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export interface ArchiveJobStats {
  flatRows: { obj: any; depth: number }[];
  totalInserted: number;
  totalApiCalls: number;
  completedObjects: number;
  failedObjects: number;
}

export function computeArchiveJobStats(objects: any[]): ArchiveJobStats {
  const flatRows: { obj: any; depth: number }[] = [];
  const flatten = (items: any[], depth: number) => {
    for (const obj of items) {
      flatRows.push({ obj, depth });
      if (obj.children?.length) flatten(obj.children, depth + 1);
    }
  };
  flatten(objects, 0);

  let totalInserted = 0, totalApiCalls = 0, completedObjects = 0, failedObjects = 0;
  for (const { obj } of flatRows) {
    totalInserted  += obj.insertCount ?? 0;
    totalApiCalls  += obj.salesforceApiCount ?? 0;
    const s = obj.status?.toUpperCase() ?? '';
    if (s === 'COMPLETED' || s === 'SUCCESS') completedObjects++;
    else if (s === 'FAILED') failedObjects++;
  }
  return { flatRows, totalInserted, totalApiCalls, completedObjects, failedObjects };
}

export function calculateNextRun(
  startTime: string | null | undefined,
  startDate: string | null | undefined,
  frequency: string | null | undefined,
  interval?: number,
  tz?: string
): string {
  if (!startTime || !startDate || !frequency) return '--';

  try {
    const baseDateTime = dayjs(`${startDate}T${startTime}`);
    const now = dayjs();
    const freq = (frequency || 'DAILY').toUpperCase();
    const intervalValue = interval || 1;

    // Handle one-time backups
    if (freq === 'ONCE') {
      return baseDateTime.isBefore(now) ? '--' : baseDateTime.format('MMM D, YYYY h:mm A');
    }

    let nextRun = baseDateTime;

    // If base time is in the future, use it as next run
    if (nextRun.isAfter(now)) {
      if (tz) nextRun = nextRun.tz(tz);
      return nextRun.format('MMM D, YYYY h:mm A');
    }

    // Calculate how many intervals have passed and get the next occurrence
    const timeDiffMs = now.diff(baseDateTime, 'ms');
    let intervalsPassedCeiling = 0;

    switch (freq) {
      case 'HOURLY': {
        const intervalMs = intervalValue * 60 * 60 * 1000;
        intervalsPassedCeiling = Math.ceil(timeDiffMs / intervalMs);
        nextRun = baseDateTime.add(intervalsPassedCeiling * intervalValue, 'hour');
        break;
      }
      case 'DAILY': {
        const intervalDays = now.diff(baseDateTime, 'day');
        intervalsPassedCeiling = Math.ceil(intervalDays / intervalValue);
        nextRun = baseDateTime.add(intervalsPassedCeiling * intervalValue, 'day');
        break;
      }
      case 'WEEKLY': {
        const intervalWeeks = Math.ceil(now.diff(baseDateTime, 'week'));
        intervalsPassedCeiling = Math.ceil(intervalWeeks / intervalValue);
        nextRun = baseDateTime.add(intervalsPassedCeiling * intervalValue, 'week');
        break;
      }
      case 'MONTHLY': {
        const intervalMonths = Math.ceil(now.diff(baseDateTime, 'month'));
        intervalsPassedCeiling = Math.ceil(intervalMonths / intervalValue);
        nextRun = baseDateTime.add(intervalsPassedCeiling * intervalValue, 'month');
        break;
      }
      default:
        // Default to daily
        const defaultDays = now.diff(baseDateTime, 'day');
        intervalsPassedCeiling = Math.ceil(defaultDays / intervalValue);
        nextRun = baseDateTime.add(intervalsPassedCeiling * intervalValue, 'day');
    }

    // Apply timezone if provided
    if (tz) {
      nextRun = nextRun.tz(tz);
    }

    return nextRun.format('MMM D, YYYY h:mm A');
  } catch (error) {
    console.error('Error calculating next run:', error);
    return '--';
  }
}
