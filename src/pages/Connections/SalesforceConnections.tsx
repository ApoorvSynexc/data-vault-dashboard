import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Typography from '../../components/Typography';
import WarningDialog from '../../components/WarningDialog';
import { usePlatformService, type ConnectedPlatform } from '../../services/platform/platform.service';

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
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const disconnectMutation = useMutation({
    mutationFn: (crmId: string) => platformService.disconnectPlatform(crmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setDisconnectDialogOpen(false);
      setSelectedOrgId(null);
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: (crmId: string) => platformService.reconnectPlatform(crmId),
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
                        <p className='font-medium text-gray-900'>{org.crmProfile.name}</p>
                        <p className='text-xs text-gray-500'>{org.crmProfile.instanceUrl}</p>
                      </div>
                    </div>

                    <div className='flex items-center gap-4'>
                      <div className='text-right'>
                        <p className={`text-sm font-semibold ${org.isConnected ? getStatusColor(org.status) : 'text-gray-600'}`}>
                          <span className='mr-1'>{org.isConnected ? getStatusIcon(org.status) : '○'}</span>
                          {org.isConnected ? org.status.charAt(0) + org.status.slice(1).toLowerCase() : 'Disconnected'}
                        </p>
                        <p className='text-xs text-gray-500'>Connected on {new Date(org.createdAt).toLocaleDateString()}</p>
                      </div>

                      {org.isConnected ? (
                        <button
                          type='button'
                          onClick={() => handleDisconnect(org.crmId)}
                          disabled={disconnectMutation.isPending}
                          className='inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      ) : (
                        <button
                          type='button'
                          onClick={() => reconnectMutation.mutate(org.crmId)}
                          disabled={reconnectMutation.isPending}
                          className='inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          {reconnectMutation.isPending ? 'Reconnecting...' : 'Reconnect'}
                        </button>
                      )}
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
        onConfirm={handleConfirmDisconnect}
        onCancel={() => {
          setDisconnectDialogOpen(false);
          setSelectedOrgId(null);
        }}
      />
    </div>
  );
}
