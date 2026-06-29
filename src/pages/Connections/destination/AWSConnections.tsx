import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Typography from '../../../components/Typography';
import WarningDialog from '../../../components/WarningDialog';
import { useDestinationService } from '../../../services/destination/destination.service';
import { formatDate } from '../../../utils';
import PermissionGate from '../../../components/PermissionGate';

export default function AWSConnections({ hideHeader }: { hideHeader?: boolean } = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const destinationService = useDestinationService();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);

  const { data: destinations, isLoading } = useQuery({
    queryKey: ['destinations'],
    queryFn: () => destinationService.listDestinations(),
  });

  const deleteMutation = useMutation({
    mutationFn: (destinationId: string) => destinationService.deleteDestination(destinationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      setDeleteDialogOpen(false);
      setSelectedDestinationId(null);
    },
    onError: (error) => {
      console.error('Failed to delete destination:', error);
    },
  });

  const awsDestinations = (destinations ?? []).filter((dest) => dest.provider === 'AWS');

  const handleDeleteClick = (destinationId: string) => {
    setSelectedDestinationId(destinationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedDestinationId) {
      deleteMutation.mutate(selectedDestinationId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600';
      case 'INACTIVE': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '✓';
      case 'INACTIVE': return '✕';
      default: return '○';
    }
  };

  const clouds: { id: string; label: string; icon: ReactNode }[] = [
    {
      id: 'aws',
      label: 'Amazon AWS',
      icon: (
        <svg viewBox='0 0 100 60' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-5 w-auto'>
          <text x='50' y='40' fontSize='28' fontWeight='bold' fill='#FF9900' textAnchor='middle'>aws</text>
        </svg>
      ),
    }
    // {
    //   id: 'azure',
    //   label: 'Microsoft Azure',
    //   icon: (
    //     <svg viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-5 w-5'>
    //       <path d='M18.5 4L9 18.5H16L7 28h18L18.5 4z' fill='#0078D4' />
    //     </svg>
    //   ),
    // },
    // {
    //   id: 'gcp',
    //   label: 'Google Cloud',
    //   icon: (
    //     <svg viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-5 w-5'>
    //       <circle cx='16' cy='16' r='7' stroke='#4285F4' strokeWidth='3' fill='none' />
    //       <path d='M23 16h6' stroke='#EA4335' strokeWidth='3' strokeLinecap='round' />
    //       <path d='M16 23v6' stroke='#34A853' strokeWidth='3' strokeLinecap='round' />
    //       <path d='M9 16H3' stroke='#FBBC05' strokeWidth='3' strokeLinecap='round' />
    //     </svg>
    //   ),
    // },
  ];

  const [selectedCloud, setSelectedCloud] = useState('aws');

  const selectedLabel = clouds.find((c) => c.id === selectedCloud)?.label ?? '';

  return (
    <div className='flex w-full min-w-0 flex-col flex-1 min-h-0 overflow-hidden'>

      {/* Header */}
      {!hideHeader && (
        <div className='flex-shrink-0 px-4 pt-4 sm:px-6 sm:pt-6'>
          <section className='rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <Typography as='h1' variant='pageTitle' className='mb-0.5'>Destination Connections</Typography>
                <Typography variant='body' color='muted'>Manage your cloud storage destinations</Typography>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Two-panel layout */}
      <div className='flex flex-1 min-h-0 gap-5 p-4 sm:p-6'>

        {/* Cloud List */}
        <aside className='w-56 shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden'>
          <div className='border-b border-gray-200 px-4 py-3'>
            <Typography as='h3' variant='sectionTitle'>Cloud Platforms</Typography>
          </div>
          <div className='flex-1 overflow-y-auto p-2'>
            {clouds.map((cloud) => (
              <button
                key={cloud.id}
                type='button'
                onClick={() => setSelectedCloud(cloud.id)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                  selectedCloud === cloud.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                <span className='shrink-0'>{cloud.icon}</span>
                <span className='text-sm font-semibold'>{cloud.label}</span>
                {cloud.id !== 'aws' && (
                  <span className='ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full'>Soon</span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <section className='flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden'>
          <div className='border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0'>
            <div>
              <Typography as='h2' variant='sectionTitle'>
                {selectedCloud === 'aws' ? 'All AWS Connections' : `${selectedLabel} Connections`}
              </Typography>
              <Typography variant='bodySm' color='muted' className='mt-1'>
                {selectedCloud === 'aws'
                  ? 'Manage and monitor all your connected AWS S3 buckets. Each instance managed independently.'
                  : 'Manage your cloud storage connections for this platform.'}
              </Typography>
            </div>
            {selectedCloud === 'aws' && (
              <PermissionGate permission='destinationConnection.write'>
                <button
                  onClick={() => navigate('/connections/aws/connect')}
                  type='button'
                  className='shrink-0 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'
                >
                  <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                    <path d='M10 4v12M4 10h12' strokeLinecap='round' />
                  </svg>
                  Connect New Bucket
                </button>
              </PermissionGate>
            )}
          </div>

          <div className='flex-1 overflow-y-auto px-6 py-6'>
            {selectedCloud !== 'aws' ? (
              <div className='flex h-full flex-col items-center justify-center py-16 text-center'>
                <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' className='h-7 w-7 text-amber-500'>
                    <path d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </div>
                <p className='text-base font-semibold text-gray-800'>Coming Soon</p>
                <p className='mt-1 text-sm text-gray-500'>
                  {selectedLabel} integration is currently under development.
                </p>
              </div>
            ) : isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <p className='text-sm text-gray-500'>Loading AWS connections...</p>
              </div>
            ) : awsDestinations.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-center'>
                <p className='text-sm font-medium text-gray-500'>No AWS buckets connected yet</p>
                <p className='mt-1 text-xs text-gray-400'>Click "+ Connect New Bucket" to get started</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {awsDestinations.map((destination) => (
                  <div
                    key={destination.destinationId}
                    className='flex items-center justify-between rounded-lg border border-gray-200 px-4 py-4 hover:bg-gray-50'
                  >
                    <div className='flex items-center gap-4'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50'>
                        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5 text-orange-500'>
                          <rect x='2' y='3' width='20' height='14' rx='2' ry='2' />
                          <line x1='2' y1='17' x2='22' y2='17' />
                        </svg>
                      </div>
                      <div>
                        <p className='font-medium text-gray-900'>{destination.name}</p>
                        <p className='text-xs text-gray-500'>AWS S3 Destination</p>
                      </div>
                    </div>

                    <div className='flex items-center gap-4'>
                      <div className='text-right'>
                        <p className={`text-sm font-semibold ${getStatusColor(destination.status)}`}>
                          <span className='mr-1'>{getStatusIcon(destination.status)}</span>
                          {destination.status}
                        </p>
                        <p className='text-xs text-gray-500'>Connected on {formatDate(destination.createdAt)}</p>
                      </div>

                      <div className='flex gap-2'>
                        <PermissionGate permission='destinationConnection.write'>
                          <button
                            type='button'
                            onClick={() => navigate(`/connections/aws/edit/${destination.destinationId}`)}
                            className='rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600'
                            title='Edit'
                          >
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                              <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' strokeLinecap='round' strokeLinejoin='round' />
                              <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
                          </button>
                        </PermissionGate>
                        <PermissionGate permission='destinationConnection.delete'>
                          <button
                            type='button'
                            onClick={() => handleDeleteClick(destination.destinationId)}
                            disabled={deleteMutation.isPending}
                            className='rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50'
                            title='Delete'
                          >
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                              <polyline points='3 6 5 6 21 6' strokeLinecap='round' strokeLinejoin='round' />
                              <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <WarningDialog
        isOpen={deleteDialogOpen}
        title='Delete AWS Connection'
        message='Are you sure you want to delete this AWS connection? This action cannot be undone.'
        confirmLabel='Delete'
        cancelLabel='Cancel'
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedDestinationId(null);
        }}
      />
    </div>
  );
}
