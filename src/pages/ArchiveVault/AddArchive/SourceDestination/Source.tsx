import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePlatformService } from '../../../../services/platform/platform.service';
import salesforceLogo from '../../../../assets/icons/salesforce_logo.svg';
import type { ConnectedPlatform } from '../../../../services/platform/platform.service';

export const AVAILABLE_PLATFORMS: ConnectedPlatform[] = [
  {
    name: 'Salesforce', crmId: 'salesforce-1', crmName: 'Salesforce',
    status: 'ACTIVE' as const,
    organizationId: 'org-placeholder',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: 'user-123',
  },
];

interface SourceProps {
  selectedPlatform: ConnectedPlatform | null;
  setSelectedPlatform: (p: ConnectedPlatform | null) => void;
  selectedConnection: ConnectedPlatform | null;
  setSelectedConnection: (c: ConnectedPlatform | null) => void;
}

export default function Source({ selectedPlatform, setSelectedPlatform, selectedConnection, setSelectedConnection }: SourceProps) {
  const platformService = usePlatformService();

  const { data: connectionData, isLoading } = useQuery({
    queryKey: ['archive-platform-connections', selectedPlatform?.crmId],
    queryFn: async () => {
      const result = await platformService.getConnectedPlatforms();
      return Array.isArray(result) ? result : [];
    },
    enabled: !!selectedPlatform,
    staleTime: 0,
  });

  const allConnections = Array.isArray(connectionData) ? connectionData : [];
  const connections = selectedPlatform
    ? allConnections.filter((c: any) =>
        (c.crm?.crmName ?? c.crmName ?? '').toLowerCase() === selectedPlatform.crmName.toLowerCase() &&
        c.isCrmConnected === true
      )
    : [];

  useEffect(() => { setSelectedConnection(null); }, [selectedPlatform?.crmId]);

  return (
    <div className='grid grid-cols-2 gap-8 flex-1 min-h-0'>
      {/* Left — Available Source Platforms */}
      <div className='bg-white rounded-lg shadow-sm p-6 flex flex-col' style={{ height: 'clamp(280px, 45vh, 420px)' }}>
        <h2 className='text-lg font-semibold text-gray-900 mb-4 flex-shrink-0'>Available Source Platform</h2>
        <div className='flex-1 overflow-y-auto space-y-3 pr-1'>
          {AVAILABLE_PLATFORMS.map((platform) => {
            const isSelected = selectedPlatform?.crmId === platform.crmId;
            return (
              <button key={platform.crmId} onClick={() => setSelectedPlatform(platform)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className='flex items-center gap-3'>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                    {isSelected && <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' /></svg>}
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

      {/* Right — Select Connections */}
      <div className='bg-white rounded-lg shadow-sm p-6 flex flex-col' style={{ height: 'clamp(280px, 45vh, 420px)' }}>
        <h2 className='text-lg font-semibold text-gray-900 mb-4 flex-shrink-0'>
          Select {selectedPlatform?.crmName || 'Platform'} Connections
        </h2>
        {selectedPlatform ? (
          isLoading ? (
            <div className='flex items-center justify-center flex-1'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
            </div>
          ) : (
            <div className='flex-1 overflow-y-auto space-y-3 pr-1'>
              {connections.map((connection: any) => {
                const isSelected = selectedConnection?.crmId === connection.crmId;
                return (
                  <div key={connection.crmId} onClick={() => setSelectedConnection(connection)}
                    className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className='flex items-center gap-3'>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                        {isSelected && <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' /></svg>}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <p className={`font-semibold truncate ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{connection.crmProfile?.username ?? connection.contactEmail ?? connection.crmId}</p>
                          {(connection.crm?.environment ?? connection.environment) && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                              (connection.crm?.environment ?? connection.environment) === 'production' ? 'bg-green-50 text-green-700'
                              : (connection.crm?.environment ?? connection.environment) === 'sandbox' ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-blue-700'
                            }`}>{connection.crm?.environment ?? connection.environment}</span>
                          )}
                        </div>
                        <p className='text-xs text-gray-500 truncate'>Org ID: {connection.crm?.organizationId ?? connection.organizationId}</p>
                        {(connection.firstName || connection.lastName) && (
                          <p className='text-xs text-gray-500 truncate'>{[connection.firstName, connection.lastName].filter(Boolean).join(' ')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {connections.length === 0 && (
                <p className='text-center text-gray-500 py-8'>No connections available for this platform</p>
              )}
            </div>
          )
        ) : (
          <div className='flex items-center justify-center flex-1 text-gray-500'>
            <p>Select a platform to view connections</p>
          </div>
        )}
      </div>
    </div>
  );
}
