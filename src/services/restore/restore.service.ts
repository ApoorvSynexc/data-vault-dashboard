import { useHttpRequest } from '../../hooks/useHttpRequest';

// ── Restore scope types ───────────────────────────────────────────────────────

export interface RestoreScopeRecord {
  objectName: string;
  recordIds: string[];
}

export interface RestoreScopeField {
  objectName: string;
  fieldNames: string[];
}

export interface RestoreFilterField {
  name: string;
  dataType: string;
  operator: string;
  value: unknown;
}

export interface RestoreFilters {
  type: 'AND' | 'OR' | 'SOQL';
  soqlQuery?: string;
  fields?: RestoreFilterField[];
}

export interface RestoreScopeFilter {
  objectName: string;
  filter: RestoreFilters;
}

export interface RestoreBulkCsvIds {
  objectName: string;
  ids: string[];
}

export type RestoreScope =
  | { type: 'ALL' }
  | { type: 'OBJECT'; objects: string[] }
  | { type: 'RECORD'; records: RestoreScopeRecord[] }
  | { type: 'FIELD'; fields: RestoreScopeField[] }
  | { type: 'FILTER'; filters: RestoreScopeFilter[] }
  | { type: 'CHANGE_SINCE'; changeSince: { date: string } }
  | { type: 'BULK_CSV'; bulkCsvIds: RestoreBulkCsvIds[] }
  | { type: 'DELETED_ONLY'; deletedOnly: true }
  | { type: 'INSERTS_ONLY'; insertsOnly: true };

// ── Edge case types ───────────────────────────────────────────────────────────

export interface RestoreEdgeCaseFieldMapping {
  sourceObject: string;
  sourceFields: string;
  destinationObject: string;
  destinationFields: string;
}

export interface RestoreMissingFieldInDestination {
  type: string;
  sourceDestinationMapping?: RestoreEdgeCaseFieldMapping[];
}

// ── Missing-field detection (fetch-missing-fields) ─────────────────────────────

export interface MissingSourceField {
  apiName: string;
  label: string;
  type: string;
}

export interface FetchMissingFieldsResult {
  hasMissingFields: boolean;
  missingFields: MissingSourceField[];
}

export interface RestoreOwnerInactive {
  type: string;
  fallbackValue?: string;
}

export interface RestoreRecordTypeIdMapping {
  sourceRecordTypeId: string;
  destinationRecordTypeId: string;
}

export interface RestoreRecordTypeObjectMapping {
  name: string;
  mapping: RestoreRecordTypeIdMapping[];
}

export interface RestoreRecordTypeMissing {
  type: string;
  objects?: RestoreRecordTypeObjectMapping[];
}

// ── Missing/inactive record type detection (fetch-missing-record-types) ────────

export interface RecordTypeMappingCandidate {
  sourceRecordTypeId: string;
  sourceRecordTypeName: string;
  status: 'MISSING' | 'INACTIVE';
}

export interface ObjectRecordTypeMapping {
  objectApiName: string;
  recordTypes: RecordTypeMappingCandidate[];
}

export interface DestinationRecordType {
  recordTypeId: string;
  name: string;
  active: boolean;
}

// ── Required-field detection (required-fields) ──────────────────────────────

export interface RequiredField {
  fieldApiName: string;
  fieldLabel: string;
  dataType: string;
  picklistValues?: string[];
}

export interface RestoreMissingRequiredField {
  name: string;
  type: string;
  value: string;
}

export interface RestoreMissingRequiredFieldMapping {
  object: string;
  fields: RestoreMissingRequiredField[];
}

export interface RestoreMissingRequiredFieldValue {
  type: string;
  mapping?: RestoreMissingRequiredFieldMapping[];
}

export interface RestoreEdgeCases {
  onDuplicateRecord?: string;
  missingFieldInDestination?: RestoreMissingFieldInDestination;
  ownerInactive?: RestoreOwnerInactive;
  parentMissing?: string;
  recordTypeMissing?: RestoreRecordTypeMissing;
  missingRequiredFieldValue?: RestoreMissingRequiredFieldValue;
}

// ── Merge rule types ──────────────────────────────────────────────────────────

export interface RestoreMergeRuleField {
  name: string;
  value: string;
}

export interface RestoreMergeRuleObject {
  name: string;
  fields: RestoreMergeRuleField[];
}

export interface RestoreMergeRule {
  default: string;
  objects: RestoreMergeRuleObject[];
}

// ── Conflict ──────────────────────────────────────────────────────────────────

