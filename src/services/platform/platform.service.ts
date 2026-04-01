import { useHttpRequest } from '../../hooks/useHttpRequest';
import type { CrmPlatform } from '../../constants/platforms';

export type ConnectedPlatform = {
  id: string;
  crmType: CrmPlatform;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncedAt: string | null;
};

export function usePlatformService() {
  const api = useHttpRequest();

  return {
    getConnectedPlatforms: () =>
      api.get<ConnectedPlatform[]>('/v1/platforms'),
    connectPlatform: (crmType: CrmPlatform) =>
      api.post<ConnectedPlatform>('/v1/platforms', { crmType }),
    disconnectPlatform: (id: string) =>
      api.delete<void>(`/v1/platforms/${id}`),
  };
}
