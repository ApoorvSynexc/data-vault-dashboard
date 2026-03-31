import { useMemo, useState } from 'react';
import Typography from '../../../components/Typography';
import { dataScopeRows, initialSelectedObjectIds } from './constants';
import { ReviewCard, SearchIcon, SelectChevron, StepMarker, Toggle } from './components';
import type {
  AddBackupModalProps,
  BackupEnvironment,
  BackupFrequency,
  PlatformType,
  WizardStep,
} from './types';

export type { BackupEnvironment, PlatformType } from './types';

export default function AddBackupModal({ isOpen, onClose }: AddBackupModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('Salesforce');
  const [environment, setEnvironment] = useState<BackupEnvironment>('Production');
  const [frequency, setFrequency] = useState<BackupFrequency>('Daily');
  const [scheduleTime, setScheduleTime] = useState('02:00 AM');
  const [timeZone, setTimeZone] = useState('(GMT-04:00) Eastern Time(US & Canada)');
  const [retentionPeriod, setRetentionPeriod] = useState('1 Year (Standard)');
  const [abortWindow, setAbortWindow] = useState('1 Hour');
  const [search, setSearch] = useState('');
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>(initialSelectedObjectIds);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [metadataBackup, setMetadataBackup] = useState(true);
  const [incrementedBackup, setIncrementedBackup] = useState(true);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return dataScopeRows;
    }

    return dataScopeRows.filter((row) => row.name.toLowerCase().includes(query));
  }, [search]);

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedObjectIds.includes(row.id));

  const selectedObjectsSummary = useMemo(() => {
    const selectedRows = dataScopeRows.filter((row) => selectedObjectIds.includes(row.id));
    if (selectedRows.length === 0) {
      return 'No objects selected';
    }

    const firstItems = selectedRows.slice(0, 3).map((row) => row.name).join(', ');
    const remaining = selectedRows.length - 3;

    return remaining > 0 ? `${firstItems}, +${remaining} objects selected` : firstItems;
  }, [selectedObjectIds]);

  const scopeMetaSummary = [
    includeAttachments ? 'Attachment' : null,
    metadataBackup ? 'Metadata included' : null,
  ].filter(Boolean).join(', ') || 'No extras selected';

  const schedulingDetails = `${frequency} at ${scheduleTime}, ${timeZone}`;
  const schedulingMeta = `${retentionPeriod} | ${incrementedBackup ? 'Incremental' : 'Full'} Backup`;

  function handleClose() {
    setCurrentStep(1);
    onClose();
  }

  function handleToggleRow(id: string) {
    setSelectedObjectIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function handleToggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedObjectIds((current) => current.filter((id) => !filteredRows.some((row) => row.id === id)));
      return;
    }

    setSelectedObjectIds((current) => [...new Set([...current, ...filteredRows.map((row) => row.id)])]);
  }

  function handleContinue() {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4'>
      <div className='flex h-[min(760px,calc(100vh-2rem))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.2)]'>
        <div className='border-b border-gray-100 px-6 py-5'>
          <div className='flex flex-wrap items-start justify-between gap-6'>
            <StepMarker step={1} label='Define Backup Policy' status={currentStep > 1 ? 'completed' : 'active'} />
            <StepMarker step={2} label='Data Scope' status={currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'upcoming'} />
            <StepMarker step={3} label='Scheduling' status={currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'upcoming'} />
            <StepMarker step={4} label='Review & Create' status={currentStep === 4 ? 'active' : 'upcoming'} />
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-6'>
          {currentStep === 1 && (
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
            </>
          )}

          {currentStep === 2 && (
            <>
              <Typography as='h2' variant='pageTitle' className='font-semibold'>
                Select Data Scope
              </Typography>
              <Typography className='mt-1' variant='bodySm' color='muted'>
                Choose the data and metadata that should be included in this backup policy.
              </Typography>

              <div className='mt-6'>
                <div className='relative max-w-[350px]'>
                  <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2'>
                    <SearchIcon />
                  </span>
                  <input
                    type='text'
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder='Search Object'
                    className='h-10 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  />
                </div>

                <div className='mt-4 overflow-hidden rounded-xl border border-gray-100'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-gray-100 bg-white'>
                        <th className='w-12 px-3 py-3 text-left'>
                          <input
                            type='checkbox'
                            checked={allVisibleSelected}
                            onChange={handleToggleAllVisible}
                            className='h-4 w-4 rounded border-gray-300 accent-blue-600'
                          />
                        </th>
                        <th className='px-3 py-3 text-left'>
                          <Typography as='span' variant='label' color='secondary'>
                            Object
                          </Typography>
                        </th>
                        <th className='px-3 py-3 text-left'>
                          <Typography as='span' variant='label' color='secondary'>
                            Type
                          </Typography>
                        </th>
                        <th className='px-3 py-3 text-left'>
                          <Typography as='span' variant='label' color='secondary'>
                            Estimated Size
                          </Typography>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => {
                        const checked = selectedObjectIds.includes(row.id);

                        return (
                          <tr key={row.id} className='border-b border-gray-100 last:border-b-0'>
                            <td className='px-3 py-3'>
                              <input
                                type='checkbox'
                                checked={checked}
                                onChange={() => handleToggleRow(row.id)}
                                className='h-4 w-4 rounded border-gray-300 accent-blue-600'
                              />
                            </td>
                            <td className='px-3 py-3'>
                              <Typography variant='bodySm' color='secondary'>
                                {row.name}
                              </Typography>
                            </td>
                            <td className='px-3 py-3'>
                              <Typography variant='bodySm' color='muted'>
                                {row.type}
                              </Typography>
                            </td>
                            <td className='px-3 py-3'>
                              <Typography variant='bodySm' color='muted'>
                                {row.estimatedSize}
                              </Typography>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className='mt-6 grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 md:grid-cols-2'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <Typography variant='sectionTitle' color='secondary'>
                        Include Attachments
                      </Typography>
                      <Typography className='mt-1' variant='bodySm' color='muted'>
                        Backup email attachment, files and documents.
                      </Typography>
                    </div>
                    <Toggle checked={includeAttachments} onChange={() => setIncludeAttachments((value) => !value)} />
                  </div>

                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <Typography variant='sectionTitle' color='secondary'>
                        Metadata Backup
                      </Typography>
                      <Typography className='mt-1' variant='bodySm' color='muted'>
                        Backup the metadata structure of your platform.
                      </Typography>
                    </div>
                    <Toggle checked={metadataBackup} onChange={() => setMetadataBackup((value) => !value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <Typography as='h2' variant='pageTitle' className='font-semibold'>
                Set Backup Schedule
              </Typography>
              <Typography className='mt-1' variant='bodySm' color='muted'>
                Define how frequently your backup should be performed.
              </Typography>

              <div className='mt-6'>
                <div className='inline-flex flex-wrap overflow-hidden rounded-lg border border-blue-600'>
                  {(['Hourly', 'Daily', 'Weekly', 'Monthly'] as BackupFrequency[]).map((option) => (
                    <button
                      key={option}
                      type='button'
                      onClick={() => setFrequency(option)}
                      className={[
                        'min-w-[82px] border-r border-blue-600 px-5 py-2 text-xs font-medium transition last:border-r-0',
                        frequency === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                      ].join(' ')}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <div className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-2'>
                  <label className='block'>
                    <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                      Time
                    </Typography>
                    <div className='relative'>
                      <select
                        value={scheduleTime}
                        onChange={(event) => setScheduleTime(event.target.value)}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      >
                        <option value='02:00 AM'>02 : 00 AM</option>
                        <option value='06:00 AM'>06 : 00 AM</option>
                        <option value='08:00 PM'>08 : 00 PM</option>
                      </select>
                      <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'>
                        <SelectChevron />
                      </div>
                    </div>
                  </label>

                  <label className='block'>
                    <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                      Time Zone
                    </Typography>
                    <div className='relative'>
                      <select
                        value={timeZone}
                        onChange={(event) => setTimeZone(event.target.value)}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      >
                        <option value='(GMT-04:00) Eastern Time(US & Canada)'>(GMT-04:00) Eastern Time(US & Canada)</option>
                        <option value='(GMT+00:00) UTC'>(GMT+00:00) UTC</option>
                        <option value='(GMT+05:30) India Standard Time'>(GMT+05:30) India Standard Time</option>
                      </select>
                      <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'>
                        <SelectChevron />
                      </div>
                    </div>
                  </label>

                  <label className='block'>
                    <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                      Retention Period
                    </Typography>
                    <div className='relative'>
                      <select
                        value={retentionPeriod}
                        onChange={(event) => setRetentionPeriod(event.target.value)}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      >
                        <option value='1 Year (Standard)'>1 Year (Standard)</option>
                        <option value='6 Months'>6 Months</option>
                        <option value='3 Years'>3 Years</option>
                      </select>
                      <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'>
                        <SelectChevron />
                      </div>
                    </div>
                  </label>

                  <label className='block'>
                    <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                      Abort process if not completed in
                    </Typography>
                    <div className='relative'>
                      <select
                        value={abortWindow}
                        onChange={(event) => setAbortWindow(event.target.value)}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      >
                        <option value='1 Hour'>1 Hour</option>
                        <option value='2 Hours'>2 Hours</option>
                        <option value='4 Hours'>4 Hours</option>
                      </select>
                      <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'>
                        <SelectChevron />
                      </div>
                    </div>
                  </label>
                </div>

                <div className='mt-8 max-w-[380px]'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <Typography variant='sectionTitle' color='secondary'>
                        Incremented Backup
                      </Typography>
                      <Typography className='mt-1' variant='bodySm' color='muted'>
                        Only backup updated data if any
                      </Typography>
                    </div>
                    <Toggle checked={incrementedBackup} onChange={() => setIncrementedBackup((value) => !value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <Typography as='h2' variant='pageTitle' className='font-semibold'>
                Review And Create
              </Typography>
              <Typography className='mt-1' variant='bodySm' color='muted'>
                Review your backup policy details below before creating. Make sure everything is set up correctly
              </Typography>

              <div className='mt-8 space-y-4'>
                <ReviewCard
                  title='Define Backup Policy'
                  details={policyName || 'Salesforce Production full backup'}
                  meta={`${platform} | ${environment}`}
                  onEdit={() => setCurrentStep(1)}
                />

                <ReviewCard
                  title='Data Scope'
                  details={selectedObjectsSummary}
                  meta={scopeMetaSummary}
                  onEdit={() => setCurrentStep(2)}
                />

                <ReviewCard
                  title='Scheduling'
                  details={schedulingDetails}
                  meta={schedulingMeta}
                  onEdit={() => setCurrentStep(3)}
                />
              </div>
            </>
          )}
        </div>

        <div className='shrink-0 flex flex-col gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between'>
          <button
            type='button'
            onClick={handleClose}
            className='inline-flex min-w-[104px] items-center justify-center rounded-lg border border-blue-500 bg-white px-6 py-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50'
          >
            Cancel
          </button>

          <div className='flex flex-col gap-3 sm:flex-row'>
            <button
              type='button'
              onClick={handleBack}
              className='inline-flex min-w-[104px] items-center justify-center rounded-lg border border-blue-500 bg-white px-6 py-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50'
            >
              Back
            </button>
            {currentStep === 4 ? (
              <>
                <button
                  type='button'
                  className='inline-flex min-w-[118px] items-center justify-center rounded-lg border border-blue-500 bg-white px-6 py-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50'
                >
                  Save Policy
                </button>
                <button
                  type='button'
                  className='inline-flex min-w-[140px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700'
                >
                  Create Backup
                </button>
              </>
            ) : (
              <button
                type='button'
                onClick={handleContinue}
                className='inline-flex min-w-[140px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700'
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
