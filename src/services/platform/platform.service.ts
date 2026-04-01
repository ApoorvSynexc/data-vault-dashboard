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

export type ConnectPlatformResponse = {
  redirectUrl: string;
};

export function usePlatformService() {
  const api = useHttpRequest();

  return {
    getConnectedPlatforms: () =>
      api.get<ConnectedPlatform[]>('/v1/crm/list'),
    connectPlatform: (crmType: CrmPlatform) =>
      api.get<ConnectPlatformResponse | string>('/v1/crm/connect', {
        query: {
          crmName: crmType.toLowerCase(),
        },
      }),
    callbackPlatform: (payload: { crmName: CrmPlatform; code: string, state: string }) =>
      api.get<ConnectPlatformResponse | string>('/v1/crm/callback', {
        query: {
          crmName: payload.crmName.toLowerCase(),
          code: payload.code,
          state: payload.state,
        },
      }),
    disconnectPlatform: (crmId: string) =>
      api.delete<void>('/v1/crm/disconnect', {
        query: {
          crmId,
        },
      }),
  };
}
