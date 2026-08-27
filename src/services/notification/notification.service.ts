import { useHttpRequest } from '../../hooks/useHttpRequest';

export type INotification = {
  notificationId: string;
  userId: string;
  crmId: string;
  title: string;
  body: string;
  targetScreen?: string;
  targetId?: string;
  status: 'UNREAD' | 'READ' | 'DELETED' | string;
  createdAt: string;
  updatedAt: string;
};

type NotificationListResponse = {
  success: boolean;
  message: string;
  data: INotification[];
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

    updateStatus: (notificationId: string, status: 'READ' | 'UNREAD' | 'DELETED') =>
      api.put<{ success: boolean; message: string; data: INotification }>(
        '/v1/notification',
        { status },
        { query: { notificationId } },
      ),
  };
}
