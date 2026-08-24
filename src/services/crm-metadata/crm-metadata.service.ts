import { useHttpRequest } from '../../hooks/useHttpRequest';

const CRM_METADATA_ENDPOINTS = {
  objectList: '/v1/crm-metadata/objects/list',
  objectDescribe: '/v1/crm-metadata/objects/describe',
  fieldList: '/v1/crm-metadata/fields/list',
} as const;

export type CrmMetadataObject = {
  name: string;
  label: string;
  custom: boolean;
  count: number;
  keyPrefix?: string;
  queryable?: boolean;
  createable?: boolean;
  deletable?: boolean;
  updateable?: boolean;
  [key: string]: unknown;
};

type ObjectListResponse = CrmMetadataObject[];

export function useCrmMetadataService() {
  const api = useHttpRequest();

  return {
    getObjectList: (mode: 'backup' | 'archive' | 'restore', type?: 'schedule' | 'realtime') =>
      api.get<ObjectListResponse>(CRM_METADATA_ENDPOINTS.objectList, {
        query: { mode, ...(type ? { type } : {}) },
      }),

    getObjectDescribe: (objectName: string, mode?: 'normal' | 'archival', type?: 'realtime' | 'schedule') =>
      api.get<unknown>(CRM_METADATA_ENDPOINTS.objectDescribe, {
        query: {
          objectName,
          ...(mode ? { mode } : {}),
          ...(type ? { type } : {}),
        },
      }),

    getObjectFields: (objectName: string, filterable?: boolean) =>
      api.get<unknown>(CRM_METADATA_ENDPOINTS.fieldList, {
        query: {
          objectName,
          ...(filterable !== undefined ? { filterable } : {}),
        },
      }),
  };
}
