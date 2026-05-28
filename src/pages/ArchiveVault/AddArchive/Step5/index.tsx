import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { SelectedArchiveObject } from '../Step3';
import type { ArchiveScheduleConfig } from '../Step4';
import { useArchivalService } from '../../../../services/archival/archival.service';
import ProgressBar from '../ProgressBar';

interface Step5Props {
  archivalPayload?: Record<string, unknown> | null;
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
}


const freqLabel: Record<string, string> = {
  ONCE: 'One Time', HOURLY: 'Hourly', DAILY: 'Daily',
  WEEKLY: 'Weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

export default function Step5({
  archivalPayload = null,
  crmName = 'Salesforce Production',
  crmConnectionName = 'Salesforce Org',
  destinationProvider = 'AWS S3',
  destinationName = 'Hot tier, Standard-hot-tier bucket',
  policyName = 'Accounts-Contact-Opportunity Archive — May 14, 2026',
  description = '',
  selectedObjects = [],
  scheduleConfig = null,
  onBack,
  onEditStep,
}: Step5Props) {
  const navigate = useNavigate();
  const archivalService = useArchivalService();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmError, setConfirmError] = useState(false);

  // Dummy data fallbacks
  const dummyObjects = selectedObjects.length > 0 ? selectedObjects : [
    { id: 'Account', type: 'STANDARD' as const, archivalPayload: { name: 'Account', condition: { type: 'AND' as const }, field: [{ name: 'Name', filter: { value: 'Accenture', operator: '=' } }, { name: 'Name', filter: { value: 'Accenture', operator: '=' } }] } },
    { id: 'Contact', type: 'STANDARD' as const, archivalPayload: { name: 'Contact', condition: { type: 'AND' as const }, field: [{ name: 'CreatedDate', filter: { value: '2020-03-20', operator: '<' } }] } },
    { id: 'Opportunity', type: 'CUSTOM' as const, archivalPayload: { name: 'Opportunity', condition: { type: 'AND' as const }, field: [{ name: 'Status', filter: { value: 'Closed', operator: '=' } }] } },
  ];

  const totalRecords = 9125;
  const totalDataSize = '4.2 GB';
  const objectNames = dummyObjects.map((o) => o.id).join(', ');
  const totalFilters = dummyObjects.reduce((sum, o) => sum + ((o as any).archivalPayload?.field?.length ?? 0), 0);

  const schedFreq = scheduleConfig
    ? (freqLabel[scheduleConfig.scheduling.frequency] ?? scheduleConfig.scheduling.frequency)
    : 'Daily';
  const schedStartDate = scheduleConfig?.scheduling.startDate ?? '20-05-2026';
  const schedStartTime = scheduleConfig?.scheduling.startTime ?? '06:00 PM';
  const scheduleDisplay = `${schedFreq} at ${schedStartTime}, Starts from ${schedStartDate}`;

  const fireApi = async (backupStatus: 'DRAFT' | 'ACTIVE') => {
    await archivalService.applyConfig({ ...archivalPayload, backupStatus } as any);
  };

  const handleRunArchive = () => { setApiError(null); setConfirmText(''); setConfirmChecked(false); setConfirmError(false); setShowConfirm(true); };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      await fireApi('DRAFT');
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
        <h1 className='text-3xl font-bold text-green-600'>Archive Started Successfully</h1>
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
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Archive</span>
        </div>

        {/* Progress bar */}
        <ProgressBar activeStep={5} />

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
              <p className='text-2xl font-bold mb-1' style={{ color: '#DC2626' }}>{totalRecords.toLocaleString()} Records</p>
              <p className='text-sm' style={{ color: '#EF4444' }}>{totalDataSize} • {objectNames}</p>
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
            <span>{totalRecords.toLocaleString()}</span>
          </ReviewRow>

          <ReviewRow label='Filters'>
            <span>{totalFilters} Filter{totalFilters !== 1 ? 's' : ''} | All Condition Match</span>
          </ReviewRow>

          {/* Per-object filter rows */}
          {dummyObjects.map((obj, idx) => {
            const fields: any[] = (obj as any).archivalPayload?.field ?? [];
            if (fields.length === 0) return null;
            return (
              <ReviewRow key={obj.id} label={`${obj.id} Object Filter`} onEdit={() => onEditStep(3)}
                noBorder={idx === dummyObjects.length - 1 && !scheduleConfig}>
                <div className='flex items-center gap-2 flex-wrap'>
                  {fields.map((f: any, fi: number) => (
                    <span key={fi} className='flex items-center gap-1.5 flex-wrap'>
                      <FilterPill text={`${f.name} ${f.filter.operator === '=' ? '=' : f.filter.operator === '<' ? 'Before' : f.filter.operator} "${f.filter.value}"`} highlight />
                      {fi < fields.length - 1 && (
                        <FilterPill text={(obj as any).archivalPayload?.condition?.type ?? 'AND'} />
                      )}
                    </span>
                  ))}
                </div>
              </ReviewRow>
            );
          })}

          <ReviewRow label='Data Size'>
            <span>{totalDataSize}</span>
          </ReviewRow>

          <ReviewRow label='Scheduled' onEdit={() => onEditStep(4)} noBorder>
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
          <button onClick={handleSaveDraft} disabled={isLoading}
            className='px-6 py-2 font-medium border rounded-lg transition-colors disabled:opacity-50'
            style={{ borderColor: '#155DFC', color: '#155DFC', background: 'white' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#EFF6FF')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
            Save As Draft
          </button>
          <button onClick={handleRunArchive} disabled={isLoading}
            className='px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white'
            style={{ background: '#155DFC' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1246CC')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#155DFC')}>
            {isLoading ? 'Creating…' : 'Start Archive'}
          </button>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          onClick={() => setShowConfirm(false)}>
          <div className='bg-white rounded-2xl w-full flex flex-col'
            style={{ maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className='flex items-center justify-between px-7 pt-6 pb-4'>
              <h2 className='text-base font-semibold text-gray-900'>Confirm Archive</h2>
              <button onClick={() => setShowConfirm(false)}
                className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M18 6L6 18M6 6l12 12' />
                </svg>
              </button>
            </div>

            <div className='px-7 pb-6 space-y-5'>
              {/* Info banner */}
              <div className='rounded-lg px-4 py-3 text-sm text-center' style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                Estimated <span className='font-bold text-gray-900'>{totalRecords.toLocaleString()}</span> and will be moved to this archive from your <span className='font-medium text-gray-800'>{crmName}</span> org.
              </div>

              {/* Warning text */}
              <p className='text-sm text-center leading-relaxed' style={{ color: '#D97706' }}>
                This will permanently remove the matched records from <span className='font-semibold'>{crmName} (na12)</span> and move them to <span className='font-semibold'>{destinationProvider} hot storage</span>. This action cannot be undone from the source.
              </p>

              {/* Checkbox */}
              <label className='flex items-start gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className='mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0 cursor-pointer'
                />
                <span className='text-sm text-gray-700'>
                  I understand 2,341 open Opportunities will have broken Account references after archiving.
                </span>
              </label>

              {/* Type ARCHIVE */}
              <div className='flex items-center gap-3'>
                <span className='text-sm text-gray-700 whitespace-nowrap'>
                  Type <span className='font-bold text-gray-900'>ARCHIVE</span> in the box to confirm and proceed
                </span>
                <input
                  type='text'
                  value={confirmText}
                  onChange={(e) => { setConfirmText(e.target.value); if (confirmError) setConfirmError(false); }}
                  className='flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  style={{ border: `1px solid ${confirmError ? '#EF4444' : '#D1D5DB'}` }}
                  placeholder=''
                />
              </div>
              {confirmError && (
                <p className='text-xs text-red-500 -mt-3'>Please type "ARCHIVE" to proceed</p>
              )}
            </div>

            {/* Footer */}
            <div className='flex items-center justify-center gap-4 px-7 py-5' style={{ borderTop: '1px solid #F1F5F9' }}>
              <button onClick={() => setShowConfirm(false)}
                className='px-8 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700'
                style={{ minWidth: 120 }}>
                Cancel
              </button>
              <button onClick={handleConfirmRun}
                className='px-8 py-2.5 text-sm font-medium rounded-lg text-white transition-colors'
                style={{ background: '#155DFC', minWidth: 120 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1246CC')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#155DFC')}>
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
