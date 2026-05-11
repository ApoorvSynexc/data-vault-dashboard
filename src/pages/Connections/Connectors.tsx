import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Typography from '../../components/Typography';

type Tab = 'source' | 'destination';

interface Platform {
  id: string;
  name: string;
  description: string;
  logo: React.ReactNode;
  connected: boolean;
}

// Platform Logos
function SalesforceLogo() {
  return (
    <svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-12 w-auto'>
      <ellipse cx='24' cy='22' rx='13' ry='13' fill='#00A1E0' />
      <ellipse cx='38' cy='18' rx='11' ry='11' fill='#00A1E0' />
      <ellipse cx='48' cy='24' rx='9' ry='9' fill='#00A1E0' />
      <ellipse cx='14' cy='28' rx='8' ry='8' fill='#00A1E0' />
      <ellipse cx='32' cy='30' rx='16' ry='10' fill='#00A1E0' />
    </svg>
  );
}

function AWSLogo() {
  return (
    <svg viewBox='0 0 100 60' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-12 w-auto'>
      <text x='50' y='40' fontSize='32' fontWeight='bold' fill='#FF9900' textAnchor='middle'>
        aws
      </text>
    </svg>
  );
}

const PLATFORMS: Record<Tab, Platform[]> = {
  source: [
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Connect Salesforce as source endpoint',
      logo: <SalesforceLogo />,
      connected: false,
    },
  ],
  destination: [
    {
      id: 'aws',
      name: 'AWS',
      description: 'Connect Amazon Web Services as destination endpoint',
      logo: <AWSLogo />,
      connected: false,
    },
  ],
};

function PlatformCard({ platform, onConnect }: { platform: Platform; onConnect: (id: string) => void }) {
  return (
    <div className='flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm transition hover:shadow-md'>
      <div className='flex h-16 items-center justify-center'>
        {platform.logo}
      </div>

      <div>
        <Typography as='h3' variant='sectionTitle' className='mb-1'>
          {platform.name}
        </Typography>
        <Typography variant='bodySm' color='muted'>
          {platform.description}
        </Typography>
      </div>

      <button
        type='button'
        onClick={() => onConnect(platform.id)}
        className='mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95'
      >
        Connect
        <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
          <path d='M7 10h10M15 7l3 3-3 3' strokeLinecap='round' strokeLinejoin='round' />
        </svg>
      </button>
    </div>
  );
}

export default function Connectors() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('source');

  const tabs = [
    { id: 'source' as const, label: 'Source Platforms' },
    { id: 'destination' as const, label: 'Destination Platforms' },
  ];

  const activePlatforms = PLATFORMS[activeTab];

  const handleConnect = (platformId: string) => {
    // Navigate to the connection detail page
    if (activeTab === 'source') {
      navigate(`/connections/${platformId}`);
    } else if (activeTab === 'destination') {
      navigate(`/connections/${platformId}`);
    }
  };

  return (
    <div className='flex w-full min-w-0 flex-col gap-6'>
      {/* Header */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
        <Typography as='h1' variant='pageTitle' className='mb-1'>
          Connection Endpoints
        </Typography>
        <Typography variant='body' color='muted'>
          Manage your all source and destination platform connection endpoints
        </Typography>
      </section>

      {/* Tabs and Content */}
      <section className='rounded-2xl border border-gray-200 bg-white shadow-sm'>
        {/* Tabs */}
        <div className='border-b border-gray-200 px-6'>
          <div className='flex gap-8'>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'py-4 text-sm font-semibold transition-colors',
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className='px-6 py-8'>
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {activePlatforms.map((platform) => (
              <PlatformCard key={platform.id} platform={platform} onConnect={handleConnect} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
