import { useHttpRequest } from '../../hooks/useHttpRequest';

const RESTORE_ENDPOINTS = {
  snapshotLogs:       '/v1/restore/snapshot-logs',
  fetchRecords:       '/v1/restore/retrieve/fetch-records',
  backupConfigsName:  '/v1/restore/get-backup-configs-name',
};

export type SnapshotType = 'BACKUP' | 'ARCHIVAL' | 'UNIFIED';
export type ScheduleType = 'REALTIME' | 'SCHEDULE';

export interface SnapshotLog {
  backupConfigId: string;
  backupJobId: string;
  dateTime: string;
  configName: string;
  sourceName: string;
  dataSize: number;
  backupType: 'Scheduled' | 'RealTime';
  status: string;
  // Realtime-only
  recordCount?: number;
  objectApiName?: string;
  operation?: string;
}

export interface ArchivalLog {
  dateTime: string;
  configName: string;
  sourceName: string;
  dataSize: number;
  backupType: string;
  status: string;
}

export interface SnapshotLogsMeta {
  limit: number;
  nextCursor: string | null;
}

export interface SnapshotLogsResponse {
  success: boolean;
  message: string;
  data: SnapshotLog[];
  meta: SnapshotLogsMeta;
}

export interface ArchivalLogsResponse {
  success: boolean;
  message: string;
  data: ArchivalLog[];
  meta: SnapshotLogsMeta;
}

export interface SnapshotLogsParams {
  snapshotType: SnapshotType;
  destinationId: string;
  scheduleType?: ScheduleType; // only valid when snapshotType === 'BACKUP'
  limit?: number;
  cursor?: string;             // omit on first page
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
          ...(params.limit ? { limit: params.limit } : {}),
          ...(params.cursor ? { cursor: params.cursor } : {}),
        },
      }),

    fetchRecords: (payload:
      | { configType: 'BACKUP';   objectApiName: string; columnNames: string[]; backupJobIds: string[] }
      | { configType: 'ARCHIVAL'; objectApiName: string; columnNames: string[]; backupConfigId: string }
    ) => api.post<unknown>(RESTORE_ENDPOINTS.fetchRecords, payload),

    getBackupConfigsName: (destinationId: string) =>
      api.get<{ data: { backupConfigId: string; name: string }[] }>(
        RESTORE_ENDPOINTS.backupConfigsName,
        { query: { destinationId } },
      ),
  };
}
