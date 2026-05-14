import { useHttpRequest } from '../../hooks/useHttpRequest';
import type { CrmPlatform } from '../../constants/platforms';

export const PLATFORM_ENDPOINTS = {
  list:       '/v1/crm/list',
  connect:    '/v1/crm/connect',
  callback:   '/v1/crm/callback',
  disconnect: '/v1/crm/disconnect',
  update:     '/v1/crm',
  delete:     '/v1/crm',
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
  name: string;
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

export type ConnectOptions = {
  environment?: 'production' | 'sandbox' | 'custom';
  customUrl?: string;
  name?: string;
};

export function usePlatformService() {
  const api = useHttpRequest();

  return {
    getConnectedPlatforms: async () =>
      (await api.get<ConnectedPlatform[]>(PLATFORM_ENDPOINTS.list)).data,
    connectPlatform: async (crmType: CrmPlatform, options?: ConnectOptions) => {
      const query: Record<string, string | undefined> = { crmName: crmType.toLowerCase() };
      if (options?.environment) query.environment = options.environment;
      if (options?.customUrl) query.customUrl = options.customUrl;
      if (options?.name) query.name = options.name;
      return (await api.get<ConnectPlatformResponse | string>(PLATFORM_ENDPOINTS.connect, { query })).data;
    },
    reconnectPlatform: async (crmId: string, options?: ConnectOptions) => {
      const query: Record<string, string | undefined> = { crmId };
      if (options?.environment) query.environment = options.environment;
      if (options?.customUrl) query.customUrl = options.customUrl;
      return (await api.get<ConnectPlatformResponse | string>(PLATFORM_ENDPOINTS.connect, { query })).data;
    },
    callbackPlatform: async (payload: { crmName: CrmPlatform; code: string; state: string }) =>
      (await api.get<ConnectPlatformResponse | string>(PLATFORM_ENDPOINTS.callback, {
        query: { crmName: payload.crmName.toLowerCase(), code: payload.code, state: payload.state },
      })).data,
    disconnectPlatform: async (crmId: string) =>
      (await api.delete<void>(PLATFORM_ENDPOINTS.disconnect, {
        query: { crmId },
      })).data,
    deletePlatform: async (crmId: string) =>
      (await api.delete<void>(PLATFORM_ENDPOINTS.delete, {
        query: { crmId },
      })).data,
    updatePlatform: async (crmId: string, name: string) =>
      (await api.put<void>(PLATFORM_ENDPOINTS.update, { crmId, name }, {
        query: { crmId },
      })).data,
  };
}
