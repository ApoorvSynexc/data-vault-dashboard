import type { SourceSelection } from '../SelectSourceType';
import type { RestoreScope } from '../../../../services/restore/restore.service';

export type ScopeMode = 'full' | 'object' | 'record' | 'field' | 'filter' | 'deleted' | 'changed' | 'csv';
export type FilterTab = 'visual' | 'soql';
export type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'id' | 'picklist';
export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'LIKE';

export interface SFRecord {
  Id: string;
  Name: string;
  LastModifiedDate: string;
  backup_job_id: string;
  change_type: string;
}

export interface FilterRow {
  id: string;
  field: string;
  dataType: FieldDataType;
  op: FilterOperator;
  value: string;
  picklistValues?: { value: string; label: string }[];
}

export interface OrGroup {
  id: string;
  rows: FilterRow[];
}

export interface FieldOption {
  label: string;
  apiName: string;
  dataType: string;
  isUpdateable: boolean;
  isCreateable: boolean;
  isCustom?: boolean;
  isRequired?: boolean;
}

export const OP_LABELS: Record<FilterOperator, string> = {
  '=': 'equals', '!=': 'not equals', '>': 'greater than', '<': 'less than',
  '>=': 'greater than or equal', '<=': 'less than or equal', 'IN': 'in', 'LIKE': 'contains',
};

export const OPERATORS_BY_TYPE: Record<FieldDataType, FilterOperator[]> = {
  string:   ['=', '!=', 'LIKE', 'IN'],
  number:   ['=', '!=', '>', '<', '>=', '<='],
  boolean:  ['=', '!='],
  date:     ['=', '!=', '>', '<', '>=', '<='],
  datetime: ['=', '!=', '>', '<', '>=', '<='],
  id:       ['=', '!=', 'IN'],
  picklist: ['=', '!='],
};

export const SCOPE_MODES: { id: ScopeMode; icon: string; title: string; desc: string; tooltip: string }[] = [
  { id: 'full',    icon: '★',  title: 'Full Restore',   desc: 'Everything in the source — no further filtering',        tooltip: 'Restores all records and fields from the selected backup or archive. No filtering is applied — use this for a complete rollback.' },
  { id: 'object',  icon: '◫',  title: 'By Object',      desc: 'Pick one or more CRM objects',                           tooltip: 'Restores every record within the selected CRM objects (e.g. Account, Contact). All fields are included.' },
  { id: 'record',  icon: '◉',  title: 'By Record',      desc: 'Explicit record IDs (manual or CSV)',                    tooltip: 'Restores only the specific records you choose. Select objects then pick individual record IDs from the list.' },
  { id: 'field',   icon: '▤',  title: 'By Field',       desc: 'Specific fields within records',                         tooltip: 'Restores only selected fields on records, leaving other fields untouched in the destination.' },
  { id: 'filter',  icon: '⚙',  title: 'Custom Filter',  desc: 'Visual filter or raw SOQL — with live match count',      tooltip: 'Build conditions visually or write a SOQL WHERE clause to target exactly the records that match your criteria.' },
  { id: 'deleted', icon: '⌫',  title: 'Deleted-Only',   desc: 'Records deleted in destination since snapshot',          tooltip: 'Finds and restores only the records that were deleted in the destination org after the backup snapshot was taken.' },
  { id: 'changed', icon: 'Δ',  title: 'Changed-Since',  desc: 'Fields that differ between source and dest',             tooltip: 'Compares source and destination and restores only fields whose values have changed — a targeted drift correction.' },
  { id: 'csv',     icon: '📋', title: 'Bulk via CSV',   desc: 'Paste or upload IDs / external IDs',                    tooltip: 'Upload a CSV file or paste a list of Salesforce record IDs to restore a large batch of specific records.' },
];

export type { SourceSelection, RestoreScope };
