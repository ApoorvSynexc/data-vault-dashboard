import { useEffect, useState } from 'react';
import { CRM_PLATFORM_META, CRM_PLATFORMS } from '../../constants/platforms';
import type { CrmPlatform } from '../../constants/platforms';
import { usePlatformService } from '../../services';
import type { ConnectedPlatform } from '../../services';

// ── CRM brand SVG logos ────────────────────────────────────────────────────────

function SalesforceLogo() {
  return (
    <svg viewBox='0 0 64 44' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-8 w-auto'>
      <ellipse cx='24' cy='22' rx='13' ry='13' fill='#00A1E0' />
      <ellipse cx='38' cy='18' rx='11' ry='11' fill='#00A1E0' />
      <ellipse cx='48' cy='24' rx='9' ry='9' fill='#00A1E0' />
      <ellipse cx='14' cy='28' rx='8' ry='8' fill='#00A1E0' />
      <ellipse cx='32' cy='30' rx='16' ry='10' fill='#00A1E0' />
    </svg>
  );
}

function HubSpotLogo() {
  return (
    <svg viewBox='0 0 44 44' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-8 w-auto'>
      <circle cx='30' cy='14' r='6' fill='#FF7A59' />
      <circle cx='30' cy='14' r='3' fill='white' />
      <path d='M24 14h-8v6H8v8h8v8h8v-8h8v-8h-8V14z' fill='#FF7A59' />
    </svg>
  );
}

function ZohoLogo() {
  return (
    <svg viewBox='0 0 52 20' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-6 w-auto'>
      <rect x='1' y='1' width='12' height='18' rx='3' fill='#E42527' />
      <rect x='15' y='1' width='12' height='18' rx='3' fill='#F5A623' />
      <rect x='29' y='1' width='12' height='18' rx='3' fill='#00AAEF' />
      <rect x='43' y='1' width='8' height='18' rx='3' fill='#00B050' />
    </svg>
  );
}

const CRM_LOGOS: Record<CrmPlatform, React.FC> = {
  Salesforce: SalesforceLogo,
  HubSpot: HubSpotLogo,
  Zoho: ZohoLogo,
};

// ── Add Platform Modal ─────────────────────────────────────────────────────────

function AddPlatformModal({
  onClose,
  onConnect,
  connecting,
}: {
  onClose: () => void;
  onConnect: (crm: CrmPlatform) => void;
  connecting: boolean;
}) {
  const [selected, setSelected] = useState<CrmPlatform | null>(null);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4'>
      <div className='w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]'>
        <div className='flex items-center justify-between border-b border-gray-100 px-6 py-4'>
          <div>
            <p className='text-base font-semibold text-gray-900'>Add Platform</p>
            <p className='text-xs text-gray-500'>Select a CRM to connect</p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition'
          >
            <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
              <path d='M5 5l10 10M15 5L5 15' strokeLinecap='round' />
            </svg>
          </button>
        </div>

        <div className='space-y-3 px-6 py-5'>
          {CRM_PLATFORMS.map((crm) => {
            const meta = CRM_PLATFORM_META[crm];
            const Logo = CRM_LOGOS[crm];
            const isSelected = selected === crm;
            return (
              <button
                key={crm}
                type='button'
                onClick={() => setSelected(crm)}
                className={[
                  'flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50',
                ].join(' ')}
              >
                <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50'>
                  <Logo />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-semibold' style={{ color: meta.textColor }}>{meta.label}</p>
                  <p className='text-xs text-gray-500'>{meta.description}</p>
                </div>
                <div className={[
                  'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition',
                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300',
                ].join(' ')}>
                  {isSelected && (
                    <svg viewBox='0 0 10 10' fill='none' stroke='white' strokeWidth='2' className='h-2.5 w-2.5'>
                      <path d='M2 5l2 2 4-4' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className='flex justify-end gap-3 border-t border-gray-100 px-6 py-4'>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex min-w-[88px] items-center justify-center rounded-lg border border-blue-500 bg-white px-5 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50'
          >
            Cancel
          </button>
          <button
            type='button'
            disabled={!selected || connecting}
            onClick={() => selected && onConnect(selected)}
            className='inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300'
          >
            {connecting && (
              <span className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent' />
            )}
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Platform Card ──────────────────────────────────────────────────────────────

function PlatformCard({ platform }: { platform: ConnectedPlatform }) {
  const meta = CRM_PLATFORM_META[platform.crmType];
  const Logo = CRM_LOGOS[platform.crmType];

  const syncLabel = platform.lastSyncedAt
    ? `Synced ${formatRelative(platform.lastSyncedAt)}`
    : 'Never synced';

  return (
    <div className='flex flex-col gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm'>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-base font-bold' style={{ color: meta.textColor }}>{meta.label}</p>
          <p className='mt-0.5 text-xs text-gray-500'>{meta.description}</p>
        </div>
        <Logo />
      </div>
      <div className='flex items-center gap-1.5'>
        <span className={[
          'h-2 w-2 rounded-full',
          platform.status === 'connected' ? 'bg-green-500' : platform.status === 'error' ? 'bg-red-500' : 'bg-gray-400',
        ].join(' ')} />
        <span className={[
          'text-xs font-medium capitalize',
          platform.status === 'connected' ? 'text-green-600' : platform.status === 'error' ? 'text-red-600' : 'text-gray-500',
        ].join(' ')}>
          {platform.status}
        </span>
        <span className='text-xs text-gray-400'>{syncLabel}</span>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Platforms() {
  const { getConnectedPlatforms, connectPlatform } = usePlatformService();
  const [platforms, setPlatforms] = useState<ConnectedPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getConnectedPlatforms()
      .then(setPlatforms)
      .catch(() => setError('Failed to load platforms'))
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect(crm: CrmPlatform) {
    setConnecting(true);
    try {
      const newPlatform = await connectPlatform(crm);
      setPlatforms((prev) => [...prev, newPlatform]);
      setModalOpen(false);
    } catch {
      setError('Failed to connect platform. Please try again.');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-xl font-bold text-gray-900'>Platforms</p>
          <p className='mt-0.5 text-sm text-gray-500'>Manage Connectors, authentication health, and object coverage.</p>
        </div>
        <button
          type='button'
          onClick={() => { setError(''); setModalOpen(true); }}
          className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700'
        >
          <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-3.5 w-3.5'>
            <path d='M10 4v12M4 10h12' strokeLinecap='round' />
          </svg>
          + Add Platform
        </button>
      </div>

      {/* Connected platforms */}
      <div className='mt-6'>
        <p className='text-sm font-semibold text-gray-700'>Connected Platforms</p>
        <p className='mt-0.5 text-xs text-gray-500'>Manage your connected platforms</p>

        {error && (
          <p className='mt-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-600'>{error}</p>
        )}

        {loading ? (
          <div className='mt-6 flex items-center gap-2 text-sm text-gray-400'>
            <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
            Loading platforms...
          </div>
        ) : platforms.length === 0 ? (
          <div className='mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center'>
            <p className='text-sm font-medium text-gray-500'>No platforms connected yet</p>
            <p className='mt-1 text-xs text-gray-400'>Click "+ Add Platform" to get started</p>
          </div>
        ) : (
          <div className='mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {platforms.map((p) => (
              <PlatformCard key={p.id} platform={p} />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <AddPlatformModal
          onClose={() => setModalOpen(false)}
          onConnect={handleConnect}
          connecting={connecting}
        />
      )}
    </div>
  );
}
