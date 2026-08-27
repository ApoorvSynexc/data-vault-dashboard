import { useHttpRequest } from '../../hooks/useHttpRequest';

export type NotificationItem = {
  id: string | number;
  type: string;
  category: string;
  title: string;
  description: string;
  time?: string;
  createdAt?: string;
  read: boolean;
  [key: string]: unknown;
};

type NotificationListResponse = {
  success: boolean;
  message: string;
  data: NotificationItem[];
  meta?: {
    limit: number;
    nextCursor: string | null;
    totalRecords: number;
    totalPages: number;
  };
};

export function useNotificationService() {
  const api = useHttpRequest();

  return {
    listNotifications: () =>
      api.get<NotificationListResponse>('/v1/notification/list'),
  };
}
