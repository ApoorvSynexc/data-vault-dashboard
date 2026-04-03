import { useHttpRequest } from '../../hooks/useHttpRequest';
import type {
  CreateBackupPayload,
  DataScopeRow,
  FieldDataType,
  ObjectField,
} from '../../pages/BackupManagement/AddBackupModal/types';

export const BACKUP_CONFIG_ENDPOINTS = {
  create: '/v1/backup-config',
  list: '/v1/backup-config/list',
  objectList: '/v1/backup-config/objects',
  objectFields: '/v1/backup-config/fields',
} as const;

type BackupConfigItem = {
  backupConfigId: string;
  crmId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | string;
  schedule?: 'SCHEDULE' | 'REALTIME' | string;
  backupStatus?: 'SUCCESS' | 'FAILED' | 'RUNNING' | string;
  lastBackupAt?: string;
  sizeInBytes?: number;
  platform?: string;
  [key: string]: unknown;
};

type BackupConfigListApiResponse = {
  success: boolean;
  message: string;
  data: BackupConfigItem[];
  meta: {
    limit: number;
    nextCursor: string | null;
    totalRecords: number;
    totalPages: number;
  };
};

type ObjectListApiItem = {
  label: string;
  apiName: string;
  isBackedUp?: boolean;
  schedule?: 'schedule' | 'realtime';
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
    listBackupConfigs: async (pagination = true, cursor?: string) => {
      const response = await api.get<BackupConfigListApiResponse>(BACKUP_CONFIG_ENDPOINTS.list, {
        query: { pagination, cursor, limit: 20 },
      });

      return response;
    },
    getObjectList: async (crmId: string) => {
      const response = await api.get<ObjectListApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectList, {
        query: { crmId },
      });

      if (!response.data) {
        throw new Error('Invalid response from objectList API');
      }

      return response.data.objects.map(
        (item): DataScopeRow => ({
          id: item.apiName,
          name: item.label,
          type: 'Object',
          estimatedSize: '--',
          backupMode: 'both',
          isBackedUp: item.isBackedUp,
          schedule: item.schedule,
        }),
      );
    },
    getObjectFields: async (crmId: string, objectName: string) => {
      const response = await api.get<ObjectFieldApiResponse>(BACKUP_CONFIG_ENDPOINTS.objectFields, {
        query: { crmId, objectName },
      });

      if (!response.data) {
        throw new Error('Invalid response from objectFields API');
      }

      return response.data.fields.map(
        (field): ObjectField => ({
          name: field.apiName,
          label: field.label,
          dataType: FIELD_DATA_TYPE_MAP[field.dataType.toUpperCase()] ?? 'string',
        }),
      );
    },
  };
}
