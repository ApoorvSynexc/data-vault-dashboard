import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';

type ScheduleConfig = {
  timeZone: string;
  type: string;
  scheduling: {
    frequency: string;
    interval: number;
    weekDays?: string[];
    monthDate?: number;
    selectedMonths?: string[];
    startDate?: string;
    endDate?: string;
    startTime?: string;
  };
};

type FinalStepProps = {
  onBack: () => void;
  strategy?: 'realtime' | 'scheduled';
  crmId?: string | null;
  selectedObjectIds?: string[];
  policyName?: string;
  description?: string;
  environment?: string;
  scheduleConfig?: ScheduleConfig | null;
  destinationId?: string | null;
};

export default function FinalStep({
  onBack,
  strategy = 'realtime',
  crmId,
  selectedObjectIds = [],
  policyName = 'Salesforce Production Backup',
  description = '',
  environment = 'Production',
  scheduleConfig = null,
  destinationId = null,
}: FinalStepProps) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();
  const queryClient = useQueryClient();
  const isRealTime = strategy === 'realtime';
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['source', 'strategy', 'policy']));
  const [isSuccess, setIsSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'save' | 'run'>('run');
  const [isLoading, setIsLoading] = useState(false);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  const createBackupMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await backupConfigService.createBackupConfig(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-config-list'] });
      setSuccessType('run');
      setIsSuccess(true);
    },
    onError: (error) => {
      console.error('Failed to create backup:', error);
      alert('Failed to create backup. Please try again.');
    },
  });

  const createBackupWithStatus = (backupStatus: 'DRAFT' | 'ACTIVE') => {
    if (!crmId) {
      alert('Please select a platform');
      return;
    }

    if (!destinationId) {
      alert('Please select a destination');
      return;
    }

    setIsLoading(true);
    const payload: any = {
      crmId,
      name: policyName,
      description,
      environment: environment.toUpperCase(),
      destinationId,
      objectNames: selectedObjectIds,
      schedule: isRealTime ? 'REALTIME' : 'SCHEDULE',
      objects: selectedObjectIds.map((id) => ({
        name: id,
        condition: { type: 'AND' },
        field: [],
      })),
      backupStatus,
    };

    if (!isRealTime && scheduleConfig) {
      payload.scheduleConfig = scheduleConfig;
    }

    createBackupMutation.mutate(payload);
  };

  const handleSaveDraft = () => {
    setSuccessType('save');
    createBackupWithStatus('DRAFT');
  };

  const handleRunBackup = async () => {
    setSuccessType('run');
    createBackupWithStatus('ACTIVE');
  };

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/backup-management');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  const SectionBox = ({
    title,
    sectionKey,
    children
  }: {
    title: string;
    sectionKey: string;
    children: React.ReactNode
  }) => (
    <div className='bg-white rounded-lg border border-gray-200'>
      <button
        onClick={() => toggleSection(sectionKey)}
        className='w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors'
      >
        <div className='flex items-center gap-4'>
          <svg
            className={`w-5 h-5 text-gray-600 transform transition-transform ${isExpanded(sectionKey) ? 'rotate-90' : ''}`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
          <h2 className='text-base font-semibold text-gray-900'>{title}</h2>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className='px-4 py-2 text-blue-600 font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          Edit
        </button>
      </button>
      {isExpanded(sectionKey) && (
        <div className='px-6 pb-6 bg-gray-50 border-t border-gray-200'>
          {children}
        </div>
      )}
    </div>
  );

  if (isSuccess) {
    return (
      <div className='h-screen bg-gray-50 flex flex-col items-center justify-center'>
        <div className='text-center'>
          {/* Success Icon with Animation */}
          <div className='relative mb-6'>
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='w-24 h-24 bg-green-100 rounded-full animate-pulse'></div>
            </div>
            <div className='relative w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center'>
              <svg className='w-12 h-12 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
              </svg>
            </div>
          </div>

          <h1 className='text-3xl font-bold text-green-600 mb-2'>
            {successType === 'save'
              ? 'Draft Saved Successfully'
              : isRealTime
              ? 'Backup Completed Successfully'
              : 'Backup Scheduled Successfully'}
          </h1>
          <p className='text-gray-600'>Redirecting to backup page in 2s</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-screen bg-gray-50 p-8 flex flex-col overflow-hidden'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between mb-8 flex-shrink-0'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Review & Create</h1>
          <p className='text-gray-600 mt-2'>Review your backup policy configuration before initiating backup.</p>
        </div>
        <span className='text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap'>
          Final Step
        </span>
      </div>

      {/* Main Content */}
      <div className='flex-grow overflow-y-auto min-h-0 space-y-4'>
        {/* Source & Destination Section */}
        <SectionBox title='Source & Destination' sectionKey='source'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Source Platform</p>
              <p className='font-medium text-gray-900'>Salesforce</p>
            </div>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Destination Platform</p>
              <p className='font-medium text-gray-900'>AWS</p>
            </div>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Salesforce Connection</p>
              <p className='font-medium text-gray-900'>Salesforce Production</p>
            </div>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>AWS Connection</p>
              <p className='font-medium text-gray-900'>AWS S3 Bucket</p>
            </div>
          </div>
        </SectionBox>

        {/* Backup Strategy Section */}
        <SectionBox title='Backup Strategy' sectionKey='strategy'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Strategy Type</p>
              <p className='font-medium text-gray-900'>{isRealTime ? 'Real-Time Sync' : 'Scheduled'}</p>
            </div>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Data Modules</p>
              <p className='font-medium text-gray-900'>Custom Selection</p>
            </div>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Objects Selected</p>
              <p className='font-medium text-gray-900'>{selectedObjectIds.length}</p>
            </div>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Environment</p>
              <p className='font-medium text-gray-900'>{environment}</p>
            </div>
          </div>
        </SectionBox>

        {/* Define Backup Policy Section */}
        <SectionBox title='Define Backup Policy' sectionKey='policy'>
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Policy Name</p>
              <p className='font-medium text-gray-900'>{policyName}</p>
            </div>
            <div className='bg-gray-100 rounded-lg p-4'>
              <p className='text-sm text-gray-600 mb-1'>Description</p>
              <p className='font-medium text-gray-900'>{description || 'No description provided'}</p>
            </div>
          </div>
        </SectionBox>

        {/* Backup Schedule Section - Only for Scheduled Strategy */}
        {!isRealTime && scheduleConfig && (
          <SectionBox title='Backup Schedule' sectionKey='schedule'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='bg-gray-100 rounded-lg p-4'>
                <p className='text-sm text-gray-600 mb-1'>Frequency</p>
                <p className='font-medium text-gray-900'>{scheduleConfig.scheduling.frequency}</p>
              </div>
              <div className='bg-gray-100 rounded-lg p-4'>
                <p className='text-sm text-gray-600 mb-1'>Time Zone</p>
                <p className='font-medium text-gray-900'>{scheduleConfig.timeZone}</p>
              </div>
              {scheduleConfig.scheduling.startDate && (
                <div className='bg-gray-100 rounded-lg p-4'>
                  <p className='text-sm text-gray-600 mb-1'>Start Date</p>
                  <p className='font-medium text-gray-900'>{scheduleConfig.scheduling.startDate}</p>
                </div>
              )}
              {scheduleConfig.scheduling.endDate && (
                <div className='bg-gray-100 rounded-lg p-4'>
                  <p className='text-sm text-gray-600 mb-1'>End Date</p>
                  <p className='font-medium text-gray-900'>{scheduleConfig.scheduling.endDate}</p>
                </div>
              )}
              {scheduleConfig.scheduling.startTime && (
                <div className='bg-gray-100 rounded-lg p-4'>
                  <p className='text-sm text-gray-600 mb-1'>Starting Time</p>
                  <p className='font-medium text-gray-900'>{scheduleConfig.scheduling.startTime}</p>
                </div>
              )}
              {scheduleConfig.scheduling.weekDays && (
                <div className='bg-gray-100 rounded-lg p-4'>
                  <p className='text-sm text-gray-600 mb-1'>Days</p>
                  <p className='font-medium text-gray-900'>{scheduleConfig.scheduling.weekDays.join(', ')}</p>
                </div>
              )}
              {scheduleConfig.scheduling.monthDate && (
                <div className='bg-gray-100 rounded-lg p-4'>
                  <p className='text-sm text-gray-600 mb-1'>Day of Month</p>
                  <p className='font-medium text-gray-900'>{scheduleConfig.scheduling.monthDate}</p>
                </div>
              )}
              {scheduleConfig.scheduling.selectedMonths && (
                <div className='bg-gray-100 rounded-lg p-4'>
                  <p className='text-sm text-gray-600 mb-1'>Months</p>
                  <p className='font-medium text-gray-900'>{scheduleConfig.scheduling.selectedMonths.join(', ')}</p>
                </div>
              )}
            </div>
          </SectionBox>
        )}
      </div>

      {/* Action Buttons */}
      <div className='flex justify-between gap-4 flex-shrink-0 mt-8'>
        <button
          onClick={() => navigate('/backup-management')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-4'>
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isLoading || createBackupMutation.isPending}
            className='px-6 py-2 text-blue-600 font-medium border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading || createBackupMutation.isPending ? 'Saving...' : 'Save Backup Policy'}
          </button>
          <button
            onClick={handleRunBackup}
            disabled={isLoading || createBackupMutation.isPending}
            className='px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isLoading || createBackupMutation.isPending ? 'Creating...' : 'Run Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
