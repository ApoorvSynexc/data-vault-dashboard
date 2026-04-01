import { useHttpRequest } from '../../hooks/useHttpRequest';
import type { CrmPlatform } from '../../constants/platforms';

export type CrmProfile = {
  organizationId: string;
  photoUrl: string;
  name: string;
  userId: string;
  email: string;
  instanceUrl: string;
  username: string;
};

export type ConnectedPlatform = {
  crmId: string;
  crmName: string;
  isConnected: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  crmProfile: CrmProfile;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

export function usePlatformService() {
  const api = useHttpRequest();

  return {
    getConnectedPlatforms: () =>
      api.get<ConnectedPlatform[]>('/v1/crm/list'),
    connectPlatform: (crmType: CrmPlatform) =>
      api.post<ConnectedPlatform>('/v1/platforms', { crmType }),
    disconnectPlatform: (id: string) =>
      api.delete<void>(`/v1/platforms/${id}`),
  };
}
