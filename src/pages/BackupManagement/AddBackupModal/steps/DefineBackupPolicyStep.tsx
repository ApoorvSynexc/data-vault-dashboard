import Typography from '../../../../components/Typography';
import { SelectChevron } from '../components';
import type { BackupEnvironment, ScheduleMode } from '../types';
import type { BackupFieldErrors } from '../../../../validation/backup.validation';

type PlatformOption = {
  label: string;
  value: string;
};

type DefineBackupPolicyStepProps = {
  crmId: string;
  description: string;
  environment: BackupEnvironment;
  platformOptions: PlatformOption[];
  policyName: string;
  scheduleMode: ScheduleMode;
  stepErrors: BackupFieldErrors;
  onCrmIdChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onEnvironmentChange: (value: BackupEnvironment) => void;
  onPolicyNameChange: (value: string) => void;
  onScheduleModeChange: (value: ScheduleMode) => void;
};

export function DefineBackupPolicyStep({
  crmId,
  description,
  environment,
  platformOptions,
  policyName,
  scheduleMode,
  stepErrors,
  onCrmIdChange,
  onDescriptionChange,
  onEnvironmentChange,
  onPolicyNameChange,
  onScheduleModeChange,
}: DefineBackupPolicyStepProps) {
  return (
    <>
      <Typography as='h2' variant='pageTitle' className='font-semibold'>
        Define Backup Policy
      </Typography>
      <Typography className='mt-1' variant='bodySm' color='muted'>
        Fill in the basic information to create a backup policy.
      </Typography>

      <div className='mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2'>
        <div className='space-y-5 lg:border-r lg:border-gray-100 lg:pr-8'>
          <label className='block'>
            <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
              Backup Name
            </Typography>
            <input
              type='text'
              value={policyName}
              onChange={(event) => onPolicyNameChange(event.target.value)}
              placeholder='Backup policy name'
              className={[
                'h-10 w-full rounded-lg border px-4 text-xs text-gray-800 outline-none transition focus:ring-2',
                stepErrors.name
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100',
              ].join(' ')}
            />
            {stepErrors.name && (
              <Typography variant='bodySm' className='mt-1 text-red-500'>{stepErrors.name}</Typography>
            )}
          </label>

          <label className='block'>
            <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
              Description
            </Typography>
            <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder='Add description...'
              rows={4}
              className='w-full rounded-lg border border-gray-300 px-4 py-3 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
            />
          </label>
        </div>

        <div className='space-y-5 lg:pl-8'>
          <label className='block'>
            <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
              Platform
            </Typography>
            <div className='relative'>
              <select
                value={crmId}
                onChange={(event) => onCrmIdChange(event.target.value)}
                className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              >
                {platformOptions.length === 0 ? (
                  <option value=''>No platform available</option>
                ) : (
                  platformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
              <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'>
                <SelectChevron />
              </div>
            </div>
          </label>

          <div>
            <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
              Environment
            </Typography>
            <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
              <button
                type='button'
                onClick={() => onEnvironmentChange('Production')}
                className={[
                  'min-w-[112px] px-5 py-2 text-xs font-medium transition',
                  environment === 'Production' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                ].join(' ')}
              >
                Production
              </button>
              <button
                type='button'
                onClick={() => onEnvironmentChange('Sandbox')}
                className={[
                  'min-w-[112px] border-l border-blue-600 px-5 py-2 text-xs font-medium transition',
                  environment === 'Sandbox' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                ].join(' ')}
              >
                Sandbox
              </button>
            </div>
          </div>

          <div>
            <Typography as='span' className='mb-1 block' variant='label' color='secondary'>
              Backup Type
            </Typography>
            <Typography className='mb-2' variant='bodySm' color='muted'>
              {scheduleMode === 'realtime'
                ? 'Data is backed up continuously as changes occur.'
                : 'Data is backed up on a defined schedule.'}
            </Typography>
            <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
              {(['realtime', 'schedule'] as ScheduleMode[]).map((option) => (
                <button
                  key={option}
                  type='button'
                  onClick={() => onScheduleModeChange(option)}
                  className={[
                    'min-w-[100px] border-r border-blue-600 px-5 py-2 text-xs font-medium capitalize transition last:border-r-0',
                    scheduleMode === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                  ].join(' ')}
                >
                  {option === 'realtime' ? 'Realtime' : 'Schedule'}
                </button>
              ))}
            </div>

            {scheduleMode === 'realtime' && (
              <div className='mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5'>
                <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='mt-px h-4 w-4 shrink-0 text-amber-500'>
                  <path d='M10 3L2 17h16L10 3z' strokeLinejoin='round' />
                  <path d='M10 9v4' strokeLinecap='round' />
                  <circle cx='10' cy='14.5' r='0.5' fill='currentColor' />
                </svg>
                <Typography variant='bodySm' color='muted' className='text-amber-700'>
                  The <span className='font-medium'>Scheduling</span> step will be skipped - realtime backups run continuously without a schedule.
                </Typography>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
