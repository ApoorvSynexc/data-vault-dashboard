import { useHttpRequest } from '../../hooks/useHttpRequest';

export const ARCHIVAL_ENDPOINTS = {
  fields: '/v1/archival-config/fields',
  objectChilds: '/v1/archival-config/object-childs',
  config: '/v1/archival-config',
  list: '/v1/archival-config/list',
  detail: '/v1/archival-config',
  jobs: '/v1/archival-job/list',
  update: '/v1/archival-config',
  delete: '/v1/archival-config',
  stats: '/v1/archival-config/stats',
  dryRun: '/v1/archival-config/dry-run',
  validateSoql: '/v1/archival-config/validate-soql',
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

export type ArchivalChildObject = {
  uuid: string;
  apiName: string;
  label: string;
  relationshipType?: string;
  objectType?: string;
  [key: string]: unknown;
};

export type ArchivalJobItem = {
  archivalJobId: string;
  archivalConfigId?: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | string;
  jobType?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  sizeInBytes?: number;
  newRecords?: number;
  totalRecords?: number;
  errorMessage?: string;
  [key: string]: unknown;
};

export type ArchivalJobListApiResponse = {
  success: boolean;
  message: string;
  data: ArchivalJobItem[];
  meta: {
    limit: number;
    nextCursor: string | null;
    totalRecords: number;
    totalPages: number;
  };
};

export function useArchivalService() {
  const http = useHttpRequest();

  return {
    getFields: (crmId: string, objectName: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.fields, { query: { crmId, objectName: objectName } }),
    getObjectChilds: async (crmId: string, objectName: string): Promise<ArchivalChildObject[]> => {
      const result = await http.get<any>(ARCHIVAL_ENDPOINTS.objectChilds, { query: { crmId, objectName } });
      const payload = result?.data ?? result;
      const arr: any[] = payload?.childs ?? payload?.children ?? payload?.childObjects ?? payload ?? [];
      if (!Array.isArray(arr)) return [];
      return arr.map((row: any) => ({
        ...row,
        uuid: crypto.randomUUID(),
        apiName: row.apiName ?? row.id ?? '',
        label: row.label ?? row.name ?? row.apiName ?? '',
      }));
    },
    applyConfig: (payload: CreateArchivalConfigPayload): Promise<any> =>
      http.post(ARCHIVAL_ENDPOINTS.config, payload),
    getList: (): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.list),
    getDetail: (slug: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.detail, { query: { slug } }),
    updateConfig: (backupConfigId: string, payload: Record<string, unknown>): Promise<any> =>
      http.put(ARCHIVAL_ENDPOINTS.update, payload, { query: { backupConfigId } }),
    deleteConfig: (backupConfigId: string): Promise<any> =>
      http.delete(ARCHIVAL_ENDPOINTS.delete, { query: { backupConfigId } }),
    getStats: (): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.stats),
    listJobs: async (slug: string, pagination = true, cursor?: string, limit = 20, status?: string) => {
      const query: any = { slug, pagination, limit };
      if (cursor) query.cursor = cursor;
      if (status) query.status = status.toUpperCase();
      return http.get<ArchivalJobListApiResponse>(ARCHIVAL_ENDPOINTS.jobs, { query });
    },
    runDryRun: (payload: { crmId: string; objects: unknown[] }): Promise<any> =>
      http.post(ARCHIVAL_ENDPOINTS.dryRun, payload),
    validateSoql: (payload: { object: unknown; isParent: boolean; crmId: string }): Promise<any> =>
      http.post(ARCHIVAL_ENDPOINTS.validateSoql, payload),
  };
}
