import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { SelectedArchiveObject } from '../SelectObjects';
import type { ArchiveScheduleConfig } from '../Schedule';
import type { DryRunSummary } from '../DryRun';
import { useArchivalService } from '../../../../services/archival/archival.service';
import ProgressBar from '../ProgressBar';

interface Step5Props {
  archivalPayload?: Record<string, unknown> | null;
  dryRunSummary?: DryRunSummary | null;
  crmName?: string;
  crmConnectionName?: string;
  destinationProvider?: string;
  destinationName?: string;
  policyName?: string;
  description?: string;
  selectedObjects?: SelectedArchiveObject[];
  scheduleConfig?: ArchiveScheduleConfig | null;
  onBack: () => void;
  onEditStep: (step: number) => void;
  // Edit mode — when set, calls updateConfig (PUT) instead of applyConfig (POST)
  editMode?: boolean;
  backupConfigId?: string;
}


const freqLabel: Record<string, string> = {
  ONCE: 'One Time', HOURLY: 'Hourly', DAILY: 'Daily',
  WEEKLY: 'Weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

export default function Step5({
  archivalPayload = null,
  dryRunSummary = null,
  crmName = 'Salesforce Production',
  destinationProvider = 'AWS S3',
  destinationName = 'Hot tier, Standard-hot-tier bucket',
  policyName = 'Accounts-Contact-Opportunity Archive — May 14, 2026',
  selectedObjects = [],
  scheduleConfig = null,
  onBack,
  onEditStep,
  editMode = false,
  backupConfigId = '',
}: Step5Props) {
  const navigate = useNavigate();
  const archivalService = useArchivalService();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
const [confirmError, setConfirmError] = useState(false);

  // Dummy data fallbacks
  const dummyObjects = selectedObjects.length > 0 ? selectedObjects : [
    { id: 'Account', type: 'STANDARD' as const, archivalPayload: { name: 'Account', condition: { type: 'AND' as const }, field: [{ name: 'Name', filter: { value: 'Accenture', operator: '=' } }, { name: 'Name', filter: { value: 'Accenture', operator: '=' } }] } },
    { id: 'Contact', type: 'STANDARD' as const, archivalPayload: { name: 'Contact', condition: { type: 'AND' as const }, field: [{ name: 'CreatedDate', filter: { value: '2020-03-20', operator: '<' } }] } },
    { id: 'Opportunity', type: 'CUSTOM' as const, archivalPayload: { name: 'Opportunity', condition: { type: 'AND' as const }, field: [{ name: 'Status', filter: { value: 'Closed', operator: '=' } }] } },
  ];

  const totalRecords = dryRunSummary?.totalRecords ?? null;
  const totalDataSize = dryRunSummary?.totalDataSize ?? null;
  const objectNames = dummyObjects.map((o) => o.id).join(', ');
  const totalFilters = dummyObjects.reduce((sum, o) => {
    const p = (o as any).archivalPayload;
    if (p?.condition?.type === 'SOQL') return sum + 1;
    return sum + (p?.field?.length ?? 0);
  }, 0);

  const schedFreq = scheduleConfig
    ? (freqLabel[scheduleConfig.scheduling.frequency] ?? scheduleConfig.scheduling.frequency)
    : 'Daily';
  const schedStartDate = scheduleConfig?.scheduling.startDate;
  const schedStartTime = scheduleConfig?.scheduling.startTime;
  const isRunNow = scheduleConfig?.scheduling.frequency === 'ONCE' && !schedStartDate && !schedStartTime;
  const scheduleDisplay = isRunNow
    ? 'One Time (Archive Now)'
    : schedStartTime && schedStartDate
      ? `${schedFreq} at ${schedStartTime}, Starts from ${schedStartDate}`
      : schedStartTime
        ? `${schedFreq} at ${schedStartTime}`
        : schedFreq;

  const fireApi = async (backupStatus: 'DRAFT' | 'ACTIVE') => {
    if (editMode && backupConfigId) {
      await archivalService.updateConfig(backupConfigId, { ...archivalPayload, backupStatus } as any);
    } else {
      await archivalService.applyConfig({ ...archivalPayload, status: backupStatus } as any);
    }
  };

  const handleRunArchive = () => { setApiError(null); setConfirmText(''); setConfirmError(false); setShowConfirm(true); };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      await fireApi('ACTIVE');
      setIsSuccess(true);
    } catch (err: any) {
      setApiError(err?.message ?? 'Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      await fireApi('DRAFT');
      queryClient.invalidateQueries({ queryKey: ['archival-config-list'] });
      navigate('/archive-vault');
    } catch (err: any) {
      setApiError(err?.message ?? 'Failed to save draft. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRun = async () => {
    if (confirmText.toUpperCase() !== 'ARCHIVE') { setConfirmError(true); return; }
    setShowConfirm(false);
    setIsLoading(true);
    setApiError(null);
    try {
      await fireApi('ACTIVE');
      queryClient.invalidateQueries({ queryKey: ['archival-config-list'] });
      setIsSuccess(true);
    } catch (err: any) {
      setApiError(err?.message ?? 'Failed to start archive. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => navigate('/archive-vault'), 2500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, navigate]);

  // ── Success screen ──
  if (isSuccess) {
    return (
      <div className='flex-1 min-h-0 bg-gray-50 flex flex-col items-center justify-center gap-4'>
        <div className='relative flex items-center justify-center'>
          <div className='absolute w-28 h-28 bg-green-100 rounded-full animate-pulse' />
          <div className='relative w-20 h-20 bg-green-500 rounded-full flex items-center justify-center'>
            <svg className='w-10 h-10 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='3'>
              <polyline points='20 6 9 17 4 12' />
            </svg>
          </div>
        </div>
        <h1 className='text-3xl font-bold text-green-600'>{editMode ? 'Changes Saved Successfully' : 'Archive Started Successfully'}</h1>
        <p className='text-gray-500'>Redirecting to Archive Vault in 2s…</p>
      </div>
    );
  }

  // ── Row component ──
  const ReviewRow = ({ label, children, onEdit, noBorder }: { label: string; children: React.ReactNode; onEdit?: () => void; noBorder?: boolean }) => (
    <div className='flex items-start gap-4 py-3 px-5'
      style={{ borderBottom: noBorder ? 'none' : '1px solid #F1F5F9' }}>
      <div className='flex-shrink-0 text-sm text-gray-400' style={{ width: 200, paddingTop: 1 }}>{label}</div>
      <div className='flex-1 text-sm text-gray-900'>{children}</div>
      {onEdit && (
        <button onClick={onEdit}
          className='flex-shrink-0 text-sm font-medium transition-colors hover:opacity-70'
          style={{ color: '#155DFC' }}>
          Edit
        </button>
      )}
    </div>
  );

  const FilterPill = ({ text, highlight }: { text: string; highlight?: boolean }) => (
    <span className='inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium'
      style={{ background: highlight ? '#EFF6FF' : '#F1F5F9', color: highlight ? '#155DFC' : '#374151', border: `1px solid ${highlight ? '#BFDBFE' : '#E5E7EF'}` }}>
      {text}
    </span>
  );

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-6 min-h-0 gap-4'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/archive-vault' className='font-semibold text-sm text-gray-700 hover:text-blue-600 transition-colors'>
            Archive Vault
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>{editMode ? 'Edit Archive' : 'New Archive'}</span>
        </div>

        {/* Progress bar */}
        <ProgressBar activeStep={6} />

        {/* Main card */}
        <div className='bg-white rounded-xl flex-shrink-0'
          style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          {/* Card header */}
          <div className='flex items-start justify-between px-5 py-4' style={{ borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <h1 className='text-xl font-bold text-gray-900'>Review before you archive</h1>
              <p className='text-sm text-gray-500 mt-0.5'>This is your last change to change anything before the archive runs.</p>
            </div>
            <span className='text-sm font-semibold flex-shrink-0' style={{ color: '#059669' }}>Final Step</span>
          </div>

          {/* Summary cards */}
          <div className='grid grid-cols-2 gap-4 px-5 py-4' style={{ borderBottom: '1px solid #F1F5F9' }}>
            {/* Red card */}
            <div className='rounded-xl px-5 py-4' style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <p className='text-xs font-semibold tracking-wide mb-2' style={{ color: '#EF4444' }}>WILL BE REMOVED FROM SALESFORCE</p>
              {totalRecords !== null ? (
                <p className='text-2xl font-bold mb-1' style={{ color: '#DC2626' }}>{totalRecords.toLocaleString()} Records</p>
              ) : (
                <p className='text-sm font-medium mb-1 flex items-center gap-1.5' style={{ color: '#DC2626' }}>
                  <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
                  Run Dry Run to see estimated record count
                </p>
              )}
              <p className='text-sm' style={{ color: '#EF4444' }}>{totalDataSize ?? 'Size unknown — run Dry Run'} • {objectNames}</p>
            </div>
            {/* Green card */}
            <div className='rounded-xl px-5 py-4' style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <p className='text-xs font-semibold tracking-wide mb-2' style={{ color: '#059669' }}>WILL BE STORED IN {destinationProvider.toUpperCase()}</p>
              <p className='text-2xl font-bold mb-1' style={{ color: '#059669' }}>All Restorable</p>
              <p className='text-sm' style={{ color: '#16A34A' }}>{destinationName}</p>
            </div>
          </div>

          {/* Review rows */}
          <ReviewRow label='Archive name' onEdit={() => onEditStep(2)}>
            <span className='font-medium'>{policyName}</span>
          </ReviewRow>

          <ReviewRow label='Objects Included' onEdit={() => onEditStep(3)}>
            <span>{objectNames}</span>
          </ReviewRow>

          <ReviewRow label='Records'>
            {totalRecords !== null ? (
              <span>{totalRecords.toLocaleString()}</span>
            ) : (
              <span className='flex items-center gap-1.5 text-gray-400 italic text-xs'>
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
                Run Dry Run to see record count
              </span>
            )}
          </ReviewRow>

          <ReviewRow label='Filters'>
            <span>
              {totalFilters} Filter{totalFilters !== 1 ? 's' : ''} |{' '}
              {dummyObjects.some((o) => (o as any).archivalPayload?.condition?.type === 'SOQL') ? 'SOQL' : 'All Condition Match'}
            </span>
          </ReviewRow>

          {/* Per-object filter rows */}
          {dummyObjects.map((obj, idx) => {
            const p = (obj as any).archivalPayload;
            const soqlQuery: string | undefined = p?.condition?.type === 'SOQL' ? p.condition.soqlQuery : undefined;
            const fields: any[] = p?.field ?? [];
            if (!soqlQuery && fields.length === 0) return null;
            return (
              <ReviewRow key={obj.id} label={`${obj.id} Object Filter`}
                noBorder={idx === dummyObjects.length - 1 && !scheduleConfig}>
                {soqlQuery ? (
                  <div className='flex flex-col gap-1'>
                    <span className='text-xs font-semibold uppercase tracking-wide' style={{ color: '#6366F1' }}>SOQL</span>
                    <code className='text-xs rounded px-2 py-1.5 break-all' style={{ background: '#F1F5F9', color: '#1E293B' }}>
                      SELECT FIELDS(ALL) FROM {obj.id} WHERE {soqlQuery}
                    </code>
                  </div>
                ) : (
                  <div className='flex items-center gap-2 flex-wrap'>
                    {fields.map((f: any, fi: number) => (
                      <span key={fi} className='flex items-center gap-1.5 flex-wrap'>
                        <FilterPill text={`${f.name} ${f.filter.operator === '=' ? '=' : f.filter.operator === '<' ? 'Before' : f.filter.operator} "${f.filter.value}"`} highlight />
                        {fi < fields.length - 1 && (
                          <FilterPill text={p?.condition?.type ?? 'AND'} />
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </ReviewRow>
            );
          })}

          <ReviewRow label='Data Size'>
            {totalDataSize !== null ? (
              <span>{totalDataSize}</span>
            ) : (
              <span className='flex items-center gap-1.5 text-gray-400 italic text-xs'>
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
                Run Dry Run to see data size
              </span>
            )}
          </ReviewRow>

          <ReviewRow label='Scheduled' onEdit={() => onEditStep(5)} noBorder>
            <span>{scheduleDisplay}</span>
          </ReviewRow>

        </div>

        {/* API error */}
        {apiError && (
          <div className='flex-shrink-0 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3'>
            <svg className='w-4 h-4 text-red-500 mt-0.5 flex-shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24' strokeWidth='2'>
              <circle cx='12' cy='12' r='10' /><path d='M12 8v4M12 16h.01' strokeLinecap='round' />
            </svg>
            <p className='text-sm text-red-600'>{apiError}</p>
          </div>
        )}

      </div>

      {/* Sticky Footer */}
      <div className='flex-shrink-0 flex justify-between gap-4 px-6 py-4 bg-gray-50 border-t border-gray-200'>
        <button onClick={() => navigate('/archive-vault')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
          Cancel
        </button>
        <div className='flex gap-3'>
          <button onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
            ←Back
          </button>
          {!editMode && (
            <button onClick={handleSaveDraft} disabled={isLoading}
              className='px-6 py-2 font-medium border rounded-lg transition-colors disabled:opacity-50'
              style={{ borderColor: '#155DFC', color: '#155DFC', background: 'white' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
              Save As Draft
            </button>
          )}
          <button onClick={editMode ? handleSaveChanges : handleRunArchive} disabled={isLoading}
            className='px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white'
            style={{ background: '#155DFC' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1246CC')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#155DFC')}>
            {isLoading ? (editMode ? 'Saving…' : 'Creating…') : (editMode ? 'Save Changes' : 'Start Archive')}
          </button>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6'
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className='relative w-full bg-white rounded-2xl flex flex-col overflow-hidden'
            style={{ maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className='flex items-center justify-between px-5 sm:px-7 pt-5 sm:pt-6 pb-4'>
              <h2 className='text-base font-semibold text-gray-900'>Confirm Archive</h2>
              <button
                onClick={() => setShowConfirm(false)}
                className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
                aria-label='Close'
              >
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M18 6L6 18M6 6l12 12' />
                </svg>
              </button>
            </div>

            <div className='px-5 sm:px-7 pb-5 sm:pb-6 flex flex-col gap-4'>
              {/* Info banner */}
              <div className='rounded-lg px-4 py-3 text-sm text-center leading-relaxed' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                {totalRecords !== null ? (
                  <>Estimated <span className='font-bold text-gray-900'>{totalRecords.toLocaleString()}</span> records will be moved to this archive from your <span className='font-semibold text-gray-800'>{crmName}</span> org.</>
                ) : (
                  <>Records will be moved to this archive from your <span className='font-semibold text-gray-800'>{crmName}</span> org. <span className='text-blue-500 font-medium'>Go back and run Dry Run to see the estimated count before proceeding.</span></>
                )}
              </div>

              {/* Warning text */}
              <p className='text-sm text-center leading-relaxed' style={{ color: '#D97706' }}>
                This will permanently remove the matched records from{' '}
                <span className='font-semibold'>{crmName}</span>{' '}
                and move them to{' '}
                <span className='font-semibold'>{destinationName}</span>.{' '}
                This action cannot be undone from the source.
              </p>


              {/* Type ARCHIVE row — stacks on mobile, inline on sm+ */}
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3'>
                <span className='shrink-0 text-sm text-gray-700'>
                  Type <span className='font-bold text-gray-900'>ARCHIVE</span> in the box to confirm and proceed
                </span>
                <input
                  type='text'
                  value={confirmText}
                  onChange={(e) => { setConfirmText(e.target.value); if (confirmError) setConfirmError(false); }}
                  className='w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-36'
                  style={{ border: `1px solid ${confirmError ? '#EF4444' : '#D1D5DB'}` }}
                  placeholder='ARCHIVE'
                />
              </div>
              {confirmError && (
                <p className='text-xs text-red-500'>Please type "ARCHIVE" to proceed</p>
              )}
            </div>

            {/* Footer */}
            <div
              className='flex flex-col-reverse gap-2 px-5 sm:px-7 py-4 sm:py-5 sm:flex-row sm:justify-center sm:gap-4'
              style={{ borderTop: '1px solid #F1F5F9' }}
            >
              <button
                onClick={() => setShowConfirm(false)}
                className='w-full rounded-xl border border-gray-300 bg-white px-8 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto'
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRun}
                className='w-full rounded-xl px-8 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 sm:w-auto'
                style={{ background: '#155DFC' }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
