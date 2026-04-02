import { useHttpRequest } from '../../hooks/useHttpRequest';
import type {
  CreateBackupPayload,
  DataScopeRow,
  ObjectField,
} from '../../pages/BackupManagement/AddBackupModal/types';

export const BACKUP_CONFIG_ENDPOINTS = {
  create: '/v1/backup/create',
  objectList: '/v1/backup-config/object-list',
  objectFields: '/v1/backup-config/object-fields',
} as const;

export function useBackupConfigService() {
  const api = useHttpRequest();

  return {
    createBackupConfig: (payload: CreateBackupPayload) =>
      api.post<void>(BACKUP_CONFIG_ENDPOINTS.create, payload),
    getObjectList: (crmId: string) =>
      api.get<DataScopeRow[]>(BACKUP_CONFIG_ENDPOINTS.objectList, {
        query: { crmId },
      }),
    getObjectFields: (crmId: string, objectName: string) =>
      api.get<ObjectField[]>(BACKUP_CONFIG_ENDPOINTS.objectFields, {
        query: { crmId, objectName },
      }),
  };
}