export interface RestoreConflict {
  restoreMode: 'OVERWRITE' | 'APPEND_NEW' | 'REPLACE_ENTIRE_OBJECT' | 'SKIP';
  edgeCases?: RestoreEdgeCases;
  mergeRule?: RestoreMergeRule;
}

// ── Top-level payload ─────────────────────────────────────────────────────────

export interface RestoreRetrievePayload {
  crmId?: string;

  source: {
    backupConfigId: string;
    configType?: 'BACKUP' | 'ARCHIVAL';
    type?: 'ENTIRE' | 'PARTIAL' | 'CHANGED_BETWEEN' | 'DELETED_BETWEEN';
    startDate?: string;
    endDate?: string;
    backupJobIds?: string[];
  };

  selection: {
    restoreScope: RestoreScope;
  };

  destination: {
    type: 'SAME' | 'DIFFERENT';
    crmId?: string;
    tagRestoredRecord?: string;
  };

  conflict: RestoreConflict;

  restoreType?: 'RESTORE_ONLY_CHANGED_FIELDS' | 'RESTORE_ENTIRE_RECORD';

  jobDetail?: {
    name?: string;
    description?: string;
    tags?: string[];
  };

  schedule: RestoreSchedule;
}

export interface RestoreSchedule {
  type: 'ONE_TIME' | 'INCREMENTAL';
  timeZone: string;
  scheduling?: {
    frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' | 'ONCE';
    interval?: number;
    weekDays?: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
    monthDate?: number;
    selectedMonths?: ('JAN' | 'FEB' | 'MAR' | 'APR' | 'MAY' | 'JUN' | 'JUL' | 'AUG' | 'SEP' | 'OCT' | 'NOV' | 'DEC')[];
    startDate?: string;
    endDate?: string;
    startTime?: string;
  };
}

// ── fetchRecords payload ──────────────────────────────────────────────────────

export type FetchRecordsPayload =
  | {
      backupConfigId: string;
      configType: 'BACKUP' | 'ARCHIVAL';
      objectApiName: string;
      type: 'ENTIRE';
      columnNames: string[];
      searchText?: string;
      cursor?: string;
    }
  | {
      backupConfigId: string;
      configType: 'BACKUP' | 'ARCHIVAL';
      objectApiName: string;
      type: 'CHANGED_BETWEEN';
      startDate: string;
      endDate: string;
      columnNames: string[];
      searchText?: string;
      cursor?: string;
    };

// ── showPreview payload ───────────────────────────────────────────────────────

export interface ShowPreviewPayload {
  source: {
    backupConfigId: string;
    configType?: 'BACKUP' | 'ARCHIVAL';
    type: 'ENTIRE' | 'PARTIAL' | 'CHANGED_BETWEEN' | 'DELETED_BETWEEN';
    backupJobIds?: string[];
    startDate?: string;
    endDate?: string;
  };
  objectApiName: string;
  recordIds?: string[];
  isDeleteOnly?: boolean;
  selection?: unknown;
  cursor?: string;
}

// ── Dry-run payload ───────────────────────────────────────────────────────────

export interface DryRunPayload {
  backupConfigId: string;
  configType: 'BACKUP' | 'ARCHIVAL';
  source: {
    type: 'ENTIRE' | 'CHANGED_BETWEEN';
    startDate?: string;
    endDate?: string;
  };
  selection: {
    restoreScope: RestoreScope;
  };
}

export interface DryRunDiffPayload extends DryRunPayload {
  limit?: number;
}

// ── Object list ───────────────────────────────────────────────────────────────

