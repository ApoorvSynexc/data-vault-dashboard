import { useHttpRequest } from '../../hooks/useHttpRequest';

const RESTORE_ENDPOINTS = {
  fetchRecords:       '/v1/restore/retrieve/fetch-records',
  backupConfigsName:  '/v1/restore/get-backup-configs-name',
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
  };
}
