import { useState, type JSX } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifType = 'success' | 'error' | 'warning' | 'info' | 'security';
type FilterTab = 'all' | 'unread' | 'backup' | 'security' | 'system';

type Notification = {
  id: number;
  type: NotifType;
  category: 'backup' | 'security' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
};

// ── Data ──────────────────────────────────────────────────────────────────────

const initialNotifications: Notification[] = [
  {
    id: 1,
    type: 'success',
    category: 'backup',
    title: 'Backup Completed',
    description: 'Salesforce Production Backup completed successfully. 5.2 GB backed up in 42m 20s.',
    time: '2 min ago',
    read: false,
  },
  {
    id: 2,
    type: 'error',
    category: 'backup',
    title: 'Backup Failed',
    description: 'HubSpot daily backup failed due to authentication timeout. Requires immediate intervention.',
    time: '15 min ago',
    read: false,
  },
  {
    id: 3,
    type: 'warning',
    category: 'system',
    title: 'Storage Limit Warning',
    description: 'Storage usage has reached 85% of allocated capacity. Consider upgrading your plan to avoid disruptions.',
    time: '1 hr ago',
    read: false,
  },
  {
    id: 4,
    type: 'success',
    category: 'backup',
    title: 'Backup Completed',
    description: 'Zoho CRM monthly backup completed successfully. 2.1 GB processed to warm storage.',
    time: '3 hrs ago',
    read: true,
  },
  {
    id: 5,
    type: 'security',
    category: 'security',
    title: 'New Login Detected',
    description: 'A new login was detected from an unrecognized device in Mumbai, India. Review if this was you.',
    time: '5 hrs ago',
    read: false,
  },
  {
    id: 6,
    type: 'info',
    category: 'system',
    title: 'Platform Connected',
    description: 'Salesforce sandbox environment has been successfully connected to your workspace.',
    time: 'Yesterday',
    read: true,
  },
  {
    id: 7,
    type: 'warning',
    category: 'backup',
    title: 'Backup Delayed',
    description: 'Zoho CRM scheduled backup is running 30 minutes behind schedule due to high system load.',
    time: 'Yesterday',
    read: true,
  },
  {
    id: 8,
    type: 'success',
    category: 'backup',
    title: 'Archive Backup Completed',
    description: 'Archive Data backup completed. 1.3 TB successfully moved to cold storage tier.',
    time: '2 days ago',
    read: true,
  },
  {
    id: 9,
    type: 'info',
    category: 'system',
    title: 'Scheduled Maintenance',
    description: 'System maintenance is scheduled for Sunday 2:00 AM – 4:00 AM. Backups may be temporarily paused.',
    time: '3 days ago',
    read: true,
  },
  {
    id: 10,
    type: 'security',
    category: 'security',
    title: 'API Key Rotated',
    description: 'Your Salesforce API key was automatically rotated as part of the monthly security policy.',
    time: '4 days ago',
    read: true,
  },
];

type PrefKey = 'emailAlerts' | 'pushAlerts' | 'backupAlerts' | 'securityAlerts' | 'systemAlerts' | 'weeklyDigest';

const initialPrefs: Record<PrefKey, boolean> = {
  emailAlerts: true,
  pushAlerts: false,
  backupAlerts: true,
  securityAlerts: true,
  systemAlerts: true,
  weeklyDigest: false,
};

// ── Sub-components ────────────────────────────────────────────────────────────

const typeConfig: Record<NotifType, { bg: string; icon: JSX.Element }> = {
  success: {
    bg: 'bg-emerald-50',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='#10b981' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
        <polyline points='20 6 9 17 4 12' />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='#ef4444' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
        <circle cx='12' cy='12' r='10' />
        <line x1='15' y1='9' x2='9' y2='15' />
        <line x1='9' y1='9' x2='15' y2='15' />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='#f59e0b' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
        <path d='M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' />
        <line x1='12' y1='9' x2='12' y2='13' />
        <line x1='12' y1='17' x2='12.01' y2='17' />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-50',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='#3b82f6' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
        <circle cx='12' cy='12' r='10' />
        <line x1='12' y1='8' x2='12' y2='12' />
        <line x1='12' y1='16' x2='12.01' y2='16' />
      </svg>
    ),
  },
  security: {
    bg: 'bg-purple-50',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='#8b5cf6' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4'>
        <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
      </svg>
    ),
  },
};

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type='button'
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-1'}`}
      />
    </button>
  );
}

