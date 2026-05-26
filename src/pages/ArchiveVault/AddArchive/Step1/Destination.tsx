import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDestinationService } from '../../../../services/destination/destination.service';
import awsLogo from '../../../../assets/icons/aws_logo.svg';
import type { Destination } from '../../../../services/destination/destination.service';

const DEFAULT_DESTINATION = { name: 'AWS', provider: 'AWS', status: 'ACTIVE' as const };

interface DestinationProps {
  selectedDestConnection: Destination | null;
  setSelectedDestConnection: (d: Destination | null) => void;
  showSuccessDialog: boolean;
  onDismissSuccess: () => void;
}

export default function DestinationView({ selectedDestConnection, setSelectedDestConnection, showSuccessDialog, onDismissSuccess }: DestinationProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destinationService = useDestinationService();

  const selectedDestProvider = DEFAULT_DESTINATION;
  const newDestinationId = searchParams.get('newDestinationId');

  const { data: destConnectionsData, isLoading } = useQuery({
    queryKey: ['archive-destinations', selectedDestProvider.provider],
    queryFn: async () => destinationService.listDestinations(),
    staleTime: 0,
  });

  const destConnections: Destination[] = (destConnectionsData as any)?.data ?? destConnectionsData ?? [];

  const fetchAndSetDestConfig = async (conn: Destination) => {
    try {
      const decrypted = await destinationService.getDecryptedConfig(conn.destinationId);
      setSelectedDestConnection({ ...conn, config: decrypted ?? undefined });
    } catch {
      setSelectedDestConnection(conn);
    }
  };

  useEffect(() => {
    if (!newDestinationId || destConnections.length === 0 || isLoading) return;
    const found = destConnections.find((c) => c.destinationId === newDestinationId);
    if (found) fetchAndSetDestConfig(found);
  }, [destConnections, isLoading]);

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
            <p className='text-sm text-gray-500 text-center'>Your AWS destination has been connected successfully.</p>
            <button onClick={onDismissSuccess} className='mt-2 w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors'>
              Got it
            </button>
          </div>
        </div>
      )}

      <div className='grid grid-cols-2 gap-8 flex-1 min-h-0'>
        {/* Left — Available Destination Platforms */}
        <div className='bg-white rounded-lg shadow-sm p-6 flex flex-col'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>Available Destination Platform</h2>
          <div className='space-y-3'>
            <button
              className='w-full p-4 rounded-lg border-2 transition-all text-left border-blue-500 bg-blue-50'
            >
              <div className='flex items-center gap-3'>
                <div className='w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors border-blue-600 bg-blue-600'>
                  <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' /></svg>
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

        {/* Right — Available AWS Connections */}
        <div className='bg-white rounded-lg shadow-sm p-6 flex flex-col'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>
            Available {selectedDestProvider.provider} Connections
          </h2>
          {isLoading ? (
            <div className='flex items-center justify-center flex-1'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500' />
            </div>
          ) : (
            <div className='space-y-4'>
              {destConnections.map((conn) => {
                const isSelected = selectedDestConnection?.destinationId === conn.destinationId;
                return (
                  <div key={conn.destinationId} onClick={() => fetchAndSetDestConfig(conn)}
                    className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className='flex items-center gap-3'>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                        {isSelected && <svg className='w-3.5 h-3.5 text-white' fill='none' stroke='currentColor' strokeWidth='3' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' /></svg>}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className={`font-semibold truncate ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>{conn.name}</p>
                        <p className='text-xs text-gray-500 truncate'>Provider: {conn.provider}</p>
                        <p className='text-xs text-gray-500 truncate'>Status: {conn.status}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {destConnections.length === 0 && (
                <div className='space-y-3'>
                  <p className='text-center text-gray-500 py-4'>No connections available</p>
                  <div className='flex justify-center'>
                    <button
                      onClick={() => navigate('/connections/aws/connect?returnTo=/archive-vault/new')}
                      className='px-5 py-2 text-sm rounded-full text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all'
                    >
                      + Add New Destination
                    </button>
                  </div>
                </div>
              )}
              {destConnections.length > 0 && (
                <div className='flex justify-center pt-2'>
                  <button
                    onClick={() => navigate('/connections/aws/connect?returnTo=/archive-vault/new')}
                    className='px-5 py-2 text-sm rounded-full text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all'
                  >
                    + Add New Destination
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
