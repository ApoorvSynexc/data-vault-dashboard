import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Overview from './Overview';
import BackupHistory from './BackupHistory';
import TriggerRecords from './TriggerRecords';
// import ObjectsNData from './ObjectsNData'; // commented out
import { useBackupConfigService } from '../../../services/backup-config/backup-config.service';
import { capitalize } from '../../../utils';
import salesforceLogo from '../../../assets/icons/salesforce_logo.svg';

type TabType = 'overview' | 'history' | 'triggers' | 'objects';

// Mock data
const mockBackupData = {
  backupConfigId: '1',
  name: 'Salesforce Production Backup',
  crmName: 'Salesforce',
  environment: 'Production',
  backupStatus: undefined,
  schedule: 'SCHEDULE',
  description: 'Daily backup of Salesforce production environment',
  lastBackupAt: new Date().toISOString(),
  sizeInBytes: 146300000000,
  scheduleConfig: {
    scheduling: {
      frequency: 'DAILY',
    },
  },
};

export default function BackupDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const backupConfigService = useBackupConfigService();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isFetching: isProcessingBackup, refetch: refetchProcessBackup } = useQuery({
    queryKey: ['process-backup', slug],
    queryFn: () => backupConfigService.processBackup(slug!),
    enabled: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isFetching: isSyncingSchema, refetch: refetchSyncSchema } = useQuery({
    queryKey: ['sync-schema', slug],
    queryFn: () => backupConfigService.syncSchema(slug!),
    enabled: false,
  });

  const { data: backupDetail } = useQuery({
    queryKey: ['backup-detail', slug],
    queryFn: async () => {
      if (!slug) return null;
      const response = await backupConfigService.getBackupConfig(slug);
      return (response as any)?.data || null;
    },
    enabled: !!slug,
  });

  const backupData = (backupDetail as any) || mockBackupData;

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className='h-full bg-gray-50 flex flex-col overflow-hidden'>
      {/* Header - Fixed */}
      <div className='flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 pt-3 pb-0'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-4'>
            <button
              onClick={() => navigate(-1)}
              className='flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50'
            >
              <svg className='w-5 h-5 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
            <div>
              <div className='flex items-center gap-2'>
                {(backupData?.crmDetail?.crmName || backupData?.crmName || '').toLowerCase() === 'salesforce' ? (
                  <img src={salesforceLogo} alt='Salesforce' className='h-8 w-auto' />
                ) : (
                  <div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center'>
                    <span className='text-xs font-bold text-blue-600'>{(backupData?.crmDetail?.crmName || backupData?.crmName || 'SF')?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <h1 className='text-2xl font-bold text-gray-900'>{backupData?.name || 'Backup'}</h1>
                {(() => {
                  const status = backupData?.status;
                  if (!status) return null;
                  const isDraft = status === 'DRAFT';
                  const isActive = status === 'ACTIVE';
                  const bg = isDraft ? 'bg-yellow-100' : isActive ? 'bg-green-100' : 'bg-gray-100';
                  const text = isDraft ? 'text-yellow-700' : isActive ? 'text-green-700' : 'text-gray-600';
                  return (
                    <span className={`px-2 py-1 ${bg} ${text} text-xs font-semibold rounded-full`}>
                      {isActive ? '✓ ' : ''}{status}
                    </span>
                  );
                })()}
              </div>
              <p className='text-sm text-gray-600 mt-1'>
                {backupData?.crmDetail?.crmName || backupData?.crmName}
                {(backupData?.crmDetail?.environment || backupData?.environment) ? ` • ${capitalize(backupData.crmDetail?.environment || backupData.environment)}` : ''}
                {' '}• Backup ID: {slug}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => refetchSyncSchema()}
              disabled={isSyncingSchema}
              className='inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {isSyncingSchema ? (
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='animate-spin'>
                  <path d='M21 12a9 9 0 11-6.219-8.56' />
                </svg>
              ) : (
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <polyline points='23 4 23 10 17 10' /><polyline points='1 20 1 14 7 14' />
                  <path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' />
                </svg>
              )}
              {isSyncingSchema ? 'Syncing...' : 'Sync Schema'}
            </button>
            <button
              type='button'
              onClick={() => refetchProcessBackup()}
              disabled={isProcessingBackup}
              className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {isProcessingBackup ? (
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='animate-spin'>
                  <path d='M21 12a9 9 0 11-6.219-8.56' />
                </svg>
              ) : (
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <circle cx='12' cy='12' r='3' /><path d='M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83' />
                </svg>
              )}
              {isProcessingBackup ? 'Processing...' : 'Process Backup'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className='flex'>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Backup History
          </button>
          {backupData?.triggerResults?.length > 0 && (
            <button
              onClick={() => setActiveTab('triggers')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'triggers'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Trigger Records
              <span className='ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full'>
                {backupData.triggerResults.length}
              </span>
            </button>
          )}
          {/* Objects & Data tab - commented out */}
          {/* <button
            onClick={() => setActiveTab('objects')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'objects'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Objects & Data
          </button> */}
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className='flex-grow overflow-y-auto min-h-0 bg-gray-50 p-4'>
        {activeTab === 'overview' && <Overview backup={backupData} onViewTriggers={() => setActiveTab('triggers')} />}
        {activeTab === 'history' && <BackupHistory backup={backupData} />}
        {activeTab === 'triggers' && <TriggerRecords backup={backupData} />}
        {/* Objects & Data tab - commented out */}
        {/* {activeTab === 'objects' && <ObjectsNData backup={backupData} />} */}
      </div>
    </div>
  );
}
