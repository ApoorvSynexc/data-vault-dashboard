export interface TimezoneOption {
  label: string;
  value: string;
  offset: string;
}

export const TIMEZONES: TimezoneOption[] = [
  // Asia - India
  { label: 'Asia/Kolkata (IST, UTC+5:30)', value: 'Asia/Kolkata', offset: 'UTC+5:30' },

  // Asia - Other Major
  { label: 'Asia/Dubai (GST, UTC+4:00)', value: 'Asia/Dubai', offset: 'UTC+4:00' },
  { label: 'Asia/Bangkok (ICT, UTC+7:00)', value: 'Asia/Bangkok', offset: 'UTC+7:00' },
  { label: 'Asia/Singapore (SGT, UTC+8:00)', value: 'Asia/Singapore', offset: 'UTC+8:00' },
  { label: 'Asia/Hong_Kong (HKT, UTC+8:00)', value: 'Asia/Hong_Kong', offset: 'UTC+8:00' },
  { label: 'Asia/Shanghai (CST, UTC+8:00)', value: 'Asia/Shanghai', offset: 'UTC+8:00' },
  { label: 'Asia/Tokyo (JST, UTC+9:00)', value: 'Asia/Tokyo', offset: 'UTC+9:00' },
  { label: 'Asia/Seoul (KST, UTC+9:00)', value: 'Asia/Seoul', offset: 'UTC+9:00' },
  { label: 'Asia/Jakarta (WIB, UTC+7:00)', value: 'Asia/Jakarta', offset: 'UTC+7:00' },
  { label: 'Asia/Manila (PHT, UTC+8:00)', value: 'Asia/Manila', offset: 'UTC+8:00' },
  { label: 'Asia/Karachi (PKT, UTC+5:00)', value: 'Asia/Karachi', offset: 'UTC+5:00' },
  { label: 'Asia/Dhaka (BDT, UTC+6:00)', value: 'Asia/Dhaka', offset: 'UTC+6:00' },

  // Europe
  { label: 'Europe/London (GMT/BST, UTC+0:00/+1:00)', value: 'Europe/London', offset: 'UTC+0:00/+1:00' },
  { label: 'Europe/Paris (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Paris', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Berlin (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Berlin', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Amsterdam (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Amsterdam', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Brussels (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Brussels', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Vienna (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Vienna', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Prague (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Prague', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Budapest (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Budapest', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Rome (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Rome', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Madrid (CET/CEST, UTC+1:00/+2:00)', value: 'Europe/Madrid', offset: 'UTC+1:00/+2:00' },
  { label: 'Europe/Moscow (MSK, UTC+3:00)', value: 'Europe/Moscow', offset: 'UTC+3:00' },
  { label: 'Europe/Istanbul (EET/EEST, UTC+2:00/+3:00)', value: 'Europe/Istanbul', offset: 'UTC+2:00/+3:00' },

  // Americas - North
  { label: 'America/New_York (EST/EDT, UTC-5:00/-4:00)', value: 'America/New_York', offset: 'UTC-5:00/-4:00' },
  { label: 'America/Chicago (CST/CDT, UTC-6:00/-5:00)', value: 'America/Chicago', offset: 'UTC-6:00/-5:00' },
  { label: 'America/Denver (MST/MDT, UTC-7:00/-6:00)', value: 'America/Denver', offset: 'UTC-7:00/-6:00' },
  { label: 'America/Los_Angeles (PST/PDT, UTC-8:00/-7:00)', value: 'America/Los_Angeles', offset: 'UTC-8:00/-7:00' },
  { label: 'America/Anchorage (AKST/AKDT, UTC-9:00/-8:00)', value: 'America/Anchorage', offset: 'UTC-9:00/-8:00' },
  { label: 'Pacific/Honolulu (HST, UTC-10:00)', value: 'Pacific/Honolulu', offset: 'UTC-10:00' },
  { label: 'America/Toronto (EST/EDT, UTC-5:00/-4:00)', value: 'America/Toronto', offset: 'UTC-5:00/-4:00' },
  { label: 'America/Mexico_City (CST/CDT, UTC-6:00/-5:00)', value: 'America/Mexico_City', offset: 'UTC-6:00/-5:00' },

  // Americas - Central & South
  { label: 'America/Bogota (COT, UTC-5:00)', value: 'America/Bogota', offset: 'UTC-5:00' },
  { label: 'America/Lima (PET, UTC-5:00)', value: 'America/Lima', offset: 'UTC-5:00' },
  { label: 'America/Caracas (VET, UTC-4:00)', value: 'America/Caracas', offset: 'UTC-4:00' },
  { label: 'America/Buenos_Aires (ART, UTC-3:00)', value: 'America/Buenos_Aires', offset: 'UTC-3:00' },
  { label: 'America/Sao_Paulo (BRT/BRST, UTC-3:00/-2:00)', value: 'America/Sao_Paulo', offset: 'UTC-3:00/-2:00' },

  // Africa
  { label: 'Africa/Cairo (EET/EEST, UTC+2:00/+3:00)', value: 'Africa/Cairo', offset: 'UTC+2:00/+3:00' },
  { label: 'Africa/Johannesburg (SAST, UTC+2:00)', value: 'Africa/Johannesburg', offset: 'UTC+2:00' },
  { label: 'Africa/Lagos (WAT, UTC+1:00)', value: 'Africa/Lagos', offset: 'UTC+1:00' },
  { label: 'Africa/Nairobi (EAT, UTC+3:00)', value: 'Africa/Nairobi', offset: 'UTC+3:00' },
  { label: 'Africa/Casablanca (WET/WEST, UTC+0:00/+1:00)', value: 'Africa/Casablanca', offset: 'UTC+0:00/+1:00' },

  // Oceania
  { label: 'Australia/Sydney (AEDT/AEST, UTC+10:00/+11:00)', value: 'Australia/Sydney', offset: 'UTC+10:00/+11:00' },
  { label: 'Australia/Melbourne (AEDT/AEST, UTC+10:00/+11:00)', value: 'Australia/Melbourne', offset: 'UTC+10:00/+11:00' },
  { label: 'Australia/Brisbane (AEST, UTC+10:00)', value: 'Australia/Brisbane', offset: 'UTC+10:00' },
  { label: 'Australia/Perth (AWST, UTC+8:00)', value: 'Australia/Perth', offset: 'UTC+8:00' },
  { label: 'Pacific/Auckland (NZDT/NZST, UTC+12:00/+13:00)', value: 'Pacific/Auckland', offset: 'UTC+12:00/+13:00' },
  { label: 'Pacific/Fiji (FJT, UTC+12:00)', value: 'Pacific/Fiji', offset: 'UTC+12:00' },

  // UTC
  { label: 'UTC (UTC+0:00)', value: 'UTC', offset: 'UTC+0:00' },
];

export const getDefaultTimezone = (): TimezoneOption => {
  return TIMEZONES.find((tz) => tz.value === 'Asia/Kolkata') || TIMEZONES[0];
};

export const getTimezoneLabel = (value: string): string => {
  const tz = TIMEZONES.find((t) => t.value === value || t.label === value);
  return tz ? tz.label : value;
};

export const getTimezoneValue = (label: string): string => {
  const tz = TIMEZONES.find((t) => t.label === label || t.value === label);
  return tz ? tz.value : label;
};
