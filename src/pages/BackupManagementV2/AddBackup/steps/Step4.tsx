import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Step4Props = {
  onNext: (strategy: 'realtime' | 'scheduled', entireDatasetSelected: boolean) => void;
  onBack: () => void;
  initialStrategy?: 'realtime' | 'scheduled';
  initialEntireDatasetSelected?: boolean;
};

type BackupStrategy = 'realtime' | 'scheduled';
type DataMode = 'entire' | 'partial';

export default function Step4({ onNext, onBack, initialStrategy = 'realtime', initialEntireDatasetSelected = false }: Step4Props) {
  const navigate = useNavigate();
  const [selectedStrategy, setSelectedStrategy] = useState<BackupStrategy>(initialStrategy);
  const [dataMode, setDataMode] = useState<DataMode>(initialEntireDatasetSelected ? 'entire' : 'partial');

  const maxSteps = selectedStrategy === 'realtime' ? 6 : 7;

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>

      {/* Scrollable area */}
      <div className='flex-1 overflow-y-auto flex flex-col min-h-0 px-8 pt-8 pb-4'>

      {/* Header */}
      <div className='flex items-start justify-between flex-shrink-0 mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Choose Backup Strategy</h1>
          <p className='text-sm text-gray-500 mt-1'>Select how you want your data to be protected</p>
        </div>
        <span className='text-xs font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 4 of {maxSteps}
        </span>
      </div>

        {/* ── Backup Data Selection Mode ── */}
        <div className='flex-shrink-0 mb-6'>
          <h2 className='text-sm font-semibold text-gray-800 mb-3'>Backup Data Selection Mode</h2>
          <div className='grid grid-cols-2 gap-4'>

            {/* Entire Dataset */}
            <button
              type='button'
              onClick={() => setDataMode('entire')}
              className='flex items-center justify-between p-5 rounded-xl border-2 text-left transition-all'
              style={dataMode === 'entire'
                ? { borderColor: '#155DFC', background: '#EFF6FF' }
                : { borderColor: '#E5E7EB', background: '#fff' }}
            >
              <div className='flex items-center gap-4'>
                <div className='w-10 h-10 flex items-center justify-center flex-shrink-0' style={{ color: dataMode === 'entire' ? '#155DFC' : '#9CA3AF' }}>
                  <svg width='32' height='32' viewBox='0 0 32 32' fill='none'>
                    <path d='M6 9l4 4-4 4' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                    <path d='M6 17l4 4-4 4' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                    <path d='M14 11h12M14 19h12' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                  </svg>
                </div>
                <div>
                  <p className='font-semibold text-gray-900'>Entire Dataset</p>
                  <p className='text-xs text-gray-500 mt-0.5 leading-snug'>
                    Default all data modules are checked marked, selection can be made mannually
                  </p>
                </div>
              </div>
              <div className='flex-shrink-0 ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center'
                style={dataMode === 'entire' ? { borderColor: '#155DFC' } : { borderColor: '#D1D5DB' }}>
                {dataMode === 'entire' && (
                  <div className='w-2.5 h-2.5 rounded-full' style={{ background: '#155DFC' }} />
                )}
              </div>
            </button>

            {/* Partial Dataset */}
            <button
              type='button'
              onClick={() => setDataMode('partial')}
              className='flex items-center justify-between p-5 rounded-xl border-2 text-left transition-all'
              style={dataMode === 'partial'
                ? { borderColor: '#155DFC', background: '#EFF6FF' }
                : { borderColor: '#E5E7EB', background: '#fff' }}
            >
              <div className='flex items-center gap-4'>
                <div className='w-10 h-10 flex items-center justify-center flex-shrink-0' style={{ color: dataMode === 'partial' ? '#155DFC' : '#9CA3AF' }}>
                  <svg width='32' height='32' viewBox='0 0 32 32' fill='none'>
                    <rect x='5' y='8' width='8' height='3' rx='1' stroke='currentColor' strokeWidth='2' />
                    <rect x='5' y='16' width='8' height='3' rx='1' stroke='currentColor' strokeWidth='2' />
                    <path d='M17 10h10M17 18h6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
                  </svg>
                </div>
                <div>
                  <p className='font-semibold' style={{ color: dataMode === 'partial' ? '#155DFC' : '#111827' }}>Partial Dataset</p>
                  <p className='text-xs text-gray-500 mt-0.5 leading-snug'>
                    Select manually the objects to capture in backup process.
                  </p>
                </div>
              </div>
              <div className='flex-shrink-0 ml-4 w-5 h-5 rounded-full border-2 flex items-center justify-center'
                style={dataMode === 'partial' ? { borderColor: '#155DFC' } : { borderColor: '#D1D5DB' }}>
                {dataMode === 'partial' && (
                  <div className='w-2.5 h-2.5 rounded-full' style={{ background: '#155DFC' }} />
                )}
              </div>
            </button>

          </div>
        </div>

        {/* ── Backup Type ── */}
        <div className='flex-1 min-h-0 flex flex-col'>
          <h2 className='text-sm font-semibold text-gray-800 mb-3'>Backup Type</h2>
          <div className='grid grid-cols-2 gap-4 flex-1 min-h-0'>

            {/* Real-Time Sync Backup */}
            <button
              type='button'
              onClick={() => setSelectedStrategy('realtime')}
              className='relative p-6 rounded-xl border-2 text-left transition-all flex flex-col'
              style={selectedStrategy === 'realtime'
                ? { borderColor: '#155DFC', background: '#EFF6FF' }
                : { borderColor: '#E5E7EB', background: '#fff' }}
            >
              <div className='flex items-center gap-3 mb-3'>
                <div className='w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0'
                  style={{ borderColor: selectedStrategy === 'realtime' ? '#155DFC' : '#D1D5DB' }}>
                  <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke={selectedStrategy === 'realtime' ? '#155DFC' : '#9CA3AF'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='9' />
                    <polyline points='12 7 12 12 9 15' />
                    <path d='M16.5 3.5A9 9 0 0 1 21 12' />
                    <path d='M16.5 3.5l1 2.5-2.5.5' />
                  </svg>
                </div>
                <h3 className='text-base font-bold' style={{ color: selectedStrategy === 'realtime' ? '#155DFC' : '#111827' }}>
                  Real-Time Sync Backup
                </h3>
              </div>
              <p className='text-sm text-gray-500 mb-4'>
                Continuously capture and protects every change instantly
              </p>
              <hr className='border-gray-200 mb-4' />
              <div className='space-y-2.5'>
                {['Instant data protection', 'No Scheduling required', 'Ideal for critical data'].map((item) => (
                  <div key={item} className='flex items-center gap-2 text-sm text-gray-700'>
                    <svg width='18' height='18' viewBox='0 0 20 20' fill='none'>
                      <circle cx='10' cy='10' r='9' stroke='#155DFC' strokeWidth='1.5' />
                      <path d='M6 10l3 3 5-5' stroke='#155DFC' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </button>

            {/* Scheduled Backup */}
            <button
              type='button'
              onClick={() => setSelectedStrategy('scheduled')}
              className='relative p-6 rounded-xl border-2 text-left transition-all flex flex-col'
              style={selectedStrategy === 'scheduled'
                ? { borderColor: '#155DFC', background: '#EFF6FF' }
                : { borderColor: '#E5E7EB', background: '#fff' }}
            >
              {selectedStrategy === 'scheduled' && (
                <div className='absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center' style={{ background: '#155DFC' }}>
                  <svg width='14' height='14' viewBox='0 0 20 20' fill='white'>
                    <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                  </svg>
                </div>
              )}
              <div className='flex items-center gap-3 mb-3'>
                <div className='w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0'
                  style={{ borderColor: selectedStrategy === 'scheduled' ? '#155DFC' : '#D1D5DB' }}>
                  <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke={selectedStrategy === 'scheduled' ? '#155DFC' : '#9CA3AF'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                    <rect x='3' y='4' width='18' height='18' rx='2' />
                    <line x1='16' y1='2' x2='16' y2='6' />
                    <line x1='8' y1='2' x2='8' y2='6' />
                    <line x1='3' y1='10' x2='21' y2='10' />
                    <circle cx='15' cy='16' r='3' />
                    <polyline points='15 14.5 15 16 16 17' />
                  </svg>
                </div>
                <h3 className='text-base font-bold' style={{ color: selectedStrategy === 'scheduled' ? '#155DFC' : '#111827' }}>
                  Scheduled Backup
                </h3>
              </div>
              <p className='text-sm text-gray-500 mb-4'>
                Runs automatically at scheduled time with defined intervals
              </p>
              <hr className='border-gray-200 mb-4' />
              <div className='space-y-2.5'>
                {['Flexible scheduling', 'Optimized resource usage', 'Best for non-critical data'].map((item) => (
                  <div key={item} className='flex items-center gap-2 text-sm text-gray-700'>
                    <svg width='18' height='18' viewBox='0 0 20 20' fill='none'>
                      <circle cx='10' cy='10' r='9' stroke='#155DFC' strokeWidth='1.5' />
                      <path d='M6 10l3 3 5-5' stroke='#155DFC' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </button>

          </div>
        </div>

      </div>{/* end scrollable area */}

      {/* Action Buttons */}
      <div className='flex-shrink-0 flex justify-between px-8 py-4 border-t border-gray-200 bg-gray-50'>
        <button
          onClick={() => navigate('/backup-management')}
          className='px-6 py-2 text-blue-600 font-medium border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-3'>
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={() => onNext(selectedStrategy, dataMode === 'entire')}
            className='px-6 py-2 rounded-lg font-medium text-white transition-colors'
            style={{ background: '#155DFC' }}
          >
            Next Step →
          </button>
        </div>
      </div>

    </div>
  );
}
