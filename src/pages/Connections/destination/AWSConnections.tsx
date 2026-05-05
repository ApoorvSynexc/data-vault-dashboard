import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Typography from '../../../components/Typography';
import WarningDialog from '../../../components/WarningDialog';
import { useDestinationService } from '../../../services/destination/destination.service';

function AWSLogo() {
  return (
    <svg viewBox='0 0 100 60' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-10 w-auto'>
      <text x='50' y='40' fontSize='32' fontWeight='bold' fill='#FF9900' textAnchor='middle'>
        aws
      </text>
    </svg>
  );
}

export default function AWSConnections() {
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
      case 'ACTIVE':
        return 'text-green-600';
      case 'INACTIVE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '✓';
      case 'INACTIVE':
        return '✕';
      default:
        return '○';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className='flex w-full min-w-0 flex-col gap-6'>
      {/* Breadcrumb */}
      <div className='flex items-center gap-2 text-sm'>
        <button
          onClick={() => navigate('/connections')}
          className='text-gray-600 hover:text-gray-900 hover:underline'
        >
          Connections
        </button>
        <span className='text-gray-400'>›</span>
        <span className='font-semibold text-gray-900'>AWS</span>
      </div>

      {/* Header */}
      <section className='rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-sm'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-4'>
            <button
              onClick={() => navigate('/connections')}
              className='mt-1 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
            >
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                className='h-5 w-5'
              >
                <path d='M19 12H5M12 19l-7-7 7-7' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </button>
            <div className='flex items-start gap-3'>
              <div className='mt-1'>
                <AWSLogo />
              </div>
              <div>
                <Typography as='h1' variant='pageTitle' className='mb-1'>
                  Amazon Web Services
                </Typography>
                <Typography variant='body' color='muted'>
                  Manage your connections with AWS
                </Typography>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/connections/aws/connect')}
            type='button'
            className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'
          >
            <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
              <path d='M10 4v12M4 10h12' strokeLinecap='round' />
            </svg>
            Connect New
          </button>
        </div>
      </section>

      <div className='grid grid-cols-3 gap-6'>
        {/* Main Content */}
        <section className='col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-6 py-4'>
            <Typography as='h2' variant='sectionTitle'>
              All AWS Connections
            </Typography>
            <Typography variant='bodySm' color='muted' className='mt-1'>
              Manage and monitor all your connected AWS S3 buckets. Each instance managed independently.
            </Typography>
          </div>

          <div className='px-6 py-6'>
            {isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <p className='text-sm text-gray-500'>Loading AWS connections...</p>
              </div>
            ) : awsDestinations.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-center'>
                <p className='text-sm font-medium text-gray-500'>No AWS buckets connected yet</p>
                <p className='mt-1 text-xs text-gray-400'>Click "+ Connect New" to get started</p>
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className='flex flex-col gap-4'>
          {/* Summary Card */}
          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
            <Typography as='h3' variant='sectionTitle' className='mb-4'>
              Summary
            </Typography>

            <div className='space-y-4'>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50'>
                  <svg viewBox='0 0 100 60' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-5 w-auto'>
                    <text x='50' y='40' fontSize='20' fontWeight='bold' fill='#FF9900' textAnchor='middle'>
                      aws
                    </text>
                  </svg>
                </div>
                <div>
                  <p className='text-2xl font-bold text-gray-900'>{awsDestinations.length}</p>
                  <p className='text-xs text-gray-500'>Connected Bucket{awsDestinations.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className='border-t border-gray-100 pt-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-gray-600'>Total Data</p>
                  <p className='font-semibold text-gray-900'>23 GB</p>
                </div>
              </div>

              <div className='border-t border-gray-100 pt-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-gray-600'>Total Data Size</p>
                  <p className='font-semibold text-gray-900'>Unlimited</p>
                </div>
              </div>

              <div className='border-t border-gray-100 pt-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-gray-600'>Transfer Success Rate</p>
                  <p className='font-semibold text-green-600'>99%</p>
                </div>
              </div>
            </div>
          </section>

          {/* Platform Health Card */}
          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
            <Typography as='h3' variant='sectionTitle' className='mb-4'>
              Platform Health
            </Typography>
            <div className='flex items-center justify-center py-8'>
              <p className='text-sm text-gray-500'>No Backups Found !</p>
            </div>
          </section>

          {/* Secure & Compliant */}
          <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
            <div className='flex gap-3'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5 shrink-0 text-blue-600'>
                <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              <div>
                <p className='text-sm font-semibold text-gray-900'>Secure & Compliant</p>
                <p className='mt-1 text-xs text-gray-600'>
                  All AWS connection are encrypted and follow 2.0 authentication. We never store your credentials
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* Delete Confirmation Dialog */}
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