function NotifItem({
  notif,
  onMarkRead,
  onDelete,
}: {
  notif: Notification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const cfg = typeConfig[notif.type];

  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3.5 transition ${notif.read ? 'border-gray-100 bg-white' : 'border-blue-100 bg-blue-50/30'}`}>
      {/* Icon */}
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
        {cfg.icon}
      </div>

      {/* Body */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <p className='text-sm font-semibold text-gray-900'>{notif.title}</p>
            {!notif.read && (
              <span className='h-2 w-2 shrink-0 rounded-full bg-blue-500' />
            )}
          </div>
          <span className='shrink-0 text-[11px] text-gray-400'>{notif.time}</span>
        </div>
        <p className='mt-0.5 text-xs leading-relaxed text-gray-500'>{notif.description}</p>
        <div className='mt-2 flex items-center gap-3'>
          {!notif.read && (
            <button
              onClick={() => onMarkRead(notif.id)}
              className='text-[11px] font-medium text-blue-600 hover:underline'
            >
              Mark as read
            </button>
          )}
          <button
            onClick={() => onDelete(notif.id)}
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
  { key: 'all',      label: 'All'      },
  { key: 'unread',   label: 'Unread'   },
  { key: 'backup',   label: 'Backup'   },
  { key: 'security', label: 'Security' },
  { key: 'system',   label: 'System'   },
];

const prefRows: { key: PrefKey; label: string; description: string }[] = [
  { key: 'emailAlerts',    label: 'Email Alerts',     description: 'Receive alerts via email'           },
  { key: 'pushAlerts',     label: 'Push Notifications', description: 'Browser push notifications'       },
  { key: 'backupAlerts',   label: 'Backup Alerts',    description: 'Backup success, failure & delays'   },
  { key: 'securityAlerts', label: 'Security Alerts',  description: 'Login, key rotation & threats'      },
  { key: 'systemAlerts',   label: 'System Alerts',    description: 'Storage warnings & maintenance'     },
  { key: 'weeklyDigest',   label: 'Weekly Digest',    description: 'Summary email every Monday morning' },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [prefs, setPrefs] = useState(initialPrefs);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function dismiss(id: number) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function togglePref(key: PrefKey) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const filtered = notifications.filter((n) => {
    if (activeTab === 'all')      return true;
    if (activeTab === 'unread')   return !n.read;
    return n.category === activeTab;
  });

  return (
    <div className='flex flex-col gap-5'>

      {/* Page header */}
      <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Notifications</h2>
          <p className='mt-0.5 text-sm text-gray-500'>
            Stay updated on backups, security events and system activity
          </p>
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

      {/* Main content */}
      <div className='grid grid-cols-1 gap-5 xl:grid-cols-3'>

        {/* Notification feed */}
        <div className='xl:col-span-2'>
          <div className='rounded-xl border border-gray-200 bg-white shadow-sm'>

            {/* Tabs */}
            <div className='flex items-center gap-1 border-b border-gray-100 px-5 pt-4'>
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
            <div className='flex flex-col gap-2 p-4'>
              {filtered.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-16 text-center'>
                  <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100'>
                    <svg viewBox='0 0 24 24' fill='none' stroke='#9ca3af' strokeWidth='1.8' strokeLinecap='round' className='h-6 w-6'>
                      <path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' />
                      <path d='M13.73 21a2 2 0 01-3.46 0' />
                    </svg>
                  </div>
                  <p className='text-sm font-medium text-gray-500'>No notifications here</p>
                  <p className='mt-0.5 text-xs text-gray-400'>You're all caught up!</p>
                </div>
              ) : (
                filtered.map((n) => (
                  <NotifItem key={n.id} notif={n} onMarkRead={markRead} onDelete={dismiss} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Preferences panel */}
        <div className='flex flex-col gap-4'>

          {/* Summary */}
          <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
            <h3 className='mb-4 text-sm font-semibold text-gray-900'>Overview</h3>
            <div className='grid grid-cols-2 gap-3'>
              {[
                { label: 'Total',    value: notifications.length,                          color: 'text-gray-900' },
                { label: 'Unread',   value: unreadCount,                                   color: 'text-blue-600' },
                { label: 'Backups',  value: notifications.filter(n => n.category === 'backup').length,   color: 'text-emerald-600' },
                { label: 'Security', value: notifications.filter(n => n.category === 'security').length, color: 'text-purple-600' },
              ].map((s) => (
                <div key={s.label} className='rounded-lg border border-gray-100 p-3 text-center'>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className='mt-0.5 text-[11px] text-gray-500'>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className='rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
            <h3 className='mb-1 text-sm font-semibold text-gray-900'>Notification Preferences</h3>
            <p className='mb-4 text-xs text-gray-500'>Control what alerts you receive</p>
            <div className='flex flex-col gap-4'>
              {prefRows.map((row) => (
                <div key={row.key} className='flex items-center justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold text-gray-800'>{row.label}</p>
                    <p className='text-[11px] text-gray-400'>{row.description}</p>
                  </div>
                  <Toggle on={prefs[row.key]} onChange={() => togglePref(row.key)} />
                </div>
              ))}
            </div>
            <button className='mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700'>
              Save Preferences
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
