import { useHttpRequest } from '../../hooks/useHttpRequest';

export type SettingsData = Record<string, unknown>;

export function useSettingsService() {
  const api = useHttpRequest();

  return {
    getSettings: () => api.get<SettingsData>('/v1/settings/'),
  };
}
