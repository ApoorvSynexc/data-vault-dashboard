export type PlatformType = 'Salesforce' | 'HubSpot' | 'Zoho';
export type BackupEnvironment = 'Production' | 'Sandbox';
export type WizardStep = 1 | 2 | 3 | 4;
export type StepStatus = 'completed' | 'active' | 'upcoming';
export type BackupFrequency = 'Hourly' | 'Daily' | 'Weekly' | 'Monthly';

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
};
