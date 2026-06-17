import { useHttpRequest } from '../../hooks/useHttpRequest';

const RESTORE_ENDPOINTS = {
  snapshotLogs: '/v1/restore-retrieve/snapshot-logs',
};

export type SnapshotType = 'BACKUP' | 'ARCHIVAL' | 'UNIFIED';
export type ScheduleType = 'REALTIME' | 'SCHEDULE';

export interface SnapshotLog {
  dateTime: string;
  configName: string;
  sourceName: string;
  dataSize: number;
}

export interface SnapshotLogsResponse {
  data: SnapshotLog[];
  meta?: Record<string, unknown>;
}

export interface SnapshotLogsParams {
  snapshotType: SnapshotType;
  destinationId: string;
  scheduleType?: ScheduleType; // only applicable when snapshotType === 'BACKUP'
}

export function useRestoreService() {
  const api = useHttpRequest();

  return {
    getSnapshotLogs: (params: SnapshotLogsParams) =>
      api.get<SnapshotLogsResponse>(RESTORE_ENDPOINTS.snapshotLogs, {
        query: {
          snapshotType: params.snapshotType,
          destinationId: params.destinationId,
          ...(params.snapshotType === 'BACKUP' && params.scheduleType
            ? { scheduleType: params.scheduleType }
            : {}),
        },
      }),
  };
}
