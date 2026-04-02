export type { CrmPlatform as PlatformType } from '../../../constants/platforms';
export type BackupEnvironment = 'Production' | 'Sandbox';
export type WizardStep = 1 | 2 | 3 | 4 | 5;
export type DestinationType = 'S3' | 'Google' | 'Azure';

export type S3Config = {
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
};

export type GoogleConfig = {
  serviceAccountKey: string;
  bucketName: string;
  projectId: string;
};

export type AzureConfig = {
  accountName: string;
  accountKey: string;
  containerName: string;
};
export type StepStatus = 'completed' | 'active' | 'upcoming' | 'skipped';
export type ScheduleMode = 'realtime' | 'schedule';
export type ScheduleType = 'one_time' | 'incremental';
export type DurationType = 'hour' | 'day' | 'week' | 'month';
export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type FilterOperator = '>' | '<' | '>=' | '<=' | '=' | '!=' | 'IN' | 'LIKE';
export type ConditionType = 'AND' | 'OR' | 'CUSTOM';
export type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'id';

export type ObjectField = {
  name: string;
  dataType: FieldDataType;
};

export type FieldFilter = {
  name: string;
  dataType: FieldDataType | null;
  operator: FilterOperator;
  value: string;
};

export type ObjectFilterConfig = {
  conditionType: ConditionType;
  expression: string;
  fields: FieldFilter[];
};

export type AddBackupModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type StepMarkerProps = {
  step: number;
  label: string;
  status: StepStatus;
};

export type DataScopeRow = {
  id: string;
  name: string;
  type: string;
  estimatedSize: string;
  backupMode: 'realtime' | 'schedule' | 'both';
};
