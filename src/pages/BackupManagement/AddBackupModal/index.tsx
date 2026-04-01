import { useMemo, useState } from 'react';
import Typography from '../../../components/Typography';
import { dataScopeRows, initialSelectedObjectIds } from './constants';
import { ReviewCard, SearchIcon, SelectChevron, StepMarker } from './components';
import type {
  AddBackupModalProps,
  AzureConfig,
  BackupEnvironment,
  DestinationType,
  DurationType,
  GoogleConfig,
  PlatformType,
  S3Config,
  ScheduleMode,
  ScheduleType,
  WeekDay,
  WizardStep,
} from './types';

export type { BackupEnvironment, PlatformType } from './types';

export default function AddBackupModal({ isOpen, onClose }: AddBackupModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('Salesforce');
  const [environment, setEnvironment] = useState<BackupEnvironment>('Production');
  const [search, setSearch] = useState('');
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>(initialSelectedObjectIds);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [metadataBackup, setMetadataBackup] = useState(true);
  // Scheduling
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('realtime');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('incremental');
  const [duration, setDuration] = useState<DurationType>('hour');
  const [interval, setInterval] = useState<number>(6);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [monthDate, setMonthDate] = useState<number>(1);
  const [timeZone, setTimeZone] = useState('UTC');
  const [destination, setDestination] = useState<DestinationType>('S3');
  const [s3Config, setS3Config] = useState<S3Config>({ accessKeyId: '', secretAccessKey: '', bucketName: '', region: '' });
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>({ serviceAccountKey: '', bucketName: '', projectId: '' });
  const [azureConfig, setAzureConfig] = useState<AzureConfig>({ accountName: '', accountKey: '', containerName: '' });

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

  const schedulingDetails = scheduleMode === 'realtime'
    ? 'Realtime'
    : scheduleType === 'one_time'
      ? `One-time (${timeZone})`
      : duration === 'hour'
        ? `Every ${interval}h (${timeZone})`
        : duration === 'day'
          ? `Every ${interval}d (${timeZone})`
          : duration === 'week'
            ? `Weekly — ${weekDays.join(', ') || 'no days'} (${timeZone})`
            : `Monthly — day ${monthDate} (${timeZone})`;
  const schedulingMeta = scheduleMode === 'schedule' && scheduleType === 'incremental' ? 'Incremental' : scheduleMode === 'schedule' ? 'One-time' : 'Realtime';

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

  const destinationSummary = destination === 'S3'
    ? `S3 — ${s3Config.bucketName || 'No bucket'} (${s3Config.region || 'No region'})`
    : destination === 'Google'
      ? `Google Cloud — ${googleConfig.bucketName || 'No bucket'} (${googleConfig.projectId || 'No project'})`
      : `Azure Blob — ${azureConfig.containerName || 'No container'} (${azureConfig.accountName || 'No account'})`;

  function handleContinue() {
    if (currentStep < 5) {
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
            <StepMarker step={4} label='Destination' status={currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'upcoming'} />
            <StepMarker step={5} label='Review & Create' status={currentStep === 5 ? 'active' : 'upcoming'} />
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
                      Backup Name
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
                        <option value='SALESFORCE'>Salesforce</option>
                        {/* <option value='HubSpot'>HubSpot</option>
                        <option value='Zoho'>Zoho</option> */}
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

                {/* <div className='mt-6 grid grid-cols-1 gap-6 border-t border-gray-100 pt-6 md:grid-cols-2'>
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
                </div> */}
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

              <div className='mt-6 space-y-6'>
                {/* Realtime / Schedule toggle */}
                <div>
                  <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                    Type
                  </Typography>
                  <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
                    {(['realtime', 'schedule'] as ScheduleMode[]).map((option) => (
                      <button
                        key={option}
                        type='button'
                        onClick={() => setScheduleMode(option)}
                        className={[
                          'min-w-[100px] border-r border-blue-600 px-5 py-2 text-xs font-medium capitalize transition last:border-r-0',
                          scheduleMode === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                        ].join(' ')}
                      >
                        {option === 'realtime' ? 'Realtime' : 'Schedule'}
                      </button>
                    ))}
                  </div>
                </div>

                {scheduleMode === 'schedule' && (
                  <>
                    {/* One-time / Incremental */}
                    <div>
                      <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                        Schedule Type
                      </Typography>
                      <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
                        {(['one_time', 'incremental'] as ScheduleType[]).map((option) => (
                          <button
                            key={option}
                            type='button'
                            onClick={() => setScheduleType(option)}
                            className={[
                              'min-w-[110px] border-r border-blue-600 px-5 py-2 text-xs font-medium transition last:border-r-0',
                              scheduleType === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                            ].join(' ')}
                          >
                            {option === 'one_time' ? 'One-time' : 'Incremental'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {scheduleType === 'incremental' && (
                      <>
                        {/* Duration type */}
                        <div>
                          <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                            Frequency
                          </Typography>
                          <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
                            {(['hour', 'day', 'week', 'month'] as DurationType[]).map((option) => (
                              <button
                                key={option}
                                type='button'
                                onClick={() => setDuration(option)}
                                className={[
                                  'min-w-[72px] border-r border-blue-600 px-4 py-2 text-xs font-medium capitalize transition last:border-r-0',
                                  duration === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                                ].join(' ')}
                              >
                                {option.charAt(0).toUpperCase() + option.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Interval — hour */}
                        {duration === 'hour' && (
                          <label className='block max-w-xs'>
                            <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                              Every (hours)
                            </Typography>
                            <div className='relative'>
                              <select
                                value={interval}
                                onChange={(e) => setInterval(Number(e.target.value))}
                                className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                              >
                                {[6, 12].map((h) => (
                                  <option key={h} value={h}>Every {h} hours</option>
                                ))}
                              </select>
                              <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
                            </div>
                          </label>
                        )}

                        {/* Interval — day */}
                        {duration === 'day' && (
                          <label className='block max-w-xs'>
                            <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                              Every (days)
                            </Typography>
                            <div className='relative'>
                              <select
                                value={interval}
                                onChange={(e) => setInterval(Number(e.target.value))}
                                className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                              >
                                {Array.from({ length: 15 }, (_, i) => i + 1).map((d) => (
                                  <option key={d} value={d}>Every {d} {d === 1 ? 'day' : 'days'}</option>
                                ))}
                              </select>
                              <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
                            </div>
                          </label>
                        )}

                        {/* Week days */}
                        {duration === 'week' && (
                          <div>
                            <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                              On days
                            </Typography>
                            <div className='flex flex-wrap gap-2'>
                              {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as WeekDay[]).map((day) => {
                                const active = weekDays.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type='button'
                                    onClick={() => setWeekDays((prev) =>
                                      active ? prev.filter((d) => d !== day) : [...prev, day]
                                    )}
                                    className={[
                                      'h-9 w-12 rounded-lg border text-xs font-medium capitalize transition',
                                      active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400',
                                    ].join(' ')}
                                  >
                                    {day.charAt(0).toUpperCase() + day.slice(1)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Month date */}
                        {duration === 'month' && (
                          <label className='block max-w-xs'>
                            <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                              On date
                            </Typography>
                            <div className='relative'>
                              <select
                                value={monthDate}
                                onChange={(e) => setMonthDate(Number(e.target.value))}
                                className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                              <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
                            </div>
                          </label>
                        )}
                      </>
                    )}

                    {/* Timezone — shown for all schedule types */}
                    <label className='block max-w-xs'>
                      <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                        Time Zone
                      </Typography>
                      <div className='relative'>
                        <select
                          value={timeZone}
                          onChange={(e) => setTimeZone(e.target.value)}
                          className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        >
                          <option value='UTC'>UTC</option>
                          <option value='America/New_York'>America/New_York (EST/EDT)</option>
                          <option value='America/Los_Angeles'>America/Los_Angeles (PST/PDT)</option>
                          <option value='Europe/London'>Europe/London (GMT/BST)</option>
                          <option value='Asia/Kolkata'>Asia/Kolkata (IST)</option>
                          <option value='Asia/Tokyo'>Asia/Tokyo (JST)</option>
                        </select>
                        <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
                      </div>
                    </label>
                  </>
                )}
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <Typography as='h2' variant='pageTitle' className='font-semibold'>
                Destination
              </Typography>
              <Typography className='mt-1' variant='bodySm' color='muted'>
                Choose where your backup data will be stored.
              </Typography>

              <div className='mt-6'>
                <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
                  {(['S3', 'Google', 'Azure'] as DestinationType[]).map((option) => (
                    <button
                      key={option}
                      type='button'
                      onClick={() => setDestination(option)}
                      className={[
                        'min-w-[96px] border-r border-blue-600 px-5 py-2 text-xs font-medium transition last:border-r-0',
                        destination === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                      ].join(' ')}
                    >
                      {option === 'S3' ? 'Amazon S3' : option === 'Google' ? 'Google Cloud' : 'Azure Blob'}
                    </button>
                  ))}
                </div>

                <div className='mt-6 grid grid-cols-1 gap-5 md:grid-cols-2'>
                  {destination === 'S3' && (
                    <>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Access Key ID
                        </Typography>
                        <input
                          type='text'
                          value={s3Config.accessKeyId}
                          onChange={(e) => setS3Config((c) => ({ ...c, accessKeyId: e.target.value }))}
                          placeholder='AKIAIOSFODNN7EXAMPLE'
                          className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Secret Access Key
                        </Typography>
                        <input
                          type='password'
                          value={s3Config.secretAccessKey}
                          onChange={(e) => setS3Config((c) => ({ ...c, secretAccessKey: e.target.value }))}
                          placeholder='••••••••••••••••••••'
                          className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Bucket Name
                        </Typography>
                        <input
                          type='text'
                          value={s3Config.bucketName}
                          onChange={(e) => setS3Config((c) => ({ ...c, bucketName: e.target.value }))}
                          placeholder='my-backup-bucket'
                          className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Region
                        </Typography>
                        <div className='relative'>
                          <select
                            value={s3Config.region}
                            onChange={(e) => setS3Config((c) => ({ ...c, region: e.target.value }))}
                            className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                          >
                            <option value=''>Select region</option>
                            <option value='us-east-1'>us-east-1</option>
                            <option value='us-west-2'>us-west-2</option>
                            <option value='eu-west-1'>eu-west-1</option>
                            <option value='ap-south-1'>ap-south-1</option>
                          </select>
                          <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'>
                            <SelectChevron />
                          </div>
                        </div>
                      </label>
                    </>
                  )}

                  {destination === 'Google' && (
                    <>
                      <label className='block md:col-span-2'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Service Account Key (JSON)
                        </Typography>
                        <textarea
                          value={googleConfig.serviceAccountKey}
                          onChange={(e) => setGoogleConfig((c) => ({ ...c, serviceAccountKey: e.target.value }))}
                          placeholder='Paste your service account JSON here...'
                          rows={4}
                          className='w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Bucket Name
                        </Typography>
                        <input
                          type='text'
                          value={googleConfig.bucketName}
                          onChange={(e) => setGoogleConfig((c) => ({ ...c, bucketName: e.target.value }))}
                          placeholder='my-gcs-bucket'
                          className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Project ID
                        </Typography>
                        <input
                          type='text'
                          value={googleConfig.projectId}
                          onChange={(e) => setGoogleConfig((c) => ({ ...c, projectId: e.target.value }))}
                          placeholder='my-gcp-project-id'
                          className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                    </>
                  )}

                  {destination === 'Azure' && (
                    <>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Account Name
                        </Typography>
                        <input
                          type='text'
                          value={azureConfig.accountName}
                          onChange={(e) => setAzureConfig((c) => ({ ...c, accountName: e.target.value }))}
                          placeholder='mystorageaccount'
                          className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Account Key
                        </Typography>
                        <input
                          type='password'
                          value={azureConfig.accountKey}
                          onChange={(e) => setAzureConfig((c) => ({ ...c, accountKey: e.target.value }))}
                          placeholder='••••••••••••••••••••'
                          className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                      <label className='block'>
                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                          Container Name
                        </Typography>
                        <input
                          type='text'
                          value={azureConfig.containerName}
                          onChange={(e) => setAzureConfig((c) => ({ ...c, containerName: e.target.value }))}
                          placeholder='backup-container'
                          className='h-10 w-full rounded-lg border border-gray-300 px-4 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {currentStep === 5 && (
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

                <ReviewCard
                  title='Destination'
                  details={destinationSummary}
                  meta={destination}
                  onEdit={() => setCurrentStep(4)}
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
            {currentStep === 5 ? (
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
