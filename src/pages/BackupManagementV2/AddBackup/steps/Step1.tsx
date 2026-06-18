import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePlatformService } from '../../../../services/platform/platform.service';
import salesforceLogo from '../../../../assets/icons/salesforce_logo.svg';
import type { ConnectedPlatform } from '../../../../services/platform/platform.service';

type Step1Props = {
  onNext: (platformId?: string) => void;
  strategy?: 'realtime' | 'scheduled';
  initialSelectedPlatformId?: string | null;
};

const AVAILABLE_PLATFORMS = [
  {
    name: 'Salesforce',
    crmId: 'salesforce-1',
    crmName: 'Salesforce',
    isConnected: true,
    status: 'ACTIVE' as const,
    crmProfile: {
      organizationId: 'org-123',
      photoUrl: '',
      name: 'Salesforce Production',
      userId: 'user-123',
      email: 'admin@salesforce.com',
      instanceUrl: 'https://salesforce.com',
      username: 'admin',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user-123',
  },
];

export default function Step1({ onNext, strategy = 'realtime', initialSelectedPlatformId }: Step1Props) {
  const navigate = useNavigate();
  const platformService = usePlatformService();
  // Salesforce is always pre-selected
  const [selectedPlatform, setSelectedPlatform] = useState<ConnectedPlatform | null>(
    initialSelectedPlatformId
      ? AVAILABLE_PLATFORMS.find((p) => p.crmId === initialSelectedPlatformId) ?? AVAILABLE_PLATFORMS[0]
      : AVAILABLE_PLATFORMS[0]
  );
  const [selectedConnection, setSelectedConnection] = useState<ConnectedPlatform | null>(null);
  const [connectionAutoSelected, setConnectionAutoSelected] = useState(false);

  const getMaxSteps = () => {
    return strategy === 'realtime' ? 6 : 7;
  };
  const maxSteps = getMaxSteps();

  // Fetch connections only when a platform is selected - staleTime 0 to always show latest connections
  const { data: connectionData, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['platform-connections', selectedPlatform?.crmId],
    queryFn: async () => {
      const result = await platformService.getConnectedPlatforms();
      return Array.isArray(result) ? result : [];
    },
    enabled: !!selectedPlatform,
    staleTime: 0,
  });

  const allConnections = Array.isArray(connectionData) ? connectionData : [];
  // Filter connections by selected platform type (case-insensitive)
  const connections = selectedPlatform
    ? allConnections.filter((conn: any) =>
        conn.crmName.toLowerCase() === selectedPlatform.crmName.toLowerCase() &&
        conn.isConnected === true &&
        conn.status === 'ACTIVE'
      )
    : [];
  // Clear connection when platform changes
  useEffect(() => {
    setSelectedConnection(null);
    setConnectionAutoSelected(false);
  }, [selectedPlatform?.crmId]);

  // Pre-select the previously chosen connection when returning via Edit
  useEffect(() => {
    if (connectionAutoSelected || !initialSelectedPlatformId || connections.length === 0) return;
    const found = connections.find((c: ConnectedPlatform) => c.crmId === initialSelectedPlatformId);
    if (found) {
      setSelectedConnection(found);
      setConnectionAutoSelected(true);
    }
  }, [connections, initialSelectedPlatformId, connectionAutoSelected]);

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      {/* Scrollable area — fills remaining height, passes it down */}
      <div className='flex-1 overflow-y-auto flex flex-col p-8 min-h-0'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between mb-6 flex-shrink-0'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Choose Source and Destination</h1>
          <p className='text-gray-600 mt-2'>Select source and destination for your backup process</p>
        </div>
        <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 1 of {maxSteps}
        </span>
      </div>

      {/* Main Content — grows to fill remaining space */}
      <div className='grid grid-cols-2 gap-8 flex-1 min-h-0'>
        {/* Left Column - Available Source Platforms */}
        <div className='bg-white rounded-lg shadow-sm p-6 flex flex-col'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>Available Source Platform</h2>

          <div className='space-y-3'>
            {AVAILABLE_PLATFORMS.map((platform) => {
              const isSelected = selectedPlatform?.crmId === platform.crmId;
              return (
                <button
                  key={platform.crmId}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
                        </svg>
                      )}
                    </div>
                    <img src={salesforceLogo} alt={platform.crmName} className='w-10 h-10 rounded-lg object-contain' />
                    <div className='flex-1'>
                      <p className='font-semibold text-blue-600'>{platform.crmName}</p>
                      <p className='text-xs text-gray-500'>Connected on {new Date(platform.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column - Select Connections */}
        <div className='bg-white rounded-lg shadow-sm p-6 flex flex-col'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>
            Select {selectedPlatform?.crmName || 'Platform'} Connections
          </h2>

          {selectedPlatform ? (
            <>
              {isLoadingConnections ? (
                <div className='flex items-center justify-center flex-1'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                </div>
              ) : (
                <div className='space-y-4'>
                  {connections.map((connection: any) => {
                    const isSelected = selectedConnection?.crmId === connection.crmId;
                    return (
                      <div
                        key={connection.crmId}
                        onClick={() => setSelectedConnection(connection)}
                        className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className='flex items-center gap-3'>
                          {/* Checkbox */}
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
                            <div className='flex items-center gap-2'>
                              <p className={`font-semibold truncate ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                                {connection.name}
                              </p>
                              {connection.environment && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                                  connection.environment === 'production' ? 'bg-green-50 text-green-700'
                                  : connection.environment === 'sandbox' ? 'bg-amber-50 text-amber-700'
                                  : 'bg-blue-50 text-blue-700'
                                }`}>{connection.environment}</span>
                              )}
                            </div>
                            <p className='text-xs text-gray-500 truncate'>Org ID : {connection.crmProfile?.organizationId}</p>
                            {connection.crmProfile?.username && <p className='text-xs text-gray-500 truncate'>@{connection.crmProfile.username}</p>}
                            <p className='text-xs text-gray-500 truncate'>{connection.crmProfile?.instanceUrl?.replace('https://', '')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {connections.length === 0 && !isLoadingConnections && (
                    <p className='text-center text-gray-500 py-8'>No connections available for this platform</p>
                  )}

                </div>
              )}
            </>
          ) : (
            <div className='flex items-center justify-center h-64 text-gray-500'>
              <p>Select a platform to view connections</p>
            </div>
          )}
        </div>
      </div>

      </div>{/* end scrollable area */}

      {/* Sticky Action Buttons */}
      <div className='flex-shrink-0 flex justify-end gap-4 px-8 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/backup-management')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <button
          onClick={() => onNext(selectedConnection?.crmId)}
          disabled={!selectedConnection}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            selectedConnection
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Select Destination
        </button>
      </div>
    </div>
  );
}
