// Archival Service — all API calls specific to the Archive Vault feature.
// Uses the shared HTTP client (useHttpRequest) which handles auth tokens,
// 401 refresh retries, and response envelope unwrapping automatically.
import { useHttpRequest } from '../../hooks/useHttpRequest';

// All archival endpoint paths in one place so URL changes only need to happen here
export const ARCHIVAL_ENDPOINTS = {
  fields: '/v1/archival-config/fields',
  picklistValues: '/v1/archival-config/get-picklist-field-values',
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
  runNow: '/v1/archival-config/run-now',
} as const;

// Informational marker the backend attaches (per-object) when a manual Run Now
// causes that object's next automatically-scheduled run to be skipped.
export type IUpcomingJob = {
  skip: boolean;
  skipReason?: string;
  skipDateTime?: string;
};

// Schedule config shape stored inside an archival config object
export type ObjectScheduleConfig = {
  timeZone: string;
  type: string;
  scheduling: {
    frequency: string;  // ONCE | HOURLY | DAILY | WEEKLY | MONTHLY | CUSTOM
    interval: number;
    startDate?: string;
    startTime?: string;
    weekDays?: string[];     // for WEEKLY — e.g. ["MON","WED","FRI"]
    monthDate?: number;      // for MONTHLY — day of month (1–31)
    selectedMonths?: string[];
    endDate?: string;        // for CUSTOM frequency
  };
};

// A child object nested under a parent in the archival payload
export type ArchivalConfigChild = {
  name: string;
  type: 'STANDARD' | 'CUSTOM';
  condition: { type: 'AND' | 'OR' };
  field: { name: string; filter: { value: string; operator: string } }[];
};

// A top-level object in the archival payload (can have nested children)
export type ArchivalConfigObject = {
  name: string;
  type: 'STANDARD' | 'CUSTOM';
  condition: { type: 'AND' | 'OR' };
  field: { name: string; filter: { value: string; operator: string } }[];
  scheduleConfig: ObjectScheduleConfig;
  children?: ArchivalConfigChild[];
};

