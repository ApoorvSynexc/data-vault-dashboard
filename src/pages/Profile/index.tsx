import { useQuery } from '@tanstack/react-query';
import { useUserService } from '../../services';
import { formatDateTime } from '../../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyProfile {
  userId: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  isCrmConnected: boolean;
  customUrl?: string;
  crmId?: string;
  crmProfile?: {
    email: string;
    username: string;
    organizationId: string;
    instanceUrl: string;
    photoUrl?: string;
    userId: string;
  };
  role?: {
    name: string;
    roleId: string;
    description?: string;
    permissions: string[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function permissionLabel(p: string): string {
  const [module, action] = p.split('.');
  return `${module.charAt(0).toUpperCase() + module.slice(1)} · ${action.charAt(0).toUpperCase() + action.slice(1)}`;
}

const PERM_COLOR: Record<string, string> = {
  read:   'bg-blue-50 text-blue-700 border-blue-100',
  write:  'bg-violet-50 text-violet-700 border-violet-100',
  delete: 'bg-red-50 text-red-600 border-red-100',
  execute:'bg-green-50 text-green-700 border-green-100',
};

function permColor(p: string): string {
  const action = p.split('.')[1] ?? '';
  return PERM_COLOR[action] ?? 'bg-gray-50 text-gray-600 border-gray-100';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-50 last:border-0'>
      <span className='text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-40 flex-shrink-0 pt-0.5'>{label}</span>
      <span className='text-sm text-gray-900 break-all'>{value ?? '—'}</span>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50'>
        <span className='flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600'>{icon}</span>
        <span className='text-sm font-semibold text-gray-800'>{title}</span>
      </div>
      <div className='px-5 divide-y divide-gray-50'>{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const cls = s === 'ACTIVE'
    ? 'bg-green-100 text-green-700 border-green-200'
    : s === 'INACTIVE'
    ? 'bg-gray-100 text-gray-600 border-gray-200'
    : 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`} />
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Profile() {
  const { getMyProfile } = useUserService();

  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['myProfile'],
    queryFn: () => getMyProfile<{ data: MyProfile }>(),
  });

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-24'>
        <span className='h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent' />
      </div>
    );
  }

  if (isError) {
    return (
      <div className='flex items-center justify-center py-24 text-sm text-red-500'>
        Failed to load profile. Please refresh the page.
      </div>
    );
  }

  const p: MyProfile = (raw as any)?.data ?? raw;
  if (!p) return null;

  const initials = `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase();
  const fullName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
  const displayEmail = p.crmProfile?.email ?? p.contactEmail;

  return (
    <div className='mx-auto flex max-w-3xl flex-col gap-5 py-2'>

      {/* ── Header ── */}
      <div className='flex items-center gap-5 rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm'>
        <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-md'>
          {initials || '?'}
        </div>
        <div className='min-w-0 flex-1'>
          <h1 className='text-xl font-bold text-gray-900'>{fullName || '—'}</h1>
          <p className='mt-0.5 text-sm text-gray-500 truncate'>{displayEmail}</p>
          {p.crmProfile?.username && p.crmProfile.username !== displayEmail && (
            <p className='mt-0.5 text-xs text-gray-400 truncate font-mono'>{p.crmProfile.username}</p>
          )}
        </div>
        <StatusBadge status={p.status} />
      </div>

      {/* ── Account Details ── */}
      <Card
        title='Account Details'
        icon={
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
            <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/>
          </svg>
        }
      >
        <Row label='User ID'     value={<span className='font-mono text-xs text-gray-600'>{p.userId}</span>} />
        <Row label='First Name'  value={p.firstName} />
        <Row label='Last Name'   value={p.lastName} />
        <Row label='Email'       value={p.contactEmail} />
        <Row label='Status'      value={<StatusBadge status={p.status} />} />
        <Row label='Member Since' value={formatDateTime(p.createdAt)} />
        <Row label='Last Updated' value={formatDateTime(p.updatedAt)} />
      </Card>

      {/* ── Role & Permissions ── */}
      {p.role && (
        <Card
          title='Role & Permissions'
          icon={
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
              <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>
            </svg>
          }
        >
          <Row label='Role Name'   value={<span className='font-semibold text-gray-800'>{p.role.name}</span>} />
          <Row label='Role ID'     value={<span className='font-mono text-xs text-gray-500'>{p.role.roleId}</span>} />
          {p.role.description && <Row label='Description' value={p.role.description} />}
          <div className='py-3'>
            <p className='text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5'>Permissions</p>
            <div className='flex flex-wrap gap-1.5'>
              {p.role.permissions.map((perm) => (
                <span
                  key={perm}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${permColor(perm)}`}
                >
                  {permissionLabel(perm)}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── CRM Connection ── */}
      {p.crmProfile && (
        <Card
          title='CRM Connection'
          icon={
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
              <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/>
              <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/>
            </svg>
          }
        >
          <Row
            label='Status'
            value={
              p.isCrmConnected
                ? <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-green-700'><span className='h-1.5 w-1.5 rounded-full bg-green-500' />Connected</span>
                : <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500'><span className='h-1.5 w-1.5 rounded-full bg-gray-400' />Not Connected</span>
            }
          />
          <Row label='Email'           value={p.crmProfile.email} />
          <Row label='Username'        value={<span className='font-mono text-xs text-gray-600'>{p.crmProfile.username}</span>} />
          <Row label='Organization ID' value={<span className='font-mono text-xs text-gray-600'>{p.crmProfile.organizationId}</span>} />
          <Row label='Instance URL'    value={
            <a href={p.crmProfile.instanceUrl} target='_blank' rel='noopener noreferrer'
              className='text-blue-600 hover:underline text-xs break-all'>
              {p.crmProfile.instanceUrl}
            </a>
          } />
          {p.customUrl && p.customUrl !== p.crmProfile.instanceUrl && (
            <Row label='Custom URL' value={
              <a href={p.customUrl} target='_blank' rel='noopener noreferrer'
                className='text-blue-600 hover:underline text-xs break-all'>
                {p.customUrl}
              </a>
            } />
          )}
        </Card>
      )}

    </div>
  );
}
