import { useHttpRequest } from '../../hooks/useHttpRequest';
import type { CrmPlatform } from '../../constants/platforms';

export const PLATFORM_ENDPOINTS = {
  list:       '/v1/crm/list',
  connect:    '/v1/crm/connect',
  callback:   '/v1/crm/callback',
  disconnect: '/v1/crm/disconnect',
} as const;

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
      api.get<ConnectedPlatform[]>(PLATFORM_ENDPOINTS.list),
    connectPlatform: (crmType: CrmPlatform) =>
      api.get<ConnectPlatformResponse | string>(PLATFORM_ENDPOINTS.connect, {
        query: { crmName: crmType.toLowerCase() },
      }),
    reconnectPlatform: (crmId: string) =>
      api.get<ConnectPlatformResponse | string>(PLATFORM_ENDPOINTS.connect, {
        query: { crmId },
      }),
    callbackPlatform: (payload: { crmName: CrmPlatform; code: string; state: string }) =>
      api.get<ConnectPlatformResponse | string>(PLATFORM_ENDPOINTS.callback, {
        query: { crmName: payload.crmName.toLowerCase(), code: payload.code, state: payload.state },
      }),
    disconnectPlatform: (crmId: string) =>
      api.delete<void>(PLATFORM_ENDPOINTS.disconnect, {
        query: { crmId },
      }),
  };
}
