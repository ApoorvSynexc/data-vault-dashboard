import { useState, useEffect, type JSX } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationService, type INotification } from '../../services/notification/notification.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'read';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const BellIcon = (): JSX.Element => (
  <svg viewBox='0 0 24 24' fill='none' stroke='#9ca3af' strokeWidth='1.8' strokeLinecap='round' className='h-6 w-6'>
    <path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' />
    <path d='M13.73 21a2 2 0 01-3.46 0' />
  </svg>
);

function NotifItem({
  notif,
  onMarkRead,
  onDismiss,
}: {
  notif: INotification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const isUnread = notif.status === 'UNREAD';

  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 transition ${isUnread ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100 bg-white'}`}>
      {/* Icon */}
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUnread ? 'bg-blue-50' : 'bg-gray-50'}`}>
        <svg viewBox='0 0 24 24' fill='none' stroke={isUnread ? '#3b82f6' : '#9ca3af'} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
          <path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' />
          <path d='M13.73 21a2 2 0 01-3.46 0' />
        </svg>
      </div>

      {/* Body */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <p className='text-sm font-semibold text-gray-900'>{notif.title}</p>
            {isUnread && <span className='h-2 w-2 shrink-0 rounded-full bg-blue-500' />}
          </div>
          <span className='shrink-0 text-[11px] text-gray-400'>{formatTime(notif.createdAt)}</span>
        </div>
        <p className='mt-0.5 text-xs leading-relaxed text-gray-500'>{notif.body}</p>
        <div className='mt-2 flex items-center gap-3'>
          {isUnread && (
            <button
              onClick={() => onMarkRead(notif.notificationId)}
              className='text-[11px] font-medium text-blue-600 hover:underline'
            >
              Mark as read
            </button>
          )}
          <button
            onClick={() => onDismiss(notif.notificationId)}
            className='text-[11px] font-medium text-gray-400 hover:text-red-500'
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];


export default function Notifications() {
  const notificationService = useNotificationService();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService.listNotifications()
      .then((res) => {
        const items: INotification[] = (res as any)?.data?.data ?? (res as any)?.data ?? [];
        if (Array.isArray(items)) {
          setNotifications(items.filter((n) => n.status !== 'DELETED'));
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  function refetchUnreadCount() {
    queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
  }

  function markAllRead() {
    notificationService.markAllRead()
      .then((res) => {
        const updated = (res as any)?.data?.updatedCount ?? (res as any)?.updatedCount ?? 0;
        if (updated > 0) {
          setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
          refetchUnreadCount();
        }
      })
      .catch(() => { });
  }

  function markRead(id: string) {
    notificationService.updateStatus(id, 'READ')
      .then(() => refetchUnreadCount())
      .catch(() => { });
    setNotifications((prev) => prev.map((n) => n.notificationId === id ? { ...n, status: 'READ' } : n));
  }

  function dismiss(id: string) {
    notificationService.updateStatus(id, 'DELETED')
      .then(() => refetchUnreadCount())
      .catch(() => { });
    setNotifications((prev) => prev.filter((n) => n.notificationId !== id));
  }

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return n.status === 'UNREAD';
    if (activeTab === 'read') return n.status === 'READ';
    return true;
  });

  return (
    <div className='flex flex-1 flex-col gap-5 p-6 min-h-0'>

      {/* 1. Header */}
      <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm flex-shrink-0'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Notifications</h2>
          <p className='mt-0.5 text-sm text-gray-500'>Stay updated on backups, security events and system activity</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className='rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50'
          >
            Mark all as read
            <span className='ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white'>
              {unreadCount}
            </span>
          </button>
        )}
      </div>

      {/* 2. Overview */}
      <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex-shrink-0'>
        <h3 className='mb-4 text-sm font-semibold text-gray-900'>Overview</h3>
        <div className='flex gap-3'>
          {[
            { label: 'Total',  value: notifications.length,                                     color: 'text-gray-900'    },
            { label: 'Unread', value: unreadCount,                                              color: 'text-blue-600'    },
            { label: 'Read',   value: notifications.filter((n) => n.status === 'READ').length,  color: 'text-emerald-600' },
          ].map((s) => (
            <div key={s.label} className='rounded-lg border border-gray-100 px-6 py-3 text-center'>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className='mt-0.5 text-[11px] text-gray-500'>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Notification feed — grows to fill remaining height */}
      <div className='flex flex-1 flex-col min-h-0 rounded-xl border border-gray-200 bg-white shadow-sm'>

        {/* Tabs */}
        <div className='flex items-center gap-1 border-b border-gray-100 px-5 pt-4 flex-shrink-0'>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative mb-[-1px] px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className='ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600'>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className='flex-1 overflow-y-auto flex flex-col gap-2 p-4'>
          {loading ? (
            <div className='flex items-center justify-center py-16'>
              <div className='h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600' />
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-center'>
              <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100'>
                <BellIcon />
              </div>
              <p className='text-sm font-medium text-gray-500'>No notifications here</p>
              <p className='mt-0.5 text-xs text-gray-400'>You're all caught up!</p>
            </div>
          ) : (
            filtered.map((n) => (
              <NotifItem key={n.notificationId} notif={n} onMarkRead={markRead} onDismiss={dismiss} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
