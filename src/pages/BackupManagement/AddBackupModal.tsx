import { useState } from 'react';
import Typography from '../../components/Typography';

export type PlatformType = 'Salesforce' | 'HubSpot' | 'Zoho';
export type BackupEnvironment = 'Production' | 'Sandbox';

type AddBackupModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type StepMarkerProps = {
  step: number;
  label: string;
  active?: boolean;
};

function StepMarker({ step, label, active = false }: StepMarkerProps) {
  return (
    <div className='flex min-w-[120px] flex-1 flex-col items-center gap-2 text-center'>
      <div
        className={[
          'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold',
          active ? 'border-blue-600 bg-white text-blue-600' : 'border-blue-600 bg-blue-600 text-white',
        ].join(' ')}
      >
        {step}
      </div>
      <Typography
        variant='label'
        color={active ? 'brand' : 'secondary'}
      >
        {label}
      </Typography>
    </div>
  );
}

function SelectChevron() {
  return (
    <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4 text-gray-400'>
      <path d='M5 7.5L10 12.5L15 7.5' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  );
}

export default function AddBackupModal({ isOpen, onClose }: AddBackupModalProps) {
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('Salesforce');
  const [environment, setEnvironment] = useState<BackupEnvironment>('Production');

  if (!isOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4'>
      <div className='max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]'>
        <div className='border-b border-gray-100 px-6 py-5'>
          <div className='flex flex-wrap items-start justify-between gap-6'>
            <StepMarker step={1} label='Define Backup Policy' active />
            <StepMarker step={2} label='Data Scope' />
            <StepMarker step={3} label='Scheduling' />
            <StepMarker step={4} label='Review & Create' />
          </div>
        </div>

        <div className='max-h-[calc(100vh-14rem)] overflow-y-auto px-6 py-6'>
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
                  Policy Name
                </Typography>
                <input
                  type='text'
                  value={policyName}
                  onChange={(event) => setPolicyName(event.target.value)}
                  placeholder='Backup policy name'
                  className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                />
              </label>

              <label className='block'>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                  Description
                </Typography>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
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
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value as PlatformType)}
                    className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  >
                    <option value='Salesforce'>Salesforce</option>
                    <option value='HubSpot'>HubSpot</option>
                    <option value='Zoho'>Zoho</option>
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
                    onClick={() => setEnvironment('Production')}
                    className={[
                      'min-w-[112px] px-5 py-2 text-xs font-medium transition',
                      environment === 'Production' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                    ].join(' ')}
                  >
                    Production
                  </button>
                  <button
                    type='button'
                    onClick={() => setEnvironment('Sandbox')}
                    className={[
                      'min-w-[112px] border-l border-blue-600 px-5 py-2 text-xs font-medium transition',
                      environment === 'Sandbox' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                    ].join(' ')}
                  >
                    Sandbox
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex min-w-[104px] items-center justify-center rounded-lg border border-blue-500 bg-white px-6 py-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50'
          >
            Cancel
          </button>

          <div className='flex flex-col gap-3 sm:flex-row'>
            <button
              type='button'
              className='inline-flex min-w-[104px] items-center justify-center rounded-lg border border-blue-500 bg-white px-6 py-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50'
            >
              Back
            </button>
            <button
              type='button'
              className='inline-flex min-w-[140px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700'
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