// The full request body for POST /v1/archival-config (create/draft)
export type CreateArchivalConfigPayload = {
  crmId: string;
  name: string;
  description: string;
  destinationId: string;
  objectNames: string[];   // flat list of object API names for quick reference
  schedule: string;        // always "SCHEDULE"
  objects: ArchivalConfigObject[];
  backupStatus: string;    // "ACTIVE" for live, "DRAFT" for draft save
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

// Shape of each child relationship row returned by GET /v1/archival-config/object-childs
export type ArchivalChildObject = {
  uuid: string;            // generated client-side (crypto.randomUUID) for React key usage
  apiName: string;
  label: string;
  relationshipType?: string;  // "MasterDetail" | "Lookup"
  objectType?: string;
  [key: string]: unknown;
};

// A single archive job run record
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

// Paginated response from GET /v1/archival-job/list
export type ArchivalJobListApiResponse = {
  success: boolean;
  message: string;
  data: ArchivalJobItem[];
  meta: {
    limit: number;
    nextCursor: string | null;   // pass as ?cursor= on next page request
    totalRecords: number;
    totalPages: number;
  };
};

// React hook that returns all archival API methods bound to the current HTTP client instance
export function useArchivalService() {
  const http = useHttpRequest();

  return {
    // GET /v1/archival-config/fields?crmId=&objectName=&mode=ARCHIVAL
    // Returns all fields on a Salesforce object for building filter conditions
    getFields: (crmId: string, objectName: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.fields, { query: { crmId, objectName: objectName, mode: 'ARCHIVAL' } }),

    // GET /v1/archival-config/get-picklist-field-values?crmId=&objectApiName=&fieldApiName=
    getPicklistValues: (crmId: string, objectApiName: string, fieldApiName: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.picklistValues, { query: { crmId, objectApiName, fieldApiName } }),

    // GET /v1/archival-config/object-childs?crmId=&objectName=&mode=ARCHIVAL
    // Returns child relationship objects. UUIDs are generated client-side because
    // the API doesn't return stable IDs for child relationships.
    getObjectChilds: async (crmId: string, objectName: string): Promise<ArchivalChildObject[]> => {
      const result = await http.get<any>(ARCHIVAL_ENDPOINTS.objectChilds, { query: { crmId, objectName, mode: 'ARCHIVAL' } });
      const payload = result?.data ?? result;
      // API may return children under different keys depending on version
      const arr: any[] = payload?.childs ?? payload?.children ?? payload?.childObjects ?? payload ?? [];
      if (!Array.isArray(arr)) return [];
      return arr.map((row: any) => ({
        ...row,
        uuid: crypto.randomUUID(),
        apiName: row.apiName ?? row.id ?? '',
        label: row.label ?? row.name ?? row.apiName ?? '',
      }));
    },

    // POST /v1/archival-config — creates a new archive policy or saves a draft
    applyConfig: (payload: CreateArchivalConfigPayload): Promise<any> =>
      http.post(ARCHIVAL_ENDPOINTS.config, payload),

    // GET /v1/archival-config/list — paginated archive policies for this workspace
    getList: async (cursor?: string, search?: string, status?: string, backupStatus?: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.list, {
        query: {
          pagination: true,
          limit: 25,
          ...(cursor ? { cursor } : {}),
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
          ...(backupStatus ? { backupStatus } : {}),
        },
      }),

    // GET /v1/archival-config?slug= — full detail of one policy including object tree
    getDetail: (slug: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.detail, { query: { slug } }),

    // PUT /v1/archival-config?backupConfigId= — update status (ACTIVE, PAUSED, etc.)
    updateConfig: (backupConfigId: string, payload: Record<string, unknown>): Promise<any> =>
      http.put(ARCHIVAL_ENDPOINTS.update, payload, { query: { backupConfigId } }),

    // DELETE /v1/archival-config?backupConfigId= — permanently remove a policy
    deleteConfig: (backupConfigId: string): Promise<any> =>
      http.delete(ARCHIVAL_ENDPOINTS.delete, { query: { backupConfigId } }),

    // GET /v1/archival-config/stats — aggregate counts (total configs, size, records)
    getStats: (): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.stats),

    // GET /v1/archival-job/list — paginated archive job run history
    // Supports cursor-based pagination: pass the nextCursor from the previous response
    listJobs: async (slug: string, pagination = true, cursor?: string, limit = 20, status?: string) => {
      const query: any = { slug, pagination, limit };
      if (cursor) query.cursor = cursor;
      if (status) query.status = status.toUpperCase();
      return http.get<ArchivalJobListApiResponse>(ARCHIVAL_ENDPOINTS.jobs, { query });
    },

    // POST /v1/archival-config/dry-run
    // Simulates the archive against live Salesforce data — counts matching records
    // per object without moving or deleting anything
    runDryRun: (payload: { crmId: string; objects: unknown[] }): Promise<any> =>
      http.post(ARCHIVAL_ENDPOINTS.dryRun, payload),

    // POST /v1/archival-config/validate-soql
    // Validates a user-entered SOQL WHERE clause. Returns isValid and relationshipDepth.
    // relationshipDepth controls how many child levels can be added (MAX_CHILD_DEPTH - depth)
    validateSoql: (payload: { object: unknown; isParent: boolean; crmId: string }): Promise<any> =>
      http.post(ARCHIVAL_ENDPOINTS.validateSoql, payload),

    // GET /v1/archival-config/run-now?backupConfigId=
    // Manually triggers a job for every currently-eligible object on this config.
    runNow: (backupConfigId: string): Promise<any> =>
      http.get(ARCHIVAL_ENDPOINTS.runNow, { query: { backupConfigId } }),

    // GET /v1/archival-config/record-errors?backupJobId=&objectId=&page=
    // Returns a page of per-record delete errors stored in S3 (10 records per page).
    // Each batch file in S3 holds 200 records; page→file mapping is deterministic.
    getRecordErrors: (backupJobId: string, objectId: string, page: number) =>
      http.get<{ records: { recordId: string; error: string }[]; totalRecords: number; totalPages: number; page: number }>(
        '/v1/archival-config/record-errors', { query: { backupJobId, objectId, page } },
      ),
  };
}
