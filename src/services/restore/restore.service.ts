import { useHttpRequest } from '../../hooks/useHttpRequest';

// ── Restore-retrieve payload types ────────────────────────────────────────────

export interface RestoreRetrievePayload {
  crmId?: string;

  source: {
    backupJobIds?: string[];
    backupConfigId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  };

  selection: {
    restoreScope: RestoreScope;
  };

  destination: {
    type: 'SAME' | 'DIFFERENT';
    crmId?: string;
    tagRestoredRecord?: string;
  };

  conflict: {
    restoreMode: 'OVERWRITE' | 'APPEND_NEW' | 'REPLACE_ENTIRE_OBJECT' | 'SKIP';
  };

  restoreType?: 'RESTORE_ONLY_CHANGED_FIELDS' | 'RESTORE_ENTIRE_RECORD';

  jobDetail?: {
    name: string;
    description?: string;
    tags?: string[];
  };

  schedule: RestoreSchedule;
}

export type RestoreScope =
  | { type: 'ALL' }
  | { type: 'OBJECT'; objects: string[] }
  | { type: 'RECORD'; records: { objectName: string; recordIds: string[] }[] }
  | { type: 'FIELD'; fields: { objectName: string; fieldNames: string[] }[] }
  | { type: 'FILTER'; filters: RestoreFilter }
  | { type: 'CHANGE_SINCE'; changeSince: { date: string } }
  | { type: 'BULK_CSV'; bulkCsvIds: string[] }
  | { type: 'DELETED_ONLY'; deletedOnly: true };

export type RestoreFilter =
  | { type: 'SOQL'; soqlQuery: string }
  | {
      type: 'AND' | 'OR';
      fields: {
        name: string;
        dataType: string;
        operator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'IN' | 'LIKE';
        value: string;
      }[];
    };

export interface RestoreSchedule {
  type: 'ONE_TIME' | 'INCREMENTAL';
  timeZone: string;
  scheduling?: {
    frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' | 'ONCE';
    interval?: number;
    weekDays?: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
    monthDate?: number;
    selectedMonths?: ('JAN' | 'FEB' | 'MAR' | 'APR' | 'MAY' | 'JUN' | 'JUL' | 'AUG' | 'SEP' | 'OCT' | 'NOV' | 'DEC')[];
    startDate?: string;
    endDate?: string;
    startTime?: string;
  };
}

// ── fetchRecords payload ──────────────────────────────────────────────────────

export interface FetchRecordsPayload {
  source: {
    backupConfigId: string;
    type: 'ENTIRE' | 'PARTIAL' | 'CHANGED_BETWEEN';
    startDate?: string;
    endDate?: string;
    backupJobIds?: string[];
  };
  objectApiName: string;
  columns: string[];
  selection?: unknown;
  fullRestore?: boolean;
  cursor?: string;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

const RESTORE_ENDPOINTS = {
  fetchRecords:         '/v1/restore/retrieve/fetch-records',
  backupConfigsName:    '/v1/restore/get-backup-configs-name',
  crmObjects:           '/v1/crm-metadata/objects/list',
  crmFields:            '/v1/crm-metadata/fields/list',
  objectListByConfigId: '/v1/restore/get-objectlist-by-configid',
  fetchObjectFields:    '/v1/restore/fetch-object-fields',
  picklistValues:       '/v1/restore/get-picklist-field-values',
  createRestoreJob:     '/v1/restore',
  listRestoreJobs:      '/v1/restore/config/list',
  getRestoreJob:        '/v1/restore/job',
};

export function useRestoreService() {
  const api = useHttpRequest();

  return {
    fetchRecords: (payload: FetchRecordsPayload) =>
      api.post<unknown>(RESTORE_ENDPOINTS.fetchRecords, payload),

    getBackupConfigsName: (destinationId: string) =>
      api.get<{ data: { backupConfigId: string; name: string }[] }>(
        RESTORE_ENDPOINTS.backupConfigsName,
        { query: { destinationId } },
      ),

    getCrmObjects: (crmId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.crmObjects, { query: { crmId } }),

    getCrmFields: (crmId: string, objectName: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.crmFields, { query: { crmId, objectName } }),

    getObjectListByConfigId: (backupConfigId: string, configType: 'BACKUP' | 'ARCHIVAL') =>
      api.get<unknown>(RESTORE_ENDPOINTS.objectListByConfigId, { query: { backupConfigId, configType } }),

    fetchObjectFields: (objectApiName: string, backupConfigId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.fetchObjectFields, { query: { objectApiName, backupConfigId } }),

    getPicklistValues: (objectApiName: string, fieldApiName: string, backupConfigId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.picklistValues, { query: { objectApiName, fieldApiName, backupConfigId } }),

    createRestoreJob: (payload: RestoreRetrievePayload) =>
      api.post<{ success: boolean; message: string }>(RESTORE_ENDPOINTS.createRestoreJob, payload),

    listRestoreJobs: (search?: string, status?: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.listRestoreJobs, {
        query: {
          pagination: true,
          limit: 25,
          ...(search && { search }),
          ...(status && status !== 'All' && { status }),
        },
      }),

    getRestoreJob: (restoreId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.getRestoreJob, { query: { restoreId } }),
  };
}
