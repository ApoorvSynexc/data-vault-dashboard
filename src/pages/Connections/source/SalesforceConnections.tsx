import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Typography from '../../../components/Typography';
import WarningDialog from '../../../components/WarningDialog';
import { usePlatformService, type ConnectedPlatform } from '../../../services/platform/platform.service';
import { formatDate } from '../../../utils';

function SalesforceLogo() {
  return (
    <svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-10 w-auto'>
      <ellipse cx='24' cy='22' rx='13' ry='13' fill='#00A1E0' />
      <ellipse cx='38' cy='18' rx='11' ry='11' fill='#00A1E0' />
      <ellipse cx='48' cy='24' rx='9' ry='9' fill='#00A1E0' />
      <ellipse cx='14' cy='28' rx='8' ry='8' fill='#00A1E0' />
      <ellipse cx='32' cy='30' rx='16' ry='10' fill='#00A1E0' />
    </svg>
  );
}

export default function SalesforceConnections() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const platformService = usePlatformService();
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const disconnectMutation = useMutation({
    mutationFn: (crmId: string) => platformService.disconnectPlatform(crmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setDisconnectDialogOpen(false);
      setSelectedOrgId(null);
      setDisconnectError(null);
    },
    onError: (err: any) => {
      setDisconnectError(err?.message || 'Failed to disconnect. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (crmId: string) => platformService.deletePlatform(crmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setDeleteDialogOpen(false);
      setSelectedOrgId(null);
      setDeleteError(null);
    },
    onError: (err: any) => {
      setDeleteError(err?.message || 'Failed to delete. Please try again.');
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: ({ crmId, environment }: { crmId: string; environment?: string }) =>
      platformService.reconnectPlatform(crmId, {
        environment: environment as 'production' | 'sandbox' | 'custom' | undefined,
      }),
    onSuccess: (data: string | any) => {
      if (typeof data === 'string') {
        window.location.href = data;
      } else if (data && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    },
  });

  const { data: allPlatforms, isLoading } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformService.getConnectedPlatforms(),
  });

  const salesforcePlatforms = (allPlatforms || []).filter(
    (platform) => platform.crmName.toLowerCase() === 'salesforce'
  );

  const getStatusColor = (status: ConnectedPlatform['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600';
      case 'ERROR':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: ConnectedPlatform['status']) => {
    switch (status) {
      case 'ACTIVE':
        return '✓';
      case 'ERROR':
        return '✕';
      default:
        return '○';
    }
  };

  const handleDisconnect = (orgId: string) => {
    setSelectedOrgId(orgId);
    setDisconnectDialogOpen(true);
  };

  const handleConfirmDisconnect = () => {
    if (selectedOrgId) {
      disconnectMutation.mutate(selectedOrgId);
    }
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
        <span className='font-semibold text-gray-900'>Salesforce</span>
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
                <SalesforceLogo />
              </div>
              <div>
                <Typography as='h1' variant='pageTitle' className='mb-1'>
                  Salesforce
                </Typography>
                <Typography variant='body' color='muted'>
                  Manage your connected Salesforce orgs
                </Typography>
              </div>
            </div>
          </div>

          <div className='flex gap-3'>
            <button
              type='button'
              className='inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50'
            >
              View Backup Jobs
            </button>
            <button
              onClick={() => navigate('/connections/salesforce/connect')}
              type='button'
              className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700'
            >
              <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                <path d='M10 4v12M4 10h12' strokeLinecap='round' />
              </svg>
              Connect New Org
            </button>
          </div>
        </div>
      </section>

      <div className='grid grid-cols-3 gap-6'>
        {/* Main Content */}
        <section className='col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm'>
          <div className='border-b border-gray-200 px-6 py-4'>
            <Typography as='h2' variant='sectionTitle'>
              All Salesforce Connections
            </Typography>
            <Typography variant='bodySm' color='muted' className='mt-1'>
              Manage and monitor all your connected Salesforce orgs. Each org backed up independently.
            </Typography>
          </div>

          <div className='px-6 py-6'>
            {isLoading ? (
              <div className='flex items-center justify-center py-12'>
                <div className='h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600' />
              </div>
            ) : salesforcePlatforms.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-center'>
                <p className='text-sm font-medium text-gray-500'>No Salesforce orgs connected yet</p>
                <p className='mt-1 text-xs text-gray-400'>Click "+ Connect New Org" to get started</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {salesforcePlatforms.map((org) => (
                  <div
                    key={org.crmId}
                    className='flex items-center justify-between rounded-lg border border-gray-200 px-4 py-4 hover:bg-gray-50'
                  >
                    <div className='flex items-center gap-4'>
                      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5 text-gray-400'>
                        <rect x='4' y='4' width='16' height='16' rx='2' />
                      </svg>
                      <div>
                        <p className='font-medium text-gray-900'>{org.name}</p>
                        <p className='text-xs text-gray-500'>{org.crmProfile.name}</p>
                        <p className='text-xs text-gray-500'>{org.crmProfile.email}</p>
                      </div>
                    </div>

                    <div className='flex items-center gap-3'>
                      <div className='text-right'>
                        <p className={`text-sm font-semibold ${org.isConnected ? getStatusColor(org.status) : 'text-gray-600'}`}>
                          <span className='mr-1'>{org.isConnected ? getStatusIcon(org.status) : '○'}</span>
                          {org.isConnected ? org.status.charAt(0) + org.status.slice(1).toLowerCase() : 'Disconnected'}
                        </p>
                        <p className='text-xs text-gray-500'>Connected on {formatDate(org.createdAt)}</p>
                      </div>

                      {/* Three-dot menu */}
                      <div className='relative' ref={menuRef}>
                        <button
                          type='button'
                          onClick={() => setOpenMenuId(openMenuId === org.crmId ? null : org.crmId)}
                          className='flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100'
                        >
                          <svg viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'>
                            <circle cx='12' cy='5' r='1.5' /><circle cx='12' cy='12' r='1.5' /><circle cx='12' cy='19' r='1.5' />
                          </svg>
                        </button>

                        {openMenuId === org.crmId && (
                          <div className='absolute right-0 top-9 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
                            <button
                              type='button'
                              onClick={() => { setOpenMenuId(null); navigate(`/connections/salesforce/edit/${org.crmId}`); }}
                              className='flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'
                            >
                              <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4 text-gray-500'>
                                <path d='M11.586 2.686l.828-.828a2 2 0 012.828 0l2.828 2.828a2 2 0 010 2.828l-.828.828m-2.83-2.83l-2.5 2.5a2 2 0 00-.5 1.06V9h1.06a2 2 0 001.06-.5l2.5-2.5m0-2.83l2.83 2.83M3 7v10a2 2 0 002 2h10a2 2 0 002-2V7' strokeLinecap='round' strokeLinejoin='round' />
                              </svg>
                              Edit
                            </button>

                            {org.isConnected ? (
                              <button
                                type='button'
                                onClick={() => { setOpenMenuId(null); handleDisconnect(org.crmId); }}
                                className='flex w-full items-center gap-2.5 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50'
                              >
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                                  <path d='M18.36 6.64A9 9 0 0 1 20 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 1.64-5.36' strokeLinecap='round' />
                                  <path d='M12 2v10' strokeLinecap='round' />
                                </svg>
                                Disconnect
                              </button>
                            ) : (
                              <button
                                type='button'
                                onClick={() => { setOpenMenuId(null); reconnectMutation.mutate({ crmId: org.crmId }); }}
                                className='flex w-full items-center gap-2.5 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50'
                              >
                                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                                  <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' strokeLinecap='round' strokeLinejoin='round' />
                                </svg>
                                Reconnect
                              </button>
                            )}

                            <div className='my-1 border-t border-gray-100' />

                            <button
                              type='button'
                              onClick={() => { setOpenMenuId(null); setSelectedOrgId(org.crmId); setDeleteDialogOpen(true); setDeleteError(null); }}
                              className='flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50'
                            >
                              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                                <polyline points='3 6 5 6 21 6' /><path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' /><path d='M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' strokeLinecap='round' />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
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
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50'>
                  <svg viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5 text-blue-600'>
                    <circle cx='12' cy='12' r='10' />
                  </svg>
                </div>
                <div>
                  <p className='text-2xl font-bold text-gray-900'>{salesforcePlatforms.length}</p>
                  <p className='text-xs text-gray-500'>Connect Orgs</p>
                </div>
              </div>

              <div className='border-t border-gray-100 pt-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-gray-600'>Total Objects</p>
                  <p className='font-semibold text-gray-900'>152</p>
                </div>
              </div>

              <div className='border-t border-gray-100 pt-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-gray-600'>Estimated Data Size</p>
                  <p className='font-semibold text-gray-900'>5.2 GB</p>
                </div>
              </div>

              <div className='border-t border-gray-100 pt-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm text-gray-600'>Backup Success Rate</p>
                  <p className='font-semibold text-gray-900'>0%</p>
                </div>
                <p className='mt-1 text-xs text-gray-400'>(No Backup Found)</p>
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
                  All Salesforce connection are encrypted and follow 2.0 authentication. We never store your credentials
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <WarningDialog
        isOpen={disconnectDialogOpen}
        title='Disconnect Salesforce Org?'
        message='Are you sure you want to disconnect this Salesforce org? This action cannot be undone.'
        confirmLabel='Disconnect'
        cancelLabel='Cancel'
        isLoading={disconnectMutation.isPending}
        error={disconnectError}
        onConfirm={handleConfirmDisconnect}
        onCancel={() => {
          setDisconnectDialogOpen(false);
          setSelectedOrgId(null);
          setDisconnectError(null);
        }}
      />

      <WarningDialog
        isOpen={deleteDialogOpen}
        title='Delete Salesforce Connection?'
        message='This will permanently delete the CRM connection. Make sure to remove all backup configurations linked to this org first.'
        confirmLabel='Delete'
        cancelLabel='Cancel'
        isLoading={deleteMutation.isPending}
        error={deleteError}
        onConfirm={() => { if (selectedOrgId) deleteMutation.mutate(selectedOrgId); }}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedOrgId(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
