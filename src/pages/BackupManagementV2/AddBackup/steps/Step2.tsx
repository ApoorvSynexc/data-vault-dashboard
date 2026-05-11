import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const destinationService = useDestinationService();
  const [selectedDestination, setSelectedDestination] = useState<typeof DEFAULT_DESTINATION | null>(DEFAULT_DESTINATION);
  const [selectedConnection, setSelectedConnection] = useState<Destination | null>(null);

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

  // Auto-select first connection or restore initial when connections are fetched
  useEffect(() => {
    if (connections.length > 0 && !isLoadingConnections) {
      if (initialDestinationId) {
        const foundConnection = connections.find((conn: Destination) => conn.destinationId === initialDestinationId);
        if (foundConnection) {
          fetchAndSetConfig(foundConnection);
        } else if (!selectedConnection) {
          fetchAndSetConfig(connections[0]);
        }
      } else if (!selectedConnection) {
        fetchAndSetConfig(connections[0]);
      }
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

  return (
    <div className='h-full bg-gray-50 p-8 overflow-y-auto'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Choose Destination</h1>
          <p className='text-gray-600 mt-2'>Select destination where your backup will be stored</p>
        </div>
        <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 2 of {maxSteps}
        </span>
      </div>

      {/* Main Content */}
      <div className='grid grid-cols-2 gap-8'>
        {/* Left Column - Available Destination Platforms */}
        <div className='bg-white rounded-lg shadow-sm p-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>Available Destination Platform</h2>

          <div className='space-y-3'>
            <button
              onClick={() => setSelectedDestination(DEFAULT_DESTINATION)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className='flex items-center gap-3'>
                <img
                  src={awsLogo}
                  alt='AWS'
                  className='w-12 h-12 rounded-lg object-contain'
                />
                <div className='flex-1'>
                  <p className='font-semibold text-gray-900'>AWS</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column - Select Connections */}
        <div className='bg-white rounded-lg shadow-sm p-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>
            Available {selectedDestination?.provider || 'Destination'} Connections
          </h2>

          {selectedDestination ? (
            <>
              {isLoadingConnections ? (
                <div className='flex items-center justify-center h-64'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                </div>
              ) : (
                <div className='space-y-4'>
                  {connections.map((connection: Destination) => (
                    <div
                      key={connection.destinationId}
                      onClick={() => fetchAndSetConfig(connection)}
                      className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                        selectedConnection?.destinationId === connection.destinationId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 bg-yellow-500'>
                          {connection.name.charAt(0).toUpperCase()}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='font-semibold text-gray-900 truncate'>
                            {connection.name}
                          </p>
                          <p className='text-sm text-gray-600 truncate'>
                            Provider: {connection.provider}
                          </p>
                        </div>
                        <span className='px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 bg-green-100 text-green-700'>
                          {connection.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {connections.length === 0 && !isLoadingConnections && (
                    <p className='text-center text-gray-500 py-8'>No connections available</p>
                  )}

                  {/* Add New Connection Button */}
                  <button
                    onClick={() => navigate('/connections/aws/connect')}
                    className='w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-medium hover:border-blue-500 hover:text-blue-600 transition-colors'
                  >
                    + Add New Destination
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className='flex items-center justify-center h-64 text-gray-500'>
              <p>Select a destination to view connections</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className='mt-8 flex justify-between'>
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
            onClick={() => {
              if (!selectedConnection) {
                alert('Please select a destination connection');
                return;
              }
              onNext(selectedConnection);
            }}
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
  );
}