export interface RestoreSourceObject {
  id?: string;
  name: string;
  type: 'STANDARD' | 'CUSTOM' | string;
  completedRecordCount?: number;
  children?: RestoreSourceObject[];
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

const RESTORE_ENDPOINTS = {
  fetchRecords:         '/v1/restore/retrieve/fetch-records',
  showPreview:          '/v1/restore/retrieve/show-preview',
  backupConfigsName:    '/v1/restore/get-backup-configs-name',
  crmObjects:           '/v1/crm-metadata/objects/list',
  crmFields:            '/v1/crm-metadata/fields/list',
  objectListByConfigId: '/v1/restore/get-objectlist-by-configid',
  fetchObjectFields:    '/v1/restore/fetch-object-fields',
  fetchMissingFields:   '/v1/restore/retrieve/fetch-missing-fields',
  fetchMissingRecordTypes: '/v1/restore/retrieve/fetch-missing-record-types',
  crmRecordTypes:       '/v1/crm-metadata/record-types/list',
  requiredFields:       '/v1/restore/retrieve/required-fields',
  picklistValues:       '/v1/restore/get-picklist-field-values',
  dryRun:               '/v1/restore/dry-run',
  dryRunDiff:           '/v1/restore/dry-run-diff',
  createRestoreJob:     '/v1/restore',
  listRestoreJobs:      '/v1/restore/config/list',
  getRestoreJob:        '/v1/restore/job',
  jobStats:             '/v1/restore/job/stats',
};

export function useRestoreService() {
  const api = useHttpRequest();

  return {
    fetchRecords: (payload: FetchRecordsPayload) =>
      api.post<unknown>(RESTORE_ENDPOINTS.fetchRecords, payload),

    showPreview: (payload: ShowPreviewPayload) =>
      api.post<unknown>(RESTORE_ENDPOINTS.showPreview, payload),

    getBackupConfigsName: (destinationId: string) =>
      api.get<{ data: { backupConfigId: string; name: string }[] }>(
        RESTORE_ENDPOINTS.backupConfigsName,
        { query: { destinationId } },
      ),

    getCrmObjects: (crmId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.crmObjects, { query: { crmId } }),

    getCrmFields: (crmId: string, objectName: string, excludeSystemFields?: boolean) =>
      api.get<unknown>(RESTORE_ENDPOINTS.crmFields, {
        query: { crmId, objectName, ...(excludeSystemFields ? { excludeSystemFields: true } : {}) },
      }),

    fetchMissingFields: (backupConfigId: string, objectApiName: string) =>
      api.post<FetchMissingFieldsResult>(RESTORE_ENDPOINTS.fetchMissingFields, { backupConfigId, objectApiName }),

    // objectApiNames omitted resolves to every restorable object on the config
    // (an ENTIRE restore) — the backend does that resolution, not the caller.
    // startDate/endDate must already be UTC ISO strings (toUTCISOString) —
    // omit both for the whole delta history instead of a window.
    fetchMissingRecordTypes: (
      backupConfigId: string,
      configType: 'BACKUP' | 'ARCHIVAL',
      objectApiNames?: string[],
      startDate?: string,
      endDate?: string,
    ) =>
      api.post<ObjectRecordTypeMapping[]>(RESTORE_ENDPOINTS.fetchMissingRecordTypes, {
        backupConfigId,
        configType,
        ...(objectApiNames?.length ? { objectApiNames } : {}),
        ...(startDate && endDate ? { startDate, endDate } : {}),
      }),

    getCrmRecordTypes: (crmId: string, objectName: string, activeOnly?: boolean) =>
      api.get<DestinationRecordType[]>(RESTORE_ENDPOINTS.crmRecordTypes, {
        query: { crmId, objectName, ...(activeOnly ? { activeOnly: true } : {}) },
      }),

    fetchRequiredFields: (backupConfigId: string, objectApiName: string) =>
      api.post<RequiredField[]>(RESTORE_ENDPOINTS.requiredFields, { backupConfigId, objectApiName }),

    getObjectListByConfigId: (backupConfigId: string, configType: 'BACKUP' | 'ARCHIVAL') =>
      api.get<{ data: RestoreSourceObject[] }>(RESTORE_ENDPOINTS.objectListByConfigId, { query: { backupConfigId, configType } }),

    fetchObjectFields: (objectApiName: string, backupConfigId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.fetchObjectFields, { query: { objectApiName, backupConfigId } }),

    getPicklistValues: (objectApiName: string, fieldApiName: string, backupConfigId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.picklistValues, { query: { objectApiName, fieldApiName, backupConfigId } }),

    dryRun: (payload: DryRunPayload) =>
      api.post<unknown>(RESTORE_ENDPOINTS.dryRun, payload),

    dryRunDiff: (payload: DryRunDiffPayload) =>
      api.post<unknown>(RESTORE_ENDPOINTS.dryRunDiff, payload),

    createRestoreJob: (payload: RestoreRetrievePayload) =>
      api.post<{ success: boolean; message: string }>(RESTORE_ENDPOINTS.createRestoreJob, payload),

    listRestoreJobs: (search?: string, status?: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.listRestoreJobs, {
        query: {
          pagination: true,
          limit: 25,
          ...(search && { search }),
          ...(status && status !== 'All' && { status }),
        },
      }),

    getRestoreJob: (restoreId: string) =>
      api.get<unknown>(RESTORE_ENDPOINTS.getRestoreJob, { query: { restoreId } }),

    getJobStats: () =>
      api.get<unknown>(RESTORE_ENDPOINTS.jobStats),
  };
}
