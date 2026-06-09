import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { usePlatformService } from '../../../../services/platform/platform.service';
import { useDestinationService } from '../../../../services/destination/destination.service';

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

type SelectedObject = {
  id: string;
  type: 'STANDARD' | 'CUSTOM';
};

type FinalStepProps = {
  onBack: () => void;
  onEditStep: (step: number) => void;
  strategy?: 'realtime' | 'scheduled';
  crmId?: string | null;
  selectedObjects?: SelectedObject[];
  selectedObjectIds?: string[];
  policyName?: string;
  description?: string;
  environment?: string;
  scheduleConfig?: ScheduleConfig | null;
  destinationId?: string | null;
  editConfigId?: string | null;
  editConfigStatus?: string | null;
};


export default function FinalStep({
  onBack,
  onEditStep,
  strategy = 'realtime',
  crmId,
  selectedObjects = [],
  selectedObjectIds = [],
  policyName = 'Salesforce Production Backup',
  description = '',
  environment = 'Production',
  scheduleConfig = null,
  destinationId = null,
  editConfigId = null,
  editConfigStatus = null,
}: FinalStepProps) {
  const isDraft = !editConfigId || editConfigStatus?.toUpperCase() === 'DRAFT';
  const isNonDraftEdit = !!editConfigId && !isDraft;
  const isScheduledNonDraft = isNonDraftEdit && strategy === 'scheduled';
  const isRealtimeNonDraft = isNonDraftEdit && strategy === 'realtime';
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();
  const platformService = usePlatformService();
  const destinationService = useDestinationService();
  const queryClient = useQueryClient();
  const isRealTime = strategy === 'realtime';

  const { data: platforms } = useQuery({
    queryKey: ['connected-platforms'],
    queryFn: () => platformService.getConnectedPlatforms(),
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['source', 'strategy', 'policy', 'schedule']));
  const [isSuccess, setIsSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'save' | 'run'>('run');
  const [isLoading, setIsLoading] = useState(false);
  const [showRunConfirmation, setShowRunConfirmation] = useState(false);
  const [acceptanceText, setAcceptanceText] = useState('');
  const [acceptanceError, setAcceptanceError] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const activeCrm = platforms?.find((p) => p.crmId === crmId);
  const { data: activeDestinationDetail } = useQuery({
    queryKey: ['destination', destinationId],
    queryFn: () => destinationService.getDestination(destinationId!),
    enabled: !!destinationId,
  });

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) newExpanded.delete(section);
    else newExpanded.add(section);
    setExpandedSections(newExpanded);
  };
  const isExpanded = (section: string) => expandedSections.has(section);

  const onMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['backup-config-list'] });
    setIsLoading(false);
    setIsSuccess(true);
  };

  const onMutationError = (error: any) => {
    setIsLoading(false);
    setApiError(error?.message || 'Failed to save backup. Please try again.');
  };

  const createBackupMutation = useMutation({
    mutationFn: async (payload: any) => backupConfigService.createBackupConfig(payload),
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  });

  const updateBackupMutation = useMutation({
    mutationFn: async (payload: any) => backupConfigService.updateBackupConfig(editConfigId!, payload),
    onSuccess: onMutationSuccess,
    onError: onMutationError,
  });

  const createBackupWithStatus = (backupStatus: 'DRAFT' | 'ACTIVE') => {
    if (!crmId) { alert('Please select a platform'); return; }
    if (!destinationId) { alert('Please select a destination'); return; }
    setIsLoading(true);
    setApiError(null);
    const objectsToUse = selectedObjects.length > 0 ? selectedObjects : selectedObjectIds.map((id) => ({ id, type: 'STANDARD' as const }));
    const objectIds = objectsToUse.map((obj) => typeof obj === 'string' ? obj : obj.id);
    const payload: any = {
      crmId, name: policyName, description, destinationId,
      objectNames: objectIds,
      schedule: strategy === 'realtime' ? 'REALTIME' : 'SCHEDULE',
      objects: objectsToUse.map((obj) => {
        const objId = typeof obj === 'string' ? obj : obj.id;
        const objType = typeof obj === 'string' ? 'STANDARD' : obj.type;
        return { name: objId, type: objType, condition: { type: 'AND' }, field: [] };
      }),
      status: backupStatus,
    };
    if (!isRealTime && scheduleConfig) payload.scheduleConfig = scheduleConfig;
    if (editConfigId) {
      updateBackupMutation.mutate(payload);
    } else {
      createBackupMutation.mutate(payload);
    }
  };

  const handleSaveDraft = () => { setSuccessType('save'); createBackupWithStatus('DRAFT'); };
  const handleRunBackup = () => { setAcceptanceText(''); setAcceptanceError(false); setShowRunConfirmation(true); };
  const handleConfirmRun = () => {
    if (isRealTime && acceptanceText.toLowerCase() !== 'accept') { setAcceptanceError(true); return; }
    setShowRunConfirmation(false);
    setSuccessType('run');
    createBackupWithStatus('ACTIVE');
  };

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => navigate('/backup-management'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

const SectionBox = ({ title, sectionKey, onEdit, children }: { title: string; sectionKey: string; onEdit?: () => void; children: React.ReactNode }) => (
    <div className='bg-white rounded-lg border border-gray-200'>
      <button onClick={() => toggleSection(sectionKey)} className='w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors'>
        <div className='flex items-center gap-3'>
          <svg className={`w-5 h-5 text-gray-600 transform transition-transform ${isExpanded(sectionKey) ? 'rotate-90' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
          </svg>
          <h2 className='text-sm font-semibold text-gray-900'>{title}</h2>
        </div>
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className='px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'>
            Edit
          </button>
        )}
      </button>
      {isExpanded(sectionKey) && <div className='px-4 py-3 bg-gray-50 border-t border-gray-200'>{children}</div>}
    </div>
  );

  if (isSuccess) {
    return (
      <div className='h-full bg-gray-50 flex flex-col items-center justify-center'>
        <div className='text-center'>
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
            {successType === 'save' ? 'Draft Saved Successfully' : isRealTime ? 'Backup Completed Successfully' : 'Backup Scheduled Successfully'}
          </h1>
          <p className='text-gray-600'>Redirecting to backup page in 2s</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-full bg-gray-50 p-6 flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='flex items-start justify-between mb-6 flex-shrink-0'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>{editConfigId ? 'Review & Edit' : 'Review & Create'}</h1>
          <p className='text-gray-600 mt-2'>
            {isRealtimeNonDraft
              ? 'You can only edit the backup policy name.'
              : isScheduledNonDraft
              ? 'You can edit the backup policy name and schedule configuration.'
              : 'Review your backup policy configuration before initiating backup.'}
          </p>
        </div>
        <span className='text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full whitespace-nowrap'>
          {isRealtimeNonDraft ? 'Edit Policy' : isScheduledNonDraft ? 'Edit Schedule' : editConfigId ? 'Edit Draft' : 'Final Step'}
        </span>
      </div>

      {/* Sections */}
      <div className='flex-grow overflow-y-auto min-h-0 space-y-3'>
        <SectionBox title='Source & Destination' sectionKey='source' onEdit={isDraft ? () => onEditStep(1) : undefined}>
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Source Platform</p><p className='text-sm font-medium text-gray-900'>{activeCrm ? activeCrm.crmName.charAt(0).toUpperCase() + activeCrm.crmName.slice(1) : 'Salesforce'}</p></div>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Destination Platform</p><p className='text-sm font-medium text-gray-900'>{activeDestinationDetail?.provider ?? '--'}</p></div>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>{activeCrm ? activeCrm.crmName.charAt(0).toUpperCase() + activeCrm.crmName.slice(1) + ' Connection' : 'Source Connection'}</p><p className='text-sm font-medium text-gray-900'>{activeCrm?.name ?? '--'}</p></div>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>{activeDestinationDetail?.provider ? activeDestinationDetail.provider + ' Connection' : 'Destination Connection'}</p><p className='text-sm font-medium text-gray-900'>{activeDestinationDetail?.name ?? '--'}</p></div>
          </div>
        </SectionBox>

        <SectionBox title='Backup Strategy' sectionKey='strategy' onEdit={isDraft ? () => onEditStep(4) : undefined}>
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Strategy Type</p><p className='text-sm font-medium text-gray-900'>{strategy === 'realtime' ? 'Real-Time Sync' : 'Scheduled'}</p></div>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Data Modules</p><p className='text-sm font-medium text-gray-900'>Custom Selection</p></div>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Objects Selected</p><p className='text-sm font-medium text-gray-900'>{selectedObjects.length > 0 ? selectedObjects.length : selectedObjectIds.length}</p></div>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Environment</p><p className='text-sm font-medium text-gray-900'>{environment}</p></div>
          </div>
        </SectionBox>

        <SectionBox title='Define Backup Policy' sectionKey='policy' onEdit={() => onEditStep(3)}>
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Policy Name</p><p className='text-sm font-medium text-gray-900'>{policyName}</p></div>
            <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Description</p><p className='text-sm font-medium text-gray-900'>{description || 'No description provided'}</p></div>
          </div>
        </SectionBox>

        {!isRealTime && scheduleConfig && (
          <SectionBox title='Backup Schedule' sectionKey='schedule' onEdit={() => onEditStep(6)}>
            <div className='grid grid-cols-2 gap-3'>
              <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Frequency</p><p className='text-sm font-medium text-gray-900'>{scheduleConfig.scheduling.frequency}</p></div>
              <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Time Zone</p><p className='text-sm font-medium text-gray-900'>{scheduleConfig.timeZone}</p></div>
              {scheduleConfig.scheduling.startDate && <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Start Date</p><p className='text-sm font-medium text-gray-900'>{scheduleConfig.scheduling.startDate}</p></div>}
              {scheduleConfig.scheduling.endDate && <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>End Date</p><p className='text-sm font-medium text-gray-900'>{scheduleConfig.scheduling.endDate}</p></div>}
              {scheduleConfig.scheduling.startTime && <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Starting Time</p><p className='text-sm font-medium text-gray-900'>{scheduleConfig.scheduling.startTime}</p></div>}
              {scheduleConfig.scheduling.weekDays && <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Days</p><p className='text-sm font-medium text-gray-900'>{scheduleConfig.scheduling.weekDays.join(', ')}</p></div>}
              {scheduleConfig.scheduling.monthDate && <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Day of Month</p><p className='text-sm font-medium text-gray-900'>{scheduleConfig.scheduling.monthDate}</p></div>}
              {scheduleConfig.scheduling.selectedMonths && <div className='bg-gray-100 rounded-lg p-3'><p className='text-xs text-gray-600 mb-1'>Months</p><p className='text-sm font-medium text-gray-900'>{scheduleConfig.scheduling.selectedMonths.join(', ')}</p></div>}
            </div>
          </SectionBox>
        )}
      </div>

      {apiError && (
        <div className='flex-shrink-0 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3'>
          <svg className='w-4 h-4 text-red-500 mt-0.5 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2'><circle cx='12' cy='12' r='10'/><path d='M12 8v4M12 16h.01' strokeLinecap='round'/></svg>
          <p className='text-sm text-red-600'>{apiError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className='flex justify-between gap-4 flex-shrink-0 mt-4'>
        <button onClick={() => navigate('/backup-management')} className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>Cancel</button>
        <div className='flex gap-4'>
          {!editConfigId && <button onClick={onBack} className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>← Back</button>}
          <button onClick={handleSaveDraft} disabled={isLoading || createBackupMutation.isPending || updateBackupMutation.isPending} className='px-6 py-2 text-blue-600 font-medium border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
            {isLoading || createBackupMutation.isPending || updateBackupMutation.isPending ? 'Saving...' : 'Save Backup Policy'}
          </button>
          <button onClick={handleRunBackup} disabled={isLoading || createBackupMutation.isPending || updateBackupMutation.isPending} className='px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'>
            {isLoading || createBackupMutation.isPending || updateBackupMutation.isPending ? 'Creating...' : 'Run Backup'}
          </button>
        </div>
      </div>

      {/* ── Run Backup Confirmation Dialog ── */}
      {showRunConfirmation && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <h2 className='text-lg font-bold text-gray-900 mb-1'>Confirm Backup Creation</h2>
              {!isRealTime && <p className='text-sm text-gray-600'>Are you sure you want to create and run this scheduled backup with the configured settings?</p>}
              {isRealTime && (
                <>
                  <p className='text-sm text-gray-500 mb-4'>DataVault uses Salesforce Apex Triggers to capture record changes instantly and sync them to your backup destination in real time.</p>
                  <p className='text-sm font-semibold text-gray-800 mb-3'>What will happen after you save this backup configuration:</p>
                  <ul className='text-sm text-gray-700 space-y-3 mb-4'>
                    <li className='flex gap-2'><span className='mt-0.5 shrink-0 text-blue-600'>•</span><span>An <span className='font-semibold'>Apex Trigger</span> will be created on each object you selected to listen for <span className='font-semibold'>insert, update, delete,</span> and <span className='font-semibold'>undelete</span> events.</span></li>
                    <li className='flex gap-2'><span className='mt-0.5 shrink-0 text-blue-600'>•</span><span>A Permission Set named <span className='font-semibold'>DataVaultRealTimeTriggerAccess</span> will be created in your Salesforce org and granted access to the DataVault handler class and the triggers above.</span></li>
                    <li className='flex gap-2'><span className='mt-0.5 shrink-0 text-blue-600'>•</span><span><span className='font-semibold'>Action required:</span> Assign the <span className='font-semibold'>DataVaultRealTimeTriggerAccess</span> Permission Set to all users who create, update, or delete records on the selected objects.</span></li>
                    <li className='flex gap-2'><span className='mt-0.5 shrink-0 text-blue-600'>•</span><span><span className='font-semibold'>Already using Real-Time Backup?</span> No duplicate triggers or permission sets will be created. DataVault will only create triggers for newly added objects.</span></li>
                  </ul>
                  <div className='bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded-r-lg'>
                    <p className='text-sm text-yellow-800'>By saving this configuration, you acknowledge that DataVault will deploy <span className='font-semibold'>Apex Triggers</span> and a <span className='font-semibold'>Permission Set</span> to your connected Salesforce org as described above.</p>
                  </div>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-1'>Confirm to proceed</label>
                    <p className='text-sm text-gray-600 mb-2'>Type <span className='font-semibold'>Accept</span> to acknowledge and run your Real-Time Backup.</p>
                    <input type='text' value={acceptanceText} onChange={(e) => { setAcceptanceText(e.target.value); if (acceptanceError && e.target.value.toLowerCase() === 'accept') setAcceptanceError(false); }} placeholder='Type Accept here'
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${acceptanceError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`} />
                    {acceptanceError && <p className='text-sm text-red-600 mt-1'>Please type "Accept" to proceed</p>}
                  </div>
                </>
              )}
            </div>
            <div className='flex justify-end gap-3 px-6 pb-6'>
              <button onClick={() => setShowRunConfirmation(false)} className='px-5 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>Cancel</button>
              <button onClick={handleConfirmRun} disabled={isLoading || createBackupMutation.isPending || updateBackupMutation.isPending} className='px-5 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
                {isLoading || createBackupMutation.isPending || updateBackupMutation.isPending ? 'Saving...' : editConfigId ? 'Yes, Update Backup' : 'Yes, Create Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
