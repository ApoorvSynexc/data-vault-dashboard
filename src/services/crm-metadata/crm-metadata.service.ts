import { useHttpRequest } from '../../hooks/useHttpRequest';

const CRM_METADATA_ENDPOINTS = {
  objectList: '/v1/crm-metadata/objects/list',
  masterObjectList: '/v1/crm-metadata/objects/master/list',
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

export type MasterObjectItem = {
  objectName: string;
  objectDescription: {
    name: string;
    label: string;
    labelPlural: string;
    custom: boolean;
    queryable: boolean;
    createable: boolean;
    deletable: boolean;
    updateable: boolean;
    fields: {
      name: string;
      label: string;
      type: string;
      [key: string]: unknown;
    }[];
    [key: string]: unknown;
  };
};

type ObjectListResponse = {
  success: boolean;
  message: string;
  data: CrmMetadataObject[];
};

type MasterObjectListResponse = {
  success: boolean;
  message: string;
  data: MasterObjectItem[];
};

export function useCrmMetadataService() {
  const api = useHttpRequest();

  return {
    getObjectList: (mode: 'backup' | 'archive' | 'restore', type?: 'schedule' | 'realtime') =>
      api.get<ObjectListResponse>(CRM_METADATA_ENDPOINTS.objectList, {
        query: { mode, ...(type ? { type } : {}) },
      }),

    getMasterObjectList: (objectNames: string[]) =>
      api.post<MasterObjectListResponse>(CRM_METADATA_ENDPOINTS.masterObjectList, {
        objectNames,
      }),
  };
}
