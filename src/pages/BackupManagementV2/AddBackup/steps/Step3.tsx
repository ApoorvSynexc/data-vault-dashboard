import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';

const NAME_MAX = 150;
const DESC_MAX = 400;

type Step3Props = {
  onNext: (policyName: string, description: string) => void;
  onBack: () => void;
  strategy?: 'realtime' | 'scheduled';
  sourceName?: string;
  destinationName?: string;
  policyName?: string;
  description?: string;
  onDone?: (policyName: string, description: string) => void;
};

export default function Step3({ onNext, onBack, strategy = 'realtime', sourceName = '', destinationName = '', policyName: initialPolicyName = '', description: initialDescription = '', onDone }: Step3Props) {
  const navigate = useNavigate();
  const backupConfigService = useBackupConfigService();

  const [policyName, setPolicyName] = useState(initialPolicyName);
  const [description, setDescription] = useState(initialDescription);
  const [policyNameError, setPolicyNameError] = useState<string | null>(null);
  const [checkingName, setCheckingName] = useState(false);

  const lastCheckedName = useRef<string>('');

  const maxSteps = strategy === 'realtime' ? 6 : 7;

  const handleNameBlur = async () => {
    const trimmed = policyName.trim();
    if (!trimmed || trimmed === lastCheckedName.current) return;
    lastCheckedName.current = trimmed;

    setCheckingName(true);
    try {
      const res = await backupConfigService.listBackupConfigs(false, undefined, trimmed);
      const items: any[] = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? res as any : [];
      const duplicate = items.some((item: any) => (item.name ?? '').toLowerCase() === trimmed.toLowerCase());
      if (duplicate) setPolicyNameError('A backup policy with this name already exists. Please choose a different name.');
    } catch {
      // skip — network error shouldn't block the user
    } finally {
      setCheckingName(false);
    }
  };

  const handleNameChange = (val: string) => {
    if (val.length > NAME_MAX) return;
    setPolicyName(val);
    if (policyNameError) setPolicyNameError(null);
    lastCheckedName.current = '';
  };

  const handleDescChange = (val: string) => {
    if (val.length > DESC_MAX) return;
    setDescription(val);
  };

  const handleNext = () => {
    if (!policyName.trim()) {
      setPolicyNameError('Backup Policy Name is required');
      return;
    }
    if (policyNameError || checkingName) return;
    if (onDone) {
      onDone(policyName, description);
    } else {
      onNext(policyName, description);
    }
  };

  const canProceed = policyName.trim().length > 0 && !policyNameError && !checkingName;

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      {/* Scrollable area */}
      <div className='flex-1 overflow-y-auto flex flex-col p-8 min-h-0'>
        {/* Header with Step Indicator */}
        <div className='flex items-start justify-between mb-8 flex-shrink-0'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Define Backup Policy</h1>
            <p className='text-gray-600 mt-2'>Fill in the required information to create a backup policy</p>
          </div>
          <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
            Step 3 of {maxSteps}
          </span>
        </div>

        {/* Main Content */}
        <div className='bg-white rounded-xl p-6 flex flex-col flex-1 min-h-0'
          style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Backup Source */}
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>
                <span className='text-red-500'>*</span> Backup Source
              </label>
              <input
                type='text'
                value={sourceName || '—'}
                disabled
                className='w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed'
              />
            </div>

            {/* Backup Destination */}
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>
                <span className='text-red-500'>*</span> Backup Destination
              </label>
              <input
                type='text'
                value={destinationName || '—'}
                disabled
                className='w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed'
              />
            </div>

            {/* Backup Policy Name */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-sm font-semibold text-gray-900'>
                  <span className='text-red-500'>*</span> Backup Policy Name
                </label>
                <span className={`text-[11px] tabular-nums ${policyName.length >= NAME_MAX ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {policyName.length}/{NAME_MAX}
                </span>
              </div>
              <div className='relative'>
                <input
                  type='text'
                  value={policyName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameBlur}
                  placeholder='Enter backup policy name'
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    policyNameError
                      ? 'border-red-400 focus:ring-red-400 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {checkingName && (
                  <span className='absolute right-3 top-1/2 -translate-y-1/2'>
                    <svg className='animate-spin text-gray-400' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                      <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' strokeLinecap='round' />
                    </svg>
                  </span>
                )}
              </div>
              {policyNameError && (
                <p className='text-sm text-red-600 mt-2 flex items-center gap-1'>
                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                  </svg>
                  {policyNameError}
                </p>
              )}
            </div>

            {/* Backup Description */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-sm font-semibold text-gray-900'>
                  Backup Description <span className='text-gray-400 font-normal'>(Optional)</span>
                </label>
                <span className={`text-[11px] tabular-nums ${description.length >= DESC_MAX ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {description.length}/{DESC_MAX}
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => handleDescChange(e.target.value)}
                className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className='flex-shrink-0 flex justify-between gap-4 px-8 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/backup-management')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-4'>
          {!onDone && (
            <button
              onClick={onBack}
              className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              canProceed
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {checkingName && (
              <svg className='animate-spin' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'>
                <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' strokeLinecap='round' />
              </svg>
            )}
            {checkingName ? 'Checking…' : onDone ? 'Save & Return →' : 'Next Step →'}
          </button>
        </div>
      </div>
    </div>
  );
}
