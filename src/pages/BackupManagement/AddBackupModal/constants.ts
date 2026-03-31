import type { DataScopeRow } from './types';

export const dataScopeRows: DataScopeRow[] = [
  { id: 'accounts', name: 'Accounts', type: 'Standard Object', estimatedSize: '1.2 GB' },
  { id: 'contacts', name: 'Contacts', type: 'Standard Object', estimatedSize: '1.4 GB' },
  { id: 'cases', name: 'Cases', type: 'Standard Object', estimatedSize: '2.2 GB' },
  { id: 'leads', name: 'Leads', type: 'Standard Object', estimatedSize: '2.2 GB' },
  { id: 'lead-department', name: 'Lead Department', type: 'Custom Object', estimatedSize: '2.5 GB' },
  { id: 'loads', name: 'Loads', type: 'Custom Object', estimatedSize: '0.2 GB' },
];

export const initialSelectedObjectIds = ['accounts', 'contacts', 'leads', 'loads'];
