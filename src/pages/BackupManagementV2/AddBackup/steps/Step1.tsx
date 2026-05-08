import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePlatformService } from '../../../../services/platform/platform.service';
import { CRM_PLATFORM_META } from '../../../../constants/platforms';
import salesforceLogo from '../../../../assets/icons/salesforce_logo.svg';
import type { ConnectedPlatform } from '../../../../services/platform/platform.service';

type Step1Props = {
  onNext: (platformId?: string) => void;
  strategy?: 'realtime' | 'scheduled';
  initialSelectedPlatformId?: string | null;
};

const AVAILABLE_PLATFORMS = [
  {
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
  const [selectedPlatform, setSelectedPlatform] = useState<ConnectedPlatform | null>(
    initialSelectedPlatformId ? AVAILABLE_PLATFORMS.find((p) => p.crmId === initialSelectedPlatformId) ?? null : null
  );
  const [selectedConnection, setSelectedConnection] = useState<ConnectedPlatform | null>(null);

  const getMaxSteps = () => {
    return strategy === 'realtime' ? 6 : 7;
  };
  const maxSteps = getMaxSteps();

  // Fetch connections only when a platform is selected
  const { data: connectionData, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['platform-connections', selectedPlatform?.crmId],
    queryFn: async () => {
      const result = await platformService.getConnectedPlatforms();
      return Array.isArray(result) ? result : [];
    },
    enabled: !!selectedPlatform,
    staleTime: 5 * 60 * 1000,
  });

  const allConnections = Array.isArray(connectionData) ? connectionData : [];
  // Filter connections by selected platform type (case-insensitive)
  const connections = selectedPlatform
    ? allConnections.filter((conn: any) => conn.crmName.toLowerCase() === selectedPlatform.crmName.toLowerCase())
    : [];
  const platformMeta = selectedPlatform ? CRM_PLATFORM_META[selectedPlatform.crmName as keyof typeof CRM_PLATFORM_META] : null;

  // Auto-select first connection when connections are fetched (only if not already selected)
  useEffect(() => {
    if (connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0]);
    } else if (connections.length === 0 && selectedConnection) {
      setSelectedConnection(null);
    }
  }, [connections, selectedConnection]);

  return (
    <div className='h-full bg-gray-50 p-8 overflow-y-auto'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Choose Source and Destination</h1>
          <p className='text-gray-600 mt-2'>Select source and destination for your backup process</p>
        </div>
        <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 1 of {maxSteps}
        </span>
      </div>

      {/* Main Content */}
      <div className='grid grid-cols-2 gap-8'>
        {/* Left Column - Available Source Platforms */}
        <div className='bg-white rounded-lg shadow-sm p-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>Available Source Platform</h2>

          <div className='space-y-3'>
            {AVAILABLE_PLATFORMS.map((platform) => (
              <button
                key={platform.crmId}
                onClick={() => setSelectedPlatform(platform)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedPlatform?.crmId === platform.crmId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <img
                    src={salesforceLogo}
                    alt={platform.crmName}
                    className='w-12 h-12 rounded-lg object-contain'
                  />
                  <div className='flex-1'>
                    <p className='font-semibold text-gray-900'>{platform.crmName}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Select Connections */}
        <div className='bg-white rounded-lg shadow-sm p-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>
            Select {selectedPlatform?.crmName || 'Platform'} Connections
          </h2>

          {selectedPlatform ? (
            <>
              {isLoadingConnections ? (
                <div className='flex items-center justify-center h-64'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                </div>
              ) : (
                <div className='space-y-4'>
                  {connections.map((connection: any) => (
                    <div
                      key={connection.crmId}
                      onClick={() => setSelectedConnection(connection)}
                      className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                        selectedConnection?.crmId === connection.crmId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-start gap-3'>
                        <div
                          className='w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0'
                          style={{
                            backgroundColor: platformMeta?.brandColor || '#6B7280',
                          }}
                        >
                          {connection.crmName.charAt(0).toUpperCase()}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='font-semibold text-gray-900 truncate'>
                            {connection.crmProfile?.name || connection.crmName}
                          </p>
                          <p className='text-sm text-gray-600 truncate'>
                            Org ID: {connection.crmProfile?.organizationId}
                          </p>
                          <p className='text-sm text-gray-600 truncate'>
                            Email: {connection.crmProfile?.email}
                          </p>
                        </div>
                        <span
                          className='px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0'
                          style={{
                            backgroundColor: connection.status === 'ACTIVE' ? '#E8F5E9' : '#FFF3E0',
                            color: connection.status === 'ACTIVE' ? '#2E7D32' : '#F57C00',
                          }}
                        >
                          {connection.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {connections.length === 0 && !isLoadingConnections && (
                    <p className='text-center text-gray-500 py-8'>No connections available for this platform</p>
                  )}

                  {/* Add New Connection Button */}
                  <button
                    onClick={() => {
                      if (selectedPlatform?.crmName.toLowerCase() === 'salesforce') {
                        navigate('/connections/salesforce/connect');
                      }
                    }}
                    className='w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-medium hover:border-blue-500 hover:text-blue-600 transition-colors'
                  >
                    + Add New Connection
                  </button>
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

      {/* Action Buttons */}
      <div className='mt-8 flex justify-end gap-4'>
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
