import { useHttpRequest } from '../../hooks/useHttpRequest';

export const DESTINATION_ENDPOINTS = {
  create: '/v1/destination',
  list: '/v1/destination/list',
  get: '/v1/destination',
  getConfig: '/v1/destination/config',
  update: '/v1/destination',
  delete: '/v1/destination',
} as const;

export type DestinationConfig = {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  folderPath?: string;
};

export type Destination = {
  destinationId: string;
  userId: string;
  name: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  type: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  bucketName?: string;
  region?: string;
  config?: DestinationConfig;
};

export type CreateDestinationPayload = {
  name: string;
  provider: 'AWS' | 'AZURE' | 'GCP';
  type: string;
  config: DestinationConfig;
};

export type UpdateDestinationPayload = Partial<Omit<CreateDestinationPayload, 'config'>> & {
  config?: Partial<DestinationConfig>;
};

export type ListDestinationsResponse = {
  data: Destination[];
  meta: {
    nextCursor: string | null;
  };
};

export function useDestinationService() {
  const api = useHttpRequest();

  return {
    createDestination: async (payload: CreateDestinationPayload) =>
      (await api.post<Destination>(DESTINATION_ENDPOINTS.create, payload)).data,

    listDestinations: async (limit?: number, cursor?: string) =>
      (await api.get<Destination[]>(DESTINATION_ENDPOINTS.list, {
        query: { limit, cursor },
      })).data,

    getDestination: async (destinationId: string) =>
      (await api.get<Destination>(DESTINATION_ENDPOINTS.get, {
        query: { destinationId },
      })).data,

    getDecryptedConfig: async (destinationId: string) =>
      (await api.get<DestinationConfig>(DESTINATION_ENDPOINTS.getConfig, {
        query: { destinationId },
      })).data,

    updateDestination: async (destinationId: string, payload: UpdateDestinationPayload) =>
      (await api.put<Destination>(DESTINATION_ENDPOINTS.update, payload, {
        query: { destinationId },
      })).data,

    deleteDestination: async (destinationId: string) =>
      (await api.delete<null>(DESTINATION_ENDPOINTS.delete, {
        query: { destinationId },
      })).data,
  };
}
