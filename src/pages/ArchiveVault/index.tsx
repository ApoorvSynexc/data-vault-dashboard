import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../services/archival/archival.service';
import ArchiveVaultHomePage from './HomePage';
import ArchiveVaultWelcome from './Welcome';

// ── Platform Icons ────────────────────────────────────────────────────────────

function SalesforceIcon() {
  return (
    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-[#00A1E0]'>
      <svg viewBox='0 0 48 48' className='h-5 w-5' fill='white'>
        <path d='M20 8c-2.8 0-5.2 1.6-6.4 4C12.4 11.4 11.2 11 10 11c-3.9 0-7 3.1-7 7 0 1.2.3 2.4.9 3.3C2.7 22.4 2 23.9 2 25.5 2 29 4.9 32 8.5 32H38c3.3 0 6-2.7 6-6 0-2.8-1.9-5.2-4.5-5.8.3-.7.5-1.5.5-2.2 0-3.3-2.7-6-6-6-.8 0-1.5.2-2.2.4C30.5 10 27.5 8 24 8c-1.5 0-2.9.4-4 1.1V8z' />
      </svg>
    </div>
  );
}

function HubSpotIcon() {
  return (
    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-orange-100'>
      <svg viewBox='0 0 24 24' className='h-5 w-5' fill='#ff7a59'>
        <circle cx='12' cy='12' r='3' />
        <line x1='12' y1='3' x2='12' y2='9' stroke='#ff7a59' strokeWidth='2.2' strokeLinecap='round' />
        <line x1='12' y1='15' x2='12' y2='21' stroke='#ff7a59' strokeWidth='2.2' strokeLinecap='round' />
        <line x1='3' y1='12' x2='9' y2='12' stroke='#ff7a59' strokeWidth='2.2' strokeLinecap='round' />
        <line x1='15' y1='12' x2='21' y2='12' stroke='#ff7a59' strokeWidth='2.2' strokeLinecap='round' />
      </svg>
    </div>
  );
}

// ── Policy Card ───────────────────────────────────────────────────────────────

function PolicyCard({
  title,
  description,
  tags,
  icon,
}: {
  title: string;
  description: string;
  tags: string[];
  icon: ReactNode;
}) {
  return (
    <div className='rounded-xl border border-gray-200 bg-white p-5'>
      <div className='mb-3 flex items-start justify-between gap-3'>
        <h4 className='text-sm font-semibold text-gray-900'>{title}</h4>
        {icon}
      </div>
      <p className='mb-4 text-xs leading-relaxed text-gray-500'>{description}</p>
      <div className='flex flex-wrap gap-2'>
        {tags.map((tag) => (
          <span
            key={tag}
            className='rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600'
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Pricing Tier Card ─────────────────────────────────────────────────────────

function TierCard({
  title,
  description,
  price,
}: {
  title: string;
  description: string;
  price: string;
}) {
  return (
    <div className='flex flex-col rounded-xl border border-gray-200 bg-white p-5'>
      <h4 className='mb-1.5 text-sm font-semibold text-gray-900'>{title}</h4>
      <p className='mb-4 text-xs leading-relaxed text-gray-500'>{description}</p>
      <p className='mb-5 text-3xl font-bold text-gray-900'>
        {price}
        <span className='text-sm font-semibold text-gray-500'>/GB</span>
      </p>
      <button className='mt-auto w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700'>
        Apply Tier
      </button>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const policies = [
  {
    id: 1,
    title: 'Finance Records Hold',
    description: 'Quarterly exports kept immutable with dual-region replication.',
    tags: ['7-year retention', 'PDF + CSV export', 'Legal hold active'],
    icon: <SalesforceIcon />,
  },
  {
    id: 2,
    title: 'Customer Support Archive',
    description: 'Quarterly exports kept immutable with dual-region replication.',
    tags: ['3-year retention', 'Compressed Archive', 'Hold and Demand'],
    icon: <SalesforceIcon />,
  },
  {
    id: 3,
    title: 'Regional CRM Archive',
    description: 'Quarterly exports kept immutable with dual-region replication.',
    tags: ['3-year retention', 'Compressed Archive', 'Hold and Demand'],
    icon: <HubSpotIcon />,
  },
  {
    id: 4,
    title: 'Case Records Archive',
    description: 'Quarterly exports kept immutable with dual-region replication.',
    tags: ['1-year retention', 'Compressed Archive', 'Hold and Demand'],
    icon: <SalesforceIcon />,
  },
];

const tiers = [
  {
    id: 'warm',
    title: 'Warm Archive',
    description: 'Fast retrieval for monthly compliance audits',
    price: '$0.012',
  },
  {
    id: 'cold',
    title: 'Cold Archive',
    description: 'Optimized for cost-sensitive long-term retention',
    price: '$0.004',
  },
  {
    id: 'legal',
    title: 'Legal Hold Vault',
    description: 'Fast retrieval for monthly compliance audits',
    price: '$0.018',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArchiveVault() {
  const archivalService = useArchivalService();

  const { data, isLoading } = useQuery({
    queryKey: ['archival-config-list'],
    queryFn: () => archivalService.getList(),
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className='flex flex-1 items-center justify-center min-h-[60vh]'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600' />
          <p className='text-sm text-gray-400'>Loading Archive Vault...</p>
        </div>
      </div>
    );
  }

  const list: any[] = Array.isArray(data) ? data : ((data as any)?.data ?? (data as any)?.results ?? []);
  const hasArchives = list.length > 0;

  if (!hasArchives) return <ArchiveVaultWelcome />;

  return <ArchiveVaultHomePage />;
}
