import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { ConnectedPlatform } from '../../../../services/platform/platform.service';
import type { Destination } from '../../../../services/destination/destination.service';
import Source, { AVAILABLE_PLATFORMS } from './Source';
import DestinationView from './Destination';
import ProgressBar from '../ProgressBar';

interface Step1Props {
  initialSelectedConnection?: ConnectedPlatform | null;
  initialSelectedDestConnection?: Destination | null;
  onNext?: (conn: ConnectedPlatform, dest: Destination) => void;
}

export default function AddArchiveStep1({ initialSelectedConnection, initialSelectedDestConnection, onNext }: Step1Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<'source' | 'destination'>('source');

  const [selectedPlatform, setSelectedPlatform] = useState<ConnectedPlatform | null>(AVAILABLE_PLATFORMS[0]);
  const [selectedConnection, setSelectedConnection] = useState<ConnectedPlatform | null>(initialSelectedConnection ?? null);
  const [selectedDestConnection, setSelectedDestConnection] = useState<Destination | null>(initialSelectedDestConnection ?? null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(searchParams.get('connected') === 'true');

  const dismissSuccess = () => {
    setShowSuccessDialog(false);
    const next = new URLSearchParams(searchParams);
    next.delete('connected');
    next.delete('newDestinationId');
    setSearchParams(next, { replace: true });
  };

  const handleNext = () => {
    if (selectedConnection && selectedDestConnection) {
      onNext?.(selectedConnection, selectedDestConnection);
    }
  };

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-6 min-h-0 gap-4'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/archive-vault' className='font-semibold text-sm text-gray-700 hover:text-blue-600 transition-colors'>
            Archive Vault
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Archive</span>
        </div>

        {/* Progress bar */}
        <ProgressBar activeStep={1} />

        {/* Header */}
        <div className='flex items-start justify-between flex-shrink-0'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Choose Source and Destination</h1>
            <p className='text-gray-600 mt-1'>Select source and destination to archive your data</p>
          </div>
          <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
            Step <span className='text-blue-600'>1</span> of 6
          </span>
        </div>

        {/* Views */}
        {view === 'source' && (
          <Source
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            selectedConnection={selectedConnection}
            setSelectedConnection={setSelectedConnection}
          />
        )}

        {view === 'destination' && (
          <DestinationView
            selectedDestConnection={selectedDestConnection}
            setSelectedDestConnection={setSelectedDestConnection}
            showSuccessDialog={showSuccessDialog}
            onDismissSuccess={dismissSuccess}
          />
        )}

      </div>

      {/* Sticky Footer */}
      <div className='flex-shrink-0 flex justify-between gap-4 px-6 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/archive-vault')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-3'>
          {view === 'destination' && (
            <button
              onClick={() => setView('source')}
              className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              ← Back
            </button>
          )}
          {view === 'source' && (
            <button
              onClick={() => setView('destination')}
              disabled={!selectedConnection}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${selectedConnection ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              Select Destination →
            </button>
          )}
          {view === 'destination' && (
            <button
              onClick={handleNext}
              disabled={!selectedDestConnection}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${selectedDestConnection ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              Next Step →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
