import { useHttpRequest } from '../../hooks/useHttpRequest';

const CRM_METADATA_ENDPOINTS = {
  objectList:    '/v1/crm-metadata/objects/list',
  allObjectList: '/v1/crm-metadata/all-objects/list',
  objectDescribe: '/v1/crm-metadata/objects/describe',
  objectDepthChildren: '/v1/crm-metadata/object/depth-children',
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

// Same per-node shape as the describe endpoint's `children`, but each node can
// itself carry a nested `children` array (relationships followed to full depth).
export type DepthChildNode = {
  name: string;
  cascadeDelete: boolean;
  restrictedDelete: boolean;
  // The relationship field on this object that points back to its parent (e.g. "AccountId")
  field?: string;
  children?: DepthChildNode[];
  [key: string]: unknown;
};

type ObjectDepthChildrenResponse = {
  children?: DepthChildNode[];
};

export function useCrmMetadataService() {
  const api = useHttpRequest();

  return {
    getObjectList: (mode: 'backup' | 'archive' | 'restore', type?: 'schedule' | 'realtime') =>
      api.get<ObjectListResponse>(CRM_METADATA_ENDPOINTS.objectList, {
        query: { mode, ...(type ? { type } : {}) },
      }),

    getAllObjectList: (name = 'Account') =>
      api.get<CrmMetadataObject[]>(CRM_METADATA_ENDPOINTS.allObjectList, {
        query: { name },
      }),

    getObjectDescribe: (objectName: string, mode?: 'normal' | 'archival', type?: 'realtime' | 'schedule', relationshipDepth?: number) =>
      api.get<unknown>(CRM_METADATA_ENDPOINTS.objectDescribe, {
        query: {
          objectName,
          ...(mode ? { mode } : {}),
          ...(type ? { type } : {}),
          relationshipDepth: relationshipDepth ?? 0,
        },
      }),

    getObjectDepthChildren: (objectName: string, mode?: 'normal' | 'archival', type?: 'realtime' | 'schedule', relationshipDepth?: number) =>
      api.get<ObjectDepthChildrenResponse>(CRM_METADATA_ENDPOINTS.objectDepthChildren, {
        query: {
          objectName,
          ...(mode ? { mode } : {}),
          ...(type ? { type } : {}),
          relationshipDepth: relationshipDepth ?? 0,
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
