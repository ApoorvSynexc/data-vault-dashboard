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

export const SCOPE_MODES: { id: ScopeMode; icon: string; title: string; desc: string }[] = [
  { id: 'full',    icon: '★',  title: 'Full Restore',   desc: 'Everything in the source — no further filtering' },
  { id: 'object',  icon: '◫',  title: 'By Object',      desc: 'Pick one or more CRM objects' },
  { id: 'record',  icon: '◉',  title: 'By Record',      desc: 'Explicit record IDs (manual or CSV)' },
  { id: 'field',   icon: '▤',  title: 'By Field',       desc: 'Specific fields within records' },
  { id: 'filter',  icon: '⚙',  title: 'Custom Filter',  desc: 'Visual filter or raw SOQL — with live match count' },
  { id: 'deleted', icon: '⌫',  title: 'Deleted-Only',   desc: 'Records deleted in destination since snapshot' },
  { id: 'changed', icon: 'Δ',  title: 'Changed-Since',  desc: 'Fields that differ between source and dest' },
  { id: 'csv',     icon: '📋', title: 'Bulk via CSV',   desc: 'Paste or upload IDs / external IDs' },
];

export type { SourceSelection, RestoreScope };
