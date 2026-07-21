import { useHttpRequest } from '../../hooks/useHttpRequest';

const RESTORE_ENDPOINTS = {
  fetchRecords:       '/v1/restore/retrieve/fetch-records',
  backupConfigsName:  '/v1/restore/get-backup-configs-name',
  crmObjects:         '/v1/crm-metadata/objects/list',
  crmFields:          '/v1/crm-metadata/fields/list',
  objectListByJobIds: '/v1/restore/get-objectlist-by-backup-jobids',
};

export function useRestoreService() {
  const api = useHttpRequest();

  return {
    fetchRecords: (payload:
      | { configType: 'BACKUP';   objectApiName: string; columnNames: string[]; backupJobIds: string[] }
      | { configType: 'ARCHIVAL'; objectApiName: string; columnNames: string[]; backupConfigId: string }
    ) => api.post<unknown>(RESTORE_ENDPOINTS.fetchRecords, payload),

    getBackupConfigsName: (destinationId: string) =>
      api.get<{ data: { backupConfigId: string; name: string }[] }>(
        RESTORE_ENDPOINTS.backupConfigsName,
        { query: { destinationId } },
      ),

    getCrmObjects: (crmId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.crmObjects, { query: { crmId } }),

    getCrmFields: (crmId: string, objectName: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.crmFields, { query: { crmId, objectName } }),

    getObjectListByJobIds: (backupJobIds: string[]) =>
      api.get<{ data: Record<string, string[]> }>(RESTORE_ENDPOINTS.objectListByJobIds, { query: { backupJobIds } }),
  };
}
