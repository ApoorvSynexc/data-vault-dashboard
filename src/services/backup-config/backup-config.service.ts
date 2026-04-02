import { useHttpRequest } from '../../hooks/useHttpRequest';
import type {
  CreateBackupPayload,
  DataScopeRow,
  FieldDataType,
  ObjectField,
} from '../../pages/BackupManagement/AddBackupModal/types';

export const BACKUP_CONFIG_ENDPOINTS = {
  create: '/v1/backup/create',
  objectList: '/v1/backup-config/objects',
  objectFields: '/v1/backup-config/fields',
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

type ObjectFieldApiItem = {
  label: string;
  dataType: string;
  apiName: string;
};

type ObjectFieldApiResponse = {
  success: boolean;
  objectLabel: string;
  objectApiName: string;
  fields: ObjectFieldApiItem[];
  count: number;
};

const FIELD_DATA_TYPE_MAP: Record<string, FieldDataType> = {
  STRING: 'string',
  TEXTAREA: 'string',
  EMAIL: 'string',
  PHONE: 'string',
  URL: 'string',
  PICKLIST: 'string',
  MULTIPICKLIST: 'string',
  NUMBER: 'number',
  DOUBLE: 'number',
  CURRENCY: 'number',
  PERCENT: 'number',
  INT: 'number',
  INTEGER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DATETIME: 'datetime',
  ID: 'id',
  REFERENCE: 'id',
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
    getObjectFields: async (crmId: string, objectName: string) => {
      const response = await api.get<ObjectFieldApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectFields, {
        query: { crmId, objectName },
      });

      return response.fields.map(
        (field): ObjectField => ({
          name: field.apiName,
          label: field.label,
          dataType: FIELD_DATA_TYPE_MAP[field.dataType.toUpperCase()] ?? 'string',
        }),
      );
    },
  };
}
