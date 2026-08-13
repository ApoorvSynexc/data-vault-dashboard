import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../../components/Typography';
import { useDestinationService } from '../../../../services/destination/destination.service';
import type { Destination } from '../../../../services/destination/destination.service';
import awsLogo from '../../../../assets/icons/aws_logo.svg';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict', 'Preview', 'Review'];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className='w-full'>
      {/* Row 1: circles + connector lines */}
      <div className='flex items-center'>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone   = num < active;
          const isActive = num === active;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold border-2 ${
                isDone   ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'bg-blue-600 border-blue-600 text-white' :
                           'bg-white border-gray-300 text-gray-400'
              }`}>
                {isDone ? (
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className='w-3.5 h-3.5'>
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                ) : num}
              </div>
              {!isLast && <div className='flex-1 h-0.5' style={{ background: isDone ? '#22C55E' : '#E5E7EB' }} />}
            </div>
          );
        })}
      </div>
      {/* Row 2: labels — same flex structure mirrors row 1 so each label is under its circle */}
      <div className='flex items-start mt-2'>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone   = num < active;
          const isActive = num === active;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={label} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'
              }`}>
                {label}
              </span>
              {!isLast && <div className='flex-1' />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ── Info tooltip ──────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  return (
    <span className='group relative flex-shrink-0 cursor-default'>
      <span className='inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold leading-none select-none'>i</span>
      <div className='pointer-events-none absolute left-0 bottom-full mb-2 z-50 hidden group-hover:block w-52 rounded-lg bg-gray-900 px-3 py-2 text-[11px] text-gray-200 leading-relaxed shadow-xl'>
        {text}
        <div className='absolute left-3 top-full w-2 h-2 bg-gray-900 rotate-45 -mt-1' />
      </div>
    </span>
  );
}

// ── Available storage providers ───────────────────────────────────────────────

const STORAGE_PROVIDERS = [
  { id: 'AWS', label: 'AWS S3', description: 'Amazon Web Services', logo: awsLogo },
];

// ── Cloud source picker ───────────────────────────────────────────────────────

function CloudSourcePicker({
  selectedProvider,
  setSelectedProvider,
  selectedConnection,
  setSelectedConnection,
}: {
  selectedProvider: string;
  setSelectedProvider: (p: string) => void;
  selectedConnection: Destination | null;
  setSelectedConnection: (c: Destination | null) => void;
}) {
  const destinationService = useDestinationService();

  const { data: destData, isLoading } = useQuery({
    queryKey: ['restore-source-destinations'],
    queryFn: () => destinationService.listDestinations(),
    staleTime: 0,
  });

  const allDest: Destination[] = (destData as any)?.data ?? destData ?? [];
  const connections = allDest.filter(
    (d) => d.provider === selectedProvider && d.status === 'ACTIVE',
  );

  useEffect(() => { setSelectedConnection(null); }, [selectedProvider]);

  return (
    <div className='flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0'>
      <div className='flex items-center gap-3 border-b border-gray-100 px-5 py-3 flex-shrink-0'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>Cloud Source</Typography>
        <span className='text-xs text-gray-400'>Select the storage platform and connection to restore from</span>
      </div>
      <div className='flex-1 min-h-0 p-4 grid grid-cols-1 md:grid-cols-2 gap-4'>

        {/* Left — Available Storage Platforms */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 flex flex-col min-h-0'>
          <div className='flex items-center gap-1.5 mb-3 flex-shrink-0'>
            <p className='text-sm font-semibold text-gray-800'>Available Source Platform</p>
            <InfoTip text='Select the cloud storage provider where your backup files are stored. Only providers with configured connections are shown.' />
          </div>
          <div className='flex-1 overflow-y-auto space-y-2 pr-1'>
            {STORAGE_PROVIDERS.map((p) => {
              const isSelected = selectedProvider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                        </svg>
                      )}
                    </div>
                    <img src={p.logo} alt={p.label} className='w-10 h-10 rounded-lg object-contain flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <p className={`font-semibold truncate ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{p.label}</p>
                      <p className='text-xs text-gray-400'>{p.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — Available Connections */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 flex flex-col min-h-0'>
          <div className='flex items-center gap-1.5 mb-3 flex-shrink-0'>
            <p className='text-sm font-semibold text-gray-800'>Available {selectedProvider} Connections</p>
            <InfoTip text='Only active connections for the selected platform are listed. Manage your connections in the Connections settings page.' />
          </div>
          {isLoading ? (
            <div className='flex-1 flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
            </div>
          ) : (
            <div className='flex-1 overflow-y-auto space-y-3 pr-1'>
              {connections.length === 0 ? (
                <p className='text-center text-sm text-gray-400 py-8'>No active connections for this platform.</p>
              ) : (
                connections.map((conn) => {
                  const isSelected = selectedConnection?.destinationId === conn.destinationId;
                  return (
                    <div
                      key={conn.destinationId}
                      onClick={() => setSelectedConnection(conn)}
                      className={`p-4 border-2 rounded-lg transition-all cursor-pointer select-none ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && (
                            <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                            </svg>
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className={`font-semibold truncate ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{conn.name}</p>
                          <p className='text-xs text-gray-400 truncate'>Provider: {conn.provider}</p>
                          <p className='text-xs text-gray-400 truncate'>Status: {conn.status}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onNext: () => void;
  onBack: () => void;
  onConnectionSelected: (c: Destination | null) => void;
}

export default function SelectSource({ onNext, onBack, onConnectionSelected }: Props) {
  const [selectedProvider, setSelectedProvider] = useState('AWS');
  const [selectedConnection, setSelectedConnection] = useState<Destination | null>(null);

  const handleConnectionSelect = (c: Destination | null) => {
    setSelectedConnection(c);
    onConnectionSelected(c);
  };

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0 h-full'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/restore-center' className='text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors'>
            Restore Center
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Restore</span>
        </div>

        {/* Step header + progress */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
          <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 1 of 8</p>
          <Typography as='h1' variant='pageTitle' color='primary'>Select Cloud Source</Typography>
          <Typography variant='bodySm' color='muted' className='mt-1'>
            Pick the storage platform and connection to restore from.
          </Typography>
          <div className='mt-4'>
            <ProgressBar active={1} />
          </div>
        </div>

        <CloudSourcePicker
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          selectedConnection={selectedConnection}
          setSelectedConnection={handleConnectionSelect}
        />

      </div>

      {/* ── Footer ── */}
      <div className='flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white'>
        <button
          onClick={onBack}
          className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
        >
          ← Cancel
        </button>
        <div className='flex items-center gap-2'>
          <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>💾 Save as Draft</button>
          <button
            onClick={onNext}
            disabled={!selectedConnection}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            style={{ background: '#155DFC' }}
          >
            Next: Select Source Type →
          </button>
        </div>
      </div>
    </div>
  );
}
