import { useHttpRequest } from '../../hooks/useHttpRequest';

export type StorageOverview = Record<string, unknown>;
export type LastBackupConfigType = 'NORMAL' | 'ARCHIVAL';
export type LastBackupConfig = Record<string, unknown>;

export function useStorageService() {
  const api = useHttpRequest();

  return {
    getOverview: () => api.get<StorageOverview>('/v1/storage/overview'),
    getLastBackupConfig: (type: LastBackupConfigType) =>
      api.get<LastBackupConfig>('/v1/storage/last-backup-config', { query: { type } }),
  };
}
