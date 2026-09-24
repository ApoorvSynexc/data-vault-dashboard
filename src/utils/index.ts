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
  return d.format('HH:mm');
}

export function formatDateTime(date: Date | string | null | undefined, tz?: string): string {
  if (!date) return '--';
  const d = tz ? dayjs(date).tz(tz) : dayjs(date);
  return d.format('MMM D, YYYY HH:mm');
}

/**
 * Converts a 12-hour time string (e.g. "3:05 PM", "03:05 PM") to 24-hour "HH:mm".
 * Returns the input unchanged if it's already in 24-hour format or unrecognised.
 */
export function to24h(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeStr; // already 24-hour or unrecognised — pass through
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3].toUpperCase();
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2, '0')}:${m}`;
}

export function toUTCISOString(date: string | undefined): string | undefined {
  if (!date) return date;
  return dayjs(date).utc().toISOString();
}

export function capitalize(value: string): string {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '--';
  if (bytes === 0) return '0 B';
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
    totalInserted  += obj.insertCount ?? obj.completedRecordCount ?? obj.totalRecordCount ?? 0;
    totalApiCalls  += obj.salesforceApiCount ?? 0;
    const s = obj.status?.toUpperCase() ?? '';
    if (s === 'COMPLETED' || s === 'SUCCESS') completedObjects++;
    else if (s === 'FAILED') failedObjects++;
  }
  return { flatRows, totalInserted, totalApiCalls, completedObjects, failedObjects };
}

const WEEKDAY_NUM: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};
const MONTH_NUM: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

export function calculateNextRun(
  scheduling: {
    frequency?: string;
    customFrequency?: string;
    interval?: number;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    weekDays?: string[];
    monthDate?: number;
    selectedMonths?: string[];
  } | null | undefined,
  _timeZone?: string
): string {
  if (!scheduling?.frequency) return '--';

  const {
    frequency, customFrequency, startDate, startTime, endDate,
    interval = 1, weekDays, monthDate, selectedMonths,
  } = scheduling;

  const freq = frequency.toUpperCase();
  const now = dayjs();
  const fmt = (d: dayjs.Dayjs) => d.format('MMM D, YYYY h:mm A');
  const dt = (date: string, time = '00:00') => dayjs(`${date}T${time}`);

  try {
    switch (freq) {

      case 'ONCE': {
        if (!startDate) return '--';
        const run = dt(startDate, startTime);
        return run.isAfter(now) ? fmt(run) : 'Completed';
      }

      case 'HOURLY': {
        if (!startTime) return '--';
        const base = dt(startDate ?? now.format('YYYY-MM-DD'), startTime);
        if (base.isAfter(now)) return fmt(base);
        const diffMs = now.diff(base, 'ms');
        const stepMs = interval * 3_600_000;
        const n = Math.ceil(diffMs / stepMs);
        return fmt(base.add(n * interval, 'hour'));
      }

      case 'DAILY': {
        if (!startTime) return '--';
        const base = dt(startDate ?? now.format('YYYY-MM-DD'), startTime);
        if (base.isAfter(now)) return fmt(base);
        const days = now.diff(base, 'day');
        let next = base.add(Math.ceil(days / interval) * interval, 'day');
        if (!next.isAfter(now)) next = next.add(interval, 'day');
        return fmt(next);
      }

      case 'WEEKLY': {
        if (!startTime) return '--';
        const [h, m] = startTime.split(':').map(Number);
        const targets = (weekDays ?? [])
          .map((d) => WEEKDAY_NUM[d.toUpperCase()])
          .filter((d) => d !== undefined)
          .sort((a, b) => a - b);

        if (targets.length === 0) {
          // No specific days — advance by interval weeks from startDate
          const base = dt(startDate ?? now.format('YYYY-MM-DD'), startTime);
          if (base.isAfter(now)) return fmt(base);
          const weeks = now.diff(base, 'week');
          let next = base.add(Math.ceil(weeks / interval) * interval, 'week');
          if (!next.isAfter(now)) next = next.add(interval, 'week');
          return fmt(next);
        }

        // Find the next matching weekday within the current or next valid week cycle
        // Anchor week from startDate (or today)
        const anchor = dayjs(startDate ?? now.format('YYYY-MM-DD')).startOf('week');
        for (let w = 0; w <= 104; w += interval) {
          const weekStart = anchor.add(w, 'week');
          for (const targetDay of targets) {
            const candidate = weekStart.day(targetDay).hour(h).minute(m).second(0).millisecond(0);
            if (candidate.isAfter(now)) return fmt(candidate);
          }
        }
        return '--';
      }

      case 'MONTHLY': {
        if (!startTime || !monthDate) return '--';
        const [h, m] = startTime.split(':').map(Number);
        const validMonths = (selectedMonths && selectedMonths.length > 0)
          ? selectedMonths.map((mo) => MONTH_NUM[mo.toUpperCase()]).filter((n) => n !== undefined).sort((a, b) => a - b)
          : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

        // Search up to 5 years ahead
        for (let i = 0; i < 60; i++) {
          const cursor = now.add(i, 'month');
          if (!validMonths.includes(cursor.month())) continue;
          const day = Math.min(monthDate, cursor.daysInMonth());
          const candidate = cursor.date(day).hour(h).minute(m).second(0).millisecond(0);
          if (candidate.isAfter(now)) return fmt(candidate);
        }
        return '--';
      }

      case 'CUSTOM': {
        if (!startDate || !startTime || !customFrequency) return '--';
        const base = dt(startDate, startTime);
        const end = endDate ? dayjs(`${endDate}T23:59:59`) : null;
        if (end && now.isAfter(end)) return 'Schedule ended';

        const unit = customFrequency === 'DAILY' ? 'day' : customFrequency === 'WEEKLY' ? 'week' : 'month';
        if (base.isAfter(now)) return fmt(base);
        const diff = now.diff(base, unit);
        let next = base.add(Math.ceil(diff / interval) * interval, unit);
        if (!next.isAfter(now)) next = next.add(interval, unit);
        if (end && next.isAfter(end)) return 'Schedule ended';
        return fmt(next);
      }

      default:
        return '--';
    }
  } catch {
    return '--';
  }
}

const SF_ERROR_MESSAGES: Record<string, string> = {
  REQUEST_LIMIT_EXCEEDED: 'Your Salesforce API request limit has been reached. Please wait a few minutes and try again, or contact your Salesforce admin to increase the limit.',
  QUERY_TIMEOUT: 'The Salesforce query timed out. Please try again.',
  INVALID_SESSION_ID: 'Your Salesforce session has expired. Please reconnect your platform.',
  INSUFFICIENT_ACCESS: 'You do not have sufficient permissions in Salesforce to perform this action.',
  FIELD_INTEGRITY_EXCEPTION: 'A field integrity error occurred in Salesforce. Please check your filter values.',
};

export function parseSalesforceError(err: unknown): { title: string; detail: string } {
  const raw: string = (err as any)?.message ?? (err as any)?.response?.data?.message ?? String(err ?? '');

  // Try to extract JSON array from the error string e.g. HTTP Error 403: [{"errorCode":"...","message":"..."}]
  try {
    const match = raw.match(/\[(\{.+\})\]/s);
    if (match) {
      const parsed = JSON.parse(`[${match[1]}]`);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      const code: string = first?.errorCode ?? first?.error_code ?? '';
      const msg: string = first?.message ?? '';
      if (code && SF_ERROR_MESSAGES[code]) {
        return { title: 'Salesforce API Limit Reached', detail: SF_ERROR_MESSAGES[code] };
      }
      if (msg) return { title: 'Salesforce Error', detail: msg };
    }
  } catch { /* fall through */ }

  // Plain string match on known codes
  for (const [code, friendly] of Object.entries(SF_ERROR_MESSAGES)) {
    if (raw.includes(code)) return { title: 'Salesforce API Limit Reached', detail: friendly };
  }

  return { title: 'Failed to load objects', detail: raw || 'Something went wrong. Please try again.' };
}
