import { useHttpRequest } from '../../hooks/useHttpRequest';
import type {
  CreateBackupPayload,
  DataScopeRow,
  ObjectField,
} from '../../pages/BackupManagement/AddBackupModal/types';

export const BACKUP_CONFIG_ENDPOINTS = {
  create: '/v1/backup/create',
  objectList: '/v1/backup-config/objects',
  objectFields: '/v1/backup-config/object-fields',
} as const;

type ObjectListApiItem = {
  label: string;
  apiName: string;
};

type ObjectListApiResponse = {
  success: boolean;
  objects: ObjectListApiItem[];
  message: string | null;
};

export function useBackupConfigService() {
  const api = useHttpRequest();

  return {
    createBackupConfig: (payload: CreateBackupPayload) =>
      api.post<void>(BACKUP_CONFIG_ENDPOINTS.create, payload),
    getObjectList: async (crmId: string) => {
      const response = await api.get<ObjectListApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectList, {
        query: { crmId },
      });

      return response.objects.map(
        (item): DataScopeRow => ({
          id: item.apiName,
          name: item.label,
          type: 'Object',
          estimatedSize: '--',
          backupMode: 'both',
        }),
      );
    },
    getObjectFields: (crmId: string, objectName: string) =>
      api.get<ObjectField[]>(BACKUP_CONFIG_ENDPOINTS.objectFields, {
        query: { crmId, objectName },
      }),
  };
}
