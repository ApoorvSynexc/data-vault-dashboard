import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CRM_NAME_MAP, CRM_PLATFORM_META } from '../../constants/platforms';
import type { CrmPlatform } from '../../constants/platforms';
import { usePlatformService } from '../../services';
import type { ConnectedPlatform } from '../../services';
import Typography from '../../components/Typography';
import AddPlatformModal from './AddPlatform';

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

function PlatformCard({ platform }: { platform: ConnectedPlatform }) {
  const crmPlatform = CRM_NAME_MAP[platform.crmName.toLowerCase()];
  const meta = crmPlatform ? CRM_PLATFORM_META[crmPlatform] : null;
  const Logo = crmPlatform ? CRM_LOGOS[crmPlatform] : null;

  const isActive = platform.status === 'ACTIVE';
  const isError = platform.status === 'ERROR';

  return (
    <div className='flex flex-col gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm'>
      <div className='flex items-start justify-between gap-2'>
        <div>
          <p className='text-base font-bold' style={{ color: meta?.textColor ?? '#374151' }}>
            {meta?.label ?? platform.crmName}
          </p>
          <p className='mt-0.5 text-xs text-gray-500'>{meta?.description}</p>
        </div>
        {Logo && <Logo />}
      </div>

      <div className='flex items-center gap-3'>
        {platform.crmProfile.photoUrl ? (
          <img
            src={platform.crmProfile.photoUrl}
            alt={platform.crmProfile.name}
            className='h-8 w-8 rounded-full object-cover ring-2 ring-gray-100'
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600'>
            {platform.crmProfile.name.charAt(0)}
          </div>
        )}
        <div className='min-w-0'>
          <p className='truncate text-xs font-medium text-gray-800'>{platform.crmProfile.name}</p>
          <p className='truncate text-[11px] text-gray-400'>{platform.crmProfile.email}</p>
        </div>
      </div>

      <p className='truncate text-[11px] text-gray-400'>{platform.crmProfile.instanceUrl}</p>

      <div className='flex items-center gap-1.5'>
        <span className={['h-2 w-2 rounded-full', isActive ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-gray-400'].join(' ')} />
        <span className={['text-xs font-medium', isActive ? 'text-green-600' : isError ? 'text-red-600' : 'text-gray-500'].join(' ')}>
          {isActive ? 'Connected' : isError ? 'Error' : 'Inactive'}
        </span>
        <span className='text-xs text-gray-400'>Synced {formatRelative(platform.updatedAt)}</span>
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

export default function Platforms() {
  const { getConnectedPlatforms } = usePlatformService();
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const {
    data: platforms = [],
    isLoading,
  } = useQuery({
    queryKey: ['connected-platforms'],
    queryFn: getConnectedPlatforms,
  });

  return (
    <div className='flex w-full min-w-0 flex-col gap-5'>
      <section className='rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm'>
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div>
            <Typography as='h2' variant='pageTitle'>
              Platforms
            </Typography>
            <Typography className='mt-1' variant='body' color='muted'>
              Manage connectors, authentication health, and object coverage.
            </Typography>
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
      </section>

      <section className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='border-b border-gray-100 px-5 py-4'>
          <Typography as='h3' variant='sectionTitle' color='secondary'>
            Connected Platforms
          </Typography>
          <Typography className='mt-1' variant='bodySm' color='muted'>
            Manage your connected platforms
          </Typography>
        </div>

        <div className='px-5 py-5'>
          {error && (
            <p className='mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-600'>{error}</p>
          )}

          {isLoading ? (
            <div className='flex items-center gap-2 text-sm text-gray-400'>
              <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              Loading platforms...
            </div>
          ) : platforms.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center'>
              <p className='text-sm font-medium text-gray-500'>No platforms connected yet</p>
              <p className='mt-1 text-xs text-gray-400'>Click "+ Add Platform" to get started</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {platforms.map((platform) => (
                <PlatformCard key={platform.crmId} platform={platform} />
              ))}
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <AddPlatformModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
