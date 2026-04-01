export const CRM_PLATFORMS = ['Salesforce', 'HubSpot', 'Zoho'] as const;
export type CrmPlatform = (typeof CRM_PLATFORMS)[number];

export const CRM_PLATFORM_META: Record<CrmPlatform, {
  label: string;
  description: string;
  brandColor: string;
  textColor: string;
}> = {
  Salesforce: {
    label: 'Salesforce',
    description: 'Manage Salesforce Platform Data',
    brandColor: '#00A1E0',
    textColor: '#00A1E0',
  },
  HubSpot: {
    label: 'HubSpot',
    description: 'Manage HubSpot Platform Data',
    brandColor: '#FF7A59',
    textColor: '#FF7A59',
  },
  Zoho: {
    label: 'Zoho CRM',
    description: 'Manage Zoho CRM Platform Data',
    brandColor: '#E42527',
    textColor: '#E42527',
  },
};
