import { useHttpRequest } from '../../hooks/useHttpRequest';
import type { CreateBackupPayload } from '../../pages/BackupManagement/AddBackupModal/types';

export function useBackupService() {
  const api = useHttpRequest();

  return {
    createBackup: (payload: CreateBackupPayload) =>
      api.post<void>('/v1/backup/create', payload),
  };
}
