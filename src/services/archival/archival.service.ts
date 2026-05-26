import { useHttpRequest } from '../../hooks/useHttpRequest';

export const ARCHIVAL_ENDPOINTS = {
  fields: '/v1/archival-config/fields',
} as const;

export type ArchivalField = {
  name: string;
  label: string;
  type?: string;
};

export type ArchivalObjectFilter = {
  name: string;
  condition: { type: 'AND' | 'OR' };
  field: { name: string; filter: { value: string; operator: string } }[];
};

export function useArchivalService() {
  const http = useHttpRequest();

  return {
    getFields: (crmId: string, objectName: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.fields, { query: { crmId, objectName: objectName } }),
  };
}
