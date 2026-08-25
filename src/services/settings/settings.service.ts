import { useHttpRequest } from '../../hooks/useHttpRequest';

export type StandardObject = {
  name: string;
  isDefault: boolean;
};


export type SettingsData = {
  settingId: string;
  userId: string;
  crmId: string;
  status: string;
  standardObjects: StandardObject[];
  createdAt: string;
  updatedAt: string;
};

export function useSettingsService() {
  const api = useHttpRequest();

  return {
    getSettings: () => api.get<SettingsData>('/v1/settings/'),
    addStandardObject: (name: string) =>
      api.put<SettingsData>('/v1/settings/', { standardObjects: [{ name }] }),
    removeStandardObject: (name: string) =>
      api.delete<void>('/v1/settings/standard-object', { query: { name } }),
  };
}
