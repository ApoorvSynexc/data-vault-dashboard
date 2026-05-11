export type AWSRegion = {
  value: string;
  label: string;
  group: string;
};

export const AWS_REGIONS: AWSRegion[] = [
  // US East
  { value: 'us-east-1', label: 'US East (N. Virginia)', group: 'US East' },
  { value: 'us-east-2', label: 'US East (Ohio)', group: 'US East' },

  // US West
  { value: 'us-west-1', label: 'US West (N. California)', group: 'US West' },
  { value: 'us-west-2', label: 'US West (Oregon)', group: 'US West' },

  // Africa
  { value: 'af-south-1', label: 'Africa (Cape Town)', group: 'Africa' },

  // Asia Pacific
  { value: 'ap-east-1', label: 'Asia Pacific (Hong Kong)', group: 'Asia Pacific' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)', group: 'Asia Pacific' },
  { value: 'ap-south-2', label: 'Asia Pacific (Hyderabad)', group: 'Asia Pacific' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', group: 'Asia Pacific' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)', group: 'Asia Pacific' },
  { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta)', group: 'Asia Pacific' },
  { value: 'ap-southeast-4', label: 'Asia Pacific (Melbourne)', group: 'Asia Pacific' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)', group: 'Asia Pacific' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)', group: 'Asia Pacific' },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)', group: 'Asia Pacific' },

  // Canada
  { value: 'ca-central-1', label: 'Canada (Central)', group: 'Canada' },
  { value: 'ca-west-1', label: 'Canada West (Calgary)', group: 'Canada' },

  // Europe
  { value: 'eu-central-1', label: 'Europe (Frankfurt)', group: 'Europe' },
  { value: 'eu-central-2', label: 'Europe (Zurich)', group: 'Europe' },
  { value: 'eu-west-1', label: 'Europe (Ireland)', group: 'Europe' },
  { value: 'eu-west-2', label: 'Europe (London)', group: 'Europe' },
  { value: 'eu-west-3', label: 'Europe (Paris)', group: 'Europe' },
  { value: 'eu-south-1', label: 'Europe (Milan)', group: 'Europe' },
  { value: 'eu-south-2', label: 'Europe (Spain)', group: 'Europe' },
  { value: 'eu-north-1', label: 'Europe (Stockholm)', group: 'Europe' },

  // Israel
  { value: 'il-central-1', label: 'Israel (Tel Aviv)', group: 'Israel' },

  // Middle East
  { value: 'me-south-1', label: 'Middle East (Bahrain)', group: 'Middle East' },
  { value: 'me-central-1', label: 'Middle East (UAE)', group: 'Middle East' },

  // South America
  { value: 'sa-east-1', label: 'South America (São Paulo)', group: 'South America' },

  // AWS GovCloud
  { value: 'us-gov-east-1', label: 'AWS GovCloud (US-East)', group: 'AWS GovCloud' },
  { value: 'us-gov-west-1', label: 'AWS GovCloud (US-West)', group: 'AWS GovCloud' },
];

export function getRegionsByGroup() {
  const groups = new Map<string, AWSRegion[]>();

  AWS_REGIONS.forEach((region) => {
    if (!groups.has(region.group)) {
      groups.set(region.group, []);
    }
    groups.get(region.group)!.push(region);
  });

  return groups;
}
