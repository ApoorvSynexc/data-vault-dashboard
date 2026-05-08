import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Step3Props = {
  onNext: (strategy: 'realtime' | 'scheduled', entireDatasetSelected: boolean) => void;
  onBack: () => void;
  initialStrategy?: 'realtime' | 'scheduled';
  initialEntireDatasetSelected?: boolean;
};

type BackupStrategy = 'realtime' | 'scheduled';

export default function Step3({ onNext, onBack, initialStrategy = 'realtime', initialEntireDatasetSelected = false }: Step3Props) {
  const navigate = useNavigate();
  const [selectedStrategy, setSelectedStrategy] = useState<BackupStrategy>(initialStrategy);
  const [realtimeDataSelection, setRealtimeDataSelection] = useState(initialStrategy === 'realtime' && initialEntireDatasetSelected ? 'entire' : '');
  const [scheduledDataSelection, setScheduledDataSelection] = useState(initialStrategy === 'scheduled' && initialEntireDatasetSelected ? 'entire' : '');

  const getMaxSteps = () => {
    return selectedStrategy === 'realtime' ? 6 : 7;
  };
  const maxSteps = getMaxSteps();

  const handleEntireDatasetToggle = () => {
    if (selectedStrategy === 'realtime') {
      setRealtimeDataSelection(realtimeDataSelection === 'entire' ? '' : 'entire');
    } else {
      setScheduledDataSelection(scheduledDataSelection === 'entire' ? '' : 'entire');
    }
  };

  return (
    <div className='h-full bg-gray-50 p-8 overflow-y-auto'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Choose Backup Strategy</h1>
          <p className='text-gray-600 mt-2'>Select how you want your data to be protected</p>
        </div>
        <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 3 of {maxSteps}
        </span>
      </div>

      {/* Main Content */}
      <div className='space-y-6'>
        {/* Backup Strategy Selection */}
        <div className='grid grid-cols-2 gap-6'>
          {/* Real-Time Sync Backup */}
          <button
            onClick={() => setSelectedStrategy('realtime')}
            className={`p-6 rounded-lg border-2 transition-all text-left ${
              selectedStrategy === 'realtime'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center'>
                    <svg className='w-6 h-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <circle cx='12' cy='12' r='10' strokeWidth='2' />
                      <circle cx='12' cy='12' r='3' fill='currentColor' stroke='none' />
                    </svg>
                  </div>
                  <h3 className='text-lg font-semibold text-gray-900'>Real-Time Sync Backup</h3>
                </div>
                <p className='text-sm text-gray-600 mb-4'>
                  Continuously capture and protects every change instantly
                </p>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2 text-sm text-gray-700'>
                    <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    Instant data protection
                  </div>
                  <div className='flex items-center gap-2 text-sm text-gray-700'>
                    <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    No Scheduling required
                  </div>
                  <div className='flex items-center gap-2 text-sm text-gray-700'>
                    <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    Ideal for critical data
                  </div>
                </div>
              </div>
              {selectedStrategy === 'realtime' && (
                <div className='flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center ml-4'>
                  <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Scheduled Backup */}
          <button
            onClick={() => setSelectedStrategy('scheduled')}
            className={`p-6 rounded-lg border-2 transition-all text-left ${
              selectedStrategy === 'scheduled'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center'>
                    <svg className='w-6 h-6 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <circle cx='12' cy='12' r='10' strokeWidth='2' />
                      <polyline points='12 6 12 12 16 14' strokeWidth='2' strokeLinecap='round' />
                    </svg>
                  </div>
                  <h3 className='text-lg font-semibold text-gray-900'>Scheduled Backup</h3>
                </div>
                <p className='text-sm text-gray-600 mb-4'>
                  Run automated backups at defined intervals
                </p>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2 text-sm text-gray-700'>
                    <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    Flexible scheduling
                  </div>
                  <div className='flex items-center gap-2 text-sm text-gray-700'>
                    <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    Optimized resource usage
                  </div>
                  <div className='flex items-center gap-2 text-sm text-gray-700'>
                    <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                      <path
                        fillRule='evenodd'
                        d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                        clipRule='evenodd'
                      />
                    </svg>
                    Best for non-critical data
                  </div>
                </div>
              </div>
              {selectedStrategy === 'scheduled' && (
                <div className='flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center ml-4'>
                  <svg className='w-4 h-4 text-white' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Data Selection */}
        <button
          onClick={handleEntireDatasetToggle}
          className='w-full bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-300 hover:bg-blue-50 transition-all text-left'
        >
          <div className='flex items-start gap-4'>
            <input
              type='checkbox'
              id='entire-dataset'
              checked={selectedStrategy === 'realtime' ? realtimeDataSelection === 'entire' : scheduledDataSelection === 'entire'}
              onChange={(e) => {
                e.stopPropagation();
                if (selectedStrategy === 'realtime') {
                  setRealtimeDataSelection(e.target.checked ? 'entire' : '');
                } else {
                  setScheduledDataSelection(e.target.checked ? 'entire' : '');
                }
              }}
              className='w-5 h-5 mt-1 accent-blue-600 rounded cursor-pointer'
            />
            <div className='flex-1'>
              <label htmlFor='entire-dataset' className='font-semibold text-gray-900 cursor-pointer'>
                Entire Dataset
              </label>
              <p className='text-sm text-gray-600 mt-1'>
                Select entire org, if no manual selection of data modules required
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Action Buttons */}
      <div className='mt-12 flex justify-between'>
        <button
          onClick={() => navigate('/backup-management')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-4'>
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={() => onNext(selectedStrategy, selectedStrategy === 'realtime' ? realtimeDataSelection === 'entire' : scheduledDataSelection === 'entire')}
            className='px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700'
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
