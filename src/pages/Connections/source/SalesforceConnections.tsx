import { useState, useEffect, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Typography from '../../../components/Typography';
import WarningDialog from '../../../components/WarningDialog';
import PermissionGate from '../../../components/PermissionGate';
import { usePlatformService } from '../../../services/platform/platform.service';
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

export default function SalesforceConnections({ hideHeader }: { hideHeader?: boolean } = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const platformService = usePlatformService();
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

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


  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SALESFORCE_CONNECT_SUCCESS') {
        queryClient.invalidateQueries({ queryKey: ['platforms'] });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [queryClient]);

  const reconnectMutation = useMutation({
    mutationFn: ({ crmId, environment }: { crmId: string; environment?: string }) =>
      platformService.reconnectPlatform(crmId, {
        environment: environment as 'production' | 'sandbox' | 'custom' | undefined,
      }),
    onSuccess: (data: string | any) => {
      const rawUrl = typeof data === 'string' ? data : data?.redirectUrl;
      if (!rawUrl) return;

      const url = new URL(rawUrl);
      url.searchParams.set('prompt', 'login');

      const width = 500, height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        url.toString(),
        'SalesforceReconnect',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );
    },
  });

  const { data: allPlatforms, isLoading } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformService.getConnectedPlatforms(),
  });

  const salesforcePlatforms = (allPlatforms || []).filter(
    (platform) => platform.crmName.toLowerCase() === 'salesforce'
  );

  const handleDisconnect = (organizationId: string) => {
    setSelectedOrgId(organizationId);
    setDisconnectDialogOpen(true);
  };

  const handleConfirmDisconnect = () => {
    if (selectedOrgId) {
      disconnectMutation.mutate(selectedOrgId);
    }
  };

  const crms: { id: string; label: string; icon: ReactNode }[] = [
    {
      id: 'salesforce',
      label: 'Salesforce',
      icon: (
        <svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-5 w-auto'>
          <ellipse cx='24' cy='22' rx='13' ry='13' fill='#00A1E0' />
          <ellipse cx='38' cy='18' rx='11' ry='11' fill='#00A1E0' />
          <ellipse cx='48' cy='24' rx='9' ry='9' fill='#00A1E0' />
          <ellipse cx='14' cy='28' rx='8' ry='8' fill='#00A1E0' />
          <ellipse cx='32' cy='30' rx='16' ry='10' fill='#00A1E0' />
        </svg>
      ),
    },
    // {
    //   id: 'hubspot',
    //   label: 'HubSpot',
    //   icon: (
    //     <svg viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-5 w-5'>
    //       <circle cx='16' cy='16' r='16' fill='#FF7A59' />
    //       <path d='M13 10v5.5a3 3 0 000 5 3 3 0 000-5V10h-3zm6 7a3 3 0 100 6 3 3 0 000-6z' fill='white' />
    //     </svg>
    //   ),
    // },
    // {
    //   id: 'zoho',
    //   label: 'Zoho CRM',
    //   icon: (
    //     <svg viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-5 w-5'>
    //       <circle cx='16' cy='16' r='16' fill='#E42527' />
    //       <text x='16' y='21' fontSize='11' fontWeight='bold' fill='white' textAnchor='middle'>Z</text>
    //     </svg>
    //   ),
    // },
  ];

  const [selectedCrm, setSelectedCrm] = useState('salesforce');

  return (
    <div className='flex w-full min-w-0 flex-col gap-0 flex-1 min-h-0 overflow-hidden'>

      {/* Header */}
      {!hideHeader && <div className='flex-shrink-0 px-4 pt-4 sm:px-6 sm:pt-6'>
        <section className='rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <SalesforceLogo />
              <div>
                <Typography as='h1' variant='pageTitle' className='mb-0.5'>Salesforce</Typography>
                <Typography variant='body' color='muted'>Manage your connected Salesforce orgs</Typography>
              </div>
            </div>
            <button type='button' onClick={() => navigate('/backup-management')} className='inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50'>
              View Backup Jobs
            </button>
          </div>
        </section>
      </div>}

      {/* Two-panel layout — fills remaining height */}
      <div className='flex flex-1 min-h-0 gap-5 p-4 sm:p-6'>

        {/* CRM List */}
        <aside className='w-56 shrink-0 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden'>
          <div className='border-b border-gray-200 px-4 py-3'>
            <Typography as='h3' variant='sectionTitle'>CRM Platforms</Typography>
          </div>
          <div className='flex-1 overflow-y-auto p-2'>
            {crms.map((crm) => (
              <button
                key={crm.id}
                type='button'
                onClick={() => setSelectedCrm(crm.id)}
                className={[
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                  selectedCrm === crm.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                <span className='shrink-0'>{crm.icon}</span>
                <span className='text-sm font-semibold'>{crm.label}</span>
                {crm.id !== 'salesforce' && (
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
                {selectedCrm === 'salesforce' ? 'All Salesforce Connections' : selectedCrm === 'hubspot' ? 'HubSpot Connections' : 'Zoho CRM Connections'}
              </Typography>
              <Typography variant='bodySm' color='muted' className='mt-1'>
                {selectedCrm === 'salesforce' ? 'Manage and monitor all your connected Salesforce orgs. Each org backed up independently.' : 'Manage your connected orgs for this platform.'}
              </Typography>
            </div>
          </div>

          <div className='flex-1 overflow-y-auto px-6 py-6'>
            {selectedCrm !== 'salesforce' ? (
              <div className='flex h-full flex-col items-center justify-center py-16 text-center'>
                <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' className='h-7 w-7 text-amber-500'>
                    <path d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                </div>
                <p className='text-base font-semibold text-gray-800'>Coming Soon</p>
                <p className='mt-1 text-sm text-gray-500'>
                  {selectedCrm === 'hubspot' ? 'HubSpot' : 'Zoho CRM'} integration is currently under development.
                </p>
              </div>
            ) : isLoading ? (
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
                      <div className='flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center' style={{ background: 'rgba(0,161,224,0.1)' }}>
                        <svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-6 w-auto'>
                          <ellipse cx='24' cy='22' rx='13' ry='13' fill='#00A1E0' />
                          <ellipse cx='38' cy='18' rx='11' ry='11' fill='#00A1E0' />
                          <ellipse cx='48' cy='24' rx='9' ry='9' fill='#00A1E0' />
                          <ellipse cx='14' cy='28' rx='8' ry='8' fill='#00A1E0' />
                          <ellipse cx='32' cy='30' rx='16' ry='10' fill='#00A1E0' />
                        </svg>
                      </div>
                      <div>
                        <div className='flex items-center gap-2'>
                          <p className='font-medium text-gray-900'>{org.name ?? org.crmProfile?.username ?? org.contactEmail ?? org.crmId}</p>
                          {org.environment && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                              org.environment === 'production'
                                ? 'bg-green-50 text-green-700'
                                : org.environment === 'sandbox'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {org.environment}
                            </span>
                          )}
                        </div>
                        <p className='text-xs text-gray-500'>Org ID: {org.organizationId}</p>
                        {(org.firstName || org.lastName) && (
                          <p className='text-xs text-gray-500'>{[org.firstName, org.lastName].filter(Boolean).join(' ')}</p>
                        )}
                      </div>
                    </div>

                    <div className='flex items-center gap-3'>
                      <div className='text-right'>
                        <p className={`text-sm font-semibold ${org.isCrmConnected ? 'text-green-600' : 'text-gray-400'}`}>
                          <span className='mr-1'>{org.isCrmConnected ? '✓' : '○'}</span>
                          {org.isCrmConnected ? 'Active' : 'Inactive'}
                        </p>
                        <p className='text-xs text-gray-500'>Connected on {formatDate(org.createdAt)}</p>
                      </div>

                      {/* Inline action button */}
                      {org.isCrmConnected ? (
                        <PermissionGate permission='sourceConnection.write'>
                          <button
                            type='button'
                            onClick={() => handleDisconnect(org.userId)}
                            title='Deactivate'
                            className='rounded-lg p-2 text-orange-500 border border-orange-200 transition hover:bg-orange-50 hover:text-orange-600'
                          >
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                              <path d='M18.36 6.64A9 9 0 0 1 20 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 1.64-5.36' strokeLinecap='round' />
                              <path d='M12 2v10' strokeLinecap='round' />
                            </svg>
                          </button>
                        </PermissionGate>
                      ) : (
                        <PermissionGate permission='sourceConnection.write'>
                          <button
                            type='button'
                            onClick={() => reconnectMutation.mutate({ crmId: org.userId, environment: org.environment })}
                            title='Activate'
                            className='rounded-lg p-2 text-blue-500 border border-blue-200 transition hover:bg-blue-50 hover:text-blue-600'
                          >
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-4 w-4'>
                              <path d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
                          </button>
                        </PermissionGate>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>

      <WarningDialog
        isOpen={disconnectDialogOpen}
        title='Deactivate Salesforce Org?'
        message='Are you sure you want to deactivate this Salesforce org?'
        confirmLabel='Deactivate'
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

    </div>
  );
}

