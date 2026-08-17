import { useHttpRequest } from '../../hooks/useHttpRequest';

const CRM_METADATA_ENDPOINTS = {
  objectList: '/v1/crm-metadata/objects/list',
} as const;

export function useCrmMetadataService() {
  const api = useHttpRequest();

  return {
    getObjectList: (mode: 'backup' | 'archive' | 'restore', type?: 'schedule' | 'realtime') =>
      api.get<any>(CRM_METADATA_ENDPOINTS.objectList, {
        query: { mode, ...(type ? { type } : {}) },
      }),
  };
}
