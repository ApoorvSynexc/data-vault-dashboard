import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDestinationService } from '../../../../services/destination/destination.service';
import awsLogo from '../../../../assets/icons/aws_logo.svg';
import type { Destination } from '../../../../services/destination/destination.service';

type Step2Props = {
  onNext: (destination: Destination | null) => void;
  onBack: () => void;
  strategy?: 'realtime' | 'scheduled';
  initialDestinationId?: string | null;
};

const DEFAULT_DESTINATION = {
  name: 'AWS',
  provider: 'AWS',
  status: 'ACTIVE' as const,
};

export default function Step2({ onNext, onBack, strategy = 'realtime', initialDestinationId }: Step2Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const destinationService = useDestinationService();
  const [selectedDestination, setSelectedDestination] = useState<typeof DEFAULT_DESTINATION | null>(DEFAULT_DESTINATION);
  const [selectedConnection, setSelectedConnection] = useState<Destination | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(searchParams.get('connected') === 'true');

  const getMaxSteps = () => {
    return strategy === 'realtime' ? 6 : 7;
  };
  const maxSteps = getMaxSteps();

  // Fetch destinations when AWS is selected - staleTime 0 to always show latest destinations
  const { data: connectionsData, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['step2-destinations', selectedDestination?.provider],
    queryFn: async () => destinationService.listDestinations(),
    enabled: !!selectedDestination,
    staleTime: 0,
  });

  const connections = (connectionsData as any)?.data ?? connectionsData ?? [];

  // Restore previously selected connection if returning to this step
  useEffect(() => {
    if (connections.length > 0 && !isLoadingConnections && initialDestinationId && !selectedConnection) {
      const found = connections.find((conn: Destination) => conn.destinationId === initialDestinationId);
      if (found) fetchAndSetConfig(found);
    }
  }, [connections, isLoadingConnections]);

  const fetchAndSetConfig = async (connection: Destination) => {
    try {
      const decryptedConfig = await destinationService.getDecryptedConfig(connection.destinationId);
      setSelectedConnection({
        ...connection,
        config: decryptedConfig ?? undefined,
      });
    } catch (error) {
      console.error('Failed to fetch destination config:', error);
      setSelectedConnection(connection);
    }
  };

  const isSelected = selectedDestination?.provider === DEFAULT_DESTINATION.provider;

  const dismissSuccess = () => {
    setShowSuccessDialog(false);
    const next = new URLSearchParams(searchParams);
    next.delete('connected');
    setSearchParams(next, { replace: true });
  };

  return (
    <>
    {showSuccessDialog && (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
        <div className='bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center gap-4'>
          <div className='w-16 h-16 rounded-full bg-green-100 flex items-center justify-center'>
            <svg className='w-8 h-8 text-green-600' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
            </svg>
          </div>
          <h2 className='text-xl font-bold text-gray-900'>Connection Successful!</h2>
          <p className='text-sm text-gray-500 text-center'>
            Your AWS destination has been connected successfully. You can now select it below to continue.
          </p>
          <button
            onClick={dismissSuccess}
            className='mt-2 w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors'
          >
            Got it
          </button>
        </div>
      </div>
    )}
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      {/* Scrollable area */}
      <div className='flex-1 overflow-y-auto flex flex-col p-8 min-h-0'>
        {/* Header */}
        <div className='flex items-start justify-between mb-6 flex-shrink-0'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Choose Destination</h1>
            <p className='text-gray-600 mt-2'>Select destination where your backup will be stored</p>
          </div>
          <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
            Step 2 of {maxSteps}
          </span>
        </div>

        {/* Main Content — grows to fill remaining space */}
        <div className='grid grid-cols-2 gap-8 flex-1 min-h-0'>
          {/* Left Column */}
          <div className='bg-white rounded-lg shadow-sm p-6 flex flex-col'>
            <h2 className='text-lg font-semibold text-gray-900 mb-6'>Available Destination Platform</h2>
            <div className='space-y-3'>
              <button
                onClick={() => setSelectedDestination(DEFAULT_DESTINATION)}
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
                  <img src={awsLogo} alt='AWS' className='w-10 h-10 rounded-lg object-contain' />
                  <div className='flex-1'>
                    <p className='font-semibold text-blue-600'>AWS</p>
                    <p className='text-xs text-gray-500'>Amazon Web Services</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className='bg-white rounded-lg shadow-sm p-6 flex flex-col'>
            <h2 className='text-lg font-semibold text-gray-900 mb-6'>
              Available {selectedDestination?.provider || 'Destination'} Connections
            </h2>

            {selectedDestination ? (
              <>
                {isLoadingConnections ? (
                  <div className='flex items-center justify-center flex-1'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {connections.map((connection: Destination) => {
                      const connSelected = selectedConnection?.destinationId === connection.destinationId;
                      return (
                        <div
                          key={connection.destinationId}
                          onClick={() => fetchAndSetConfig(connection)}
                          className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                            connSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className='flex items-center gap-3'>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              connSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                            }`}>
                              {connSelected && (
                                <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                                </svg>
                              )}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <p className={`font-semibold truncate ${connSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                                {connection.name}
                              </p>
                              <p className='text-xs text-gray-500 truncate'>Provider: {connection.provider}</p>
                              <p className='text-xs text-gray-500 truncate'>Status: {connection.status}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {connections.length === 0 && (
                      <p className='text-center text-gray-500 py-8'>No connections available</p>
                    )}
                    <div className='flex justify-center pt-2'>
                      <button
                        onClick={() => navigate('/connections/aws/connect?returnTo=/backup-management/add?step=2')}
                        className='px-5 py-2 text-sm border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-blue-500 hover:text-white hover:bg-blue-600 hover:border-solid transition-all'
                      >
                        + Add New Destination
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className='flex items-center justify-center flex-1 text-gray-500'>
                <p>Select a destination to view connections</p>
              </div>
            )}
          </div>
        </div>
      </div>{/* end scrollable area */}

      {/* Sticky Action Buttons */}
      <div className='flex-shrink-0 flex justify-between gap-4 px-8 py-4 bg-gray-50 border-t border-gray-200'>
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
            onClick={() => onNext(selectedConnection)}
            disabled={!selectedDestination || !selectedConnection}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedDestination && selectedConnection
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
