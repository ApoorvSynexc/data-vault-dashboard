import { useHttpRequest } from '../../hooks/useHttpRequest';

export const ARCHIVAL_ENDPOINTS = {
  fields: '/v1/archival-config/fields',
  objectChilds: '/v1/archival-config/object-childs',
  config: '/v1/archival-config',
} as const;

export type ObjectScheduleConfig = {
  timeZone: string;
  type: string;
  scheduling: {
    frequency: string;
    interval: number;
    startDate?: string;
    startTime?: string;
    weekDays?: string[];
    monthDate?: number;
    selectedMonths?: string[];
    endDate?: string;
  };
};

export type ArchivalConfigChild = {
  name: string;
  type: 'STANDARD' | 'CUSTOM';
  condition: { type: 'AND' | 'OR' };
  field: { name: string; filter: { value: string; operator: string } }[];
};

export type ArchivalConfigObject = {
  name: string;
  type: 'STANDARD' | 'CUSTOM';
  condition: { type: 'AND' | 'OR' };
  field: { name: string; filter: { value: string; operator: string } }[];
  scheduleConfig: ObjectScheduleConfig;
  children?: ArchivalConfigChild[];
};

export type CreateArchivalConfigPayload = {
  crmId: string;
  name: string;
  description: string;
  destinationId: string;
  objectNames: string[];
  schedule: string;
  objects: ArchivalConfigObject[];
  backupStatus: string;
};

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
    getObjectChilds: (crmId: string, objectName: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.objectChilds, { query: { crmId, objectName } }),
    applyConfig: (payload: CreateArchivalConfigPayload): Promise<any> =>
      http.post(ARCHIVAL_ENDPOINTS.config, payload),
  };
}
