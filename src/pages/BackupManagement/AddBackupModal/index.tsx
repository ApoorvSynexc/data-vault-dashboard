import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Typography from '../../../components/Typography';
import { initialSelectedObjectIds } from './constants';
import { SelectChevron, StepMarker } from './components';
import { DataScopeStep, DefineBackupPolicyStep, DestinationStep, ReviewStep } from './steps';
import { useBackupConfigService } from '../../../services/backup-config/backup-config.service';
import { useAppSelector } from '../../../store/hooks';
import { capitalize } from '../../../utils';
import {
  validateBackupStep1,
  validateBackupStep2,
  validateBackupStep4,
  type BackupFieldErrors,
} from '../../../validation/backup.validation';
import type {
  AddBackupModalProps,
  AzureConfig,
  BackupEnvironment,
  ConditionType,
  CreateBackupFrequency,
  CreateBackupPayload,
  DestinationType,
  DurationType,
  FieldDataType,
  FieldFilter,
  FilterOperator,
  GoogleConfig,
  ObjectField,
  ObjectFilterConfig,
  S3Config,
  ScheduleMode,
  ScheduleType,
  WeekDay,
  WizardStep,
} from './types';

const OPERATORS_BY_TYPE: Record<FieldDataType, FilterOperator[]> = {
  string:   ['=', '!=', 'LIKE', 'IN'],
  number:   ['=', '!=', '>', '<', '>=', '<='],
  boolean:  ['=', '!='],
  date:     ['=', '!=', '>', '<', '>=', '<='],
  datetime: ['=', '!=', '>', '<', '>=', '<='],
  id:       ['=', '!=', 'IN'],
};

export type { BackupEnvironment, PlatformType } from './types';

function fieldClass(error?: string, isSelect = false) {
  const base = isSelect
    ? 'h-10 w-full appearance-none rounded-lg border bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition'
    : 'h-10 w-full rounded-lg border px-4 text-xs text-gray-800 outline-none transition';
  return error
    ? `${base} border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100`
    : `${base} border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100`;
}

export default function AddBackupModal({ isOpen, onClose }: AddBackupModalProps) {
  const platforms = useAppSelector((state) => state.platforms.list);
  const defaultCrmId = platforms.find((item) => item.status === 'ACTIVE')?.crmId ?? platforms[0]?.crmId ?? '';
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [crmId, setCrmId] = useState(defaultCrmId);
  const [environment, setEnvironment] = useState<BackupEnvironment>('Production');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>(initialSelectedObjectIds);
  const [isBulkSelectionPending, startBulkSelectionTransition] = useTransition();
  const [includeAttachments] = useState(true);
  const [metadataBackup] = useState(true);
  // Scheduling
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('realtime');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('incremental');
  const [duration, setDuration] = useState<DurationType>('hour');
  const [interval, setInterval] = useState<number>(6);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [monthDate, setMonthDate] = useState<number>(1);
  const [timeZone, setTimeZone] = useState('UTC');
  const [objectFilters, setObjectFilters] = useState<Record<string, ObjectFilterConfig>>({});
  const [expandedFilterObjects, setExpandedFilterObjects] = useState<string[]>([]);
  const [objectFields, setObjectFields] = useState<Record<string, ObjectField[]>>({});
  const [objectFieldsLoading, setObjectFieldsLoading] = useState<Record<string, boolean>>({});
  const backupConfigService = useBackupConfigService();
  const queryClient = useQueryClient();
  const [stepErrors, setStepErrors] = useState<BackupFieldErrors>({});

  const createBackupMutation = useMutation({
    mutationFn: () => backupConfigService.createBackupConfig(buildPayload()),
    onSuccess: handleClose,
  });
  const [destination, setDestination] = useState<DestinationType>('S3');
  const [s3Config, setS3Config] = useState<S3Config>({ accessKeyId: '', secretAccessKey: '', bucketName: '', region: '' });
  const [googleConfig, setGoogleConfig] = useState<GoogleConfig>({ serviceAccountKey: '', bucketName: '', projectId: '' });
  const [azureConfig, setAzureConfig] = useState<AzureConfig>({ accountName: '', accountKey: '', containerName: '' });

  useEffect(() => {
    if (!crmId && defaultCrmId) {
      setCrmId(defaultCrmId);
    }
  }, [crmId, defaultCrmId]);

  const objectListQuery = useQuery({
    queryKey: ['backup-config', 'object-list', crmId],
    queryFn: () => backupConfigService.getObjectList(crmId),
    enabled: isOpen && currentStep === 2 && !!crmId,
    staleTime: 5 * 60 * 1000,
  });

  const dataScopeRows = objectListQuery.data ?? [];
  const isObjectListLoading = objectListQuery.isLoading;
  const selectedObjectIdSet = useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);

  useEffect(() => {
    if (!objectListQuery.data) {
      return;
    }

    setSelectedObjectIds((current) => {
      const validIds = new Set(objectListQuery.data.map((row) => row.id));
      const nextSelectedIds = current.filter((id) => validIds.has(id));
      return nextSelectedIds.length > 0 ? nextSelectedIds : objectListQuery.data.slice(0, 2).map((row) => row.id);
    });
  }, [objectListQuery.data]);

  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const modeRows = dataScopeRows.filter((row) => row.backupMode === scheduleMode || row.backupMode === 'both');
    if (!query) return modeRows;
    return modeRows.filter((row) => row.name.toLowerCase().includes(query));
  }, [dataScopeRows, deferredSearch, scheduleMode]);

  const visibleRowIdSet = useMemo(() => new Set(filteredRows.map((row) => row.id)), [filteredRows]);

  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedObjectIdSet.has(row.id));

  const selectedObjectsSummary = useMemo(() => {
    const selectedRows = dataScopeRows.filter((row) => selectedObjectIdSet.has(row.id));
    if (selectedRows.length === 0) {
      return 'No objects selected';
    }

    const firstItems = selectedRows.slice(0, 3).map((row) => row.name).join(', ');
    const remaining = selectedRows.length - 3;

    return remaining > 0 ? `${firstItems}, +${remaining} objects selected` : firstItems;
  }, [dataScopeRows, selectedObjectIdSet]);

  const selectedFilterRows = useMemo(
    () => dataScopeRows.filter((row) => selectedObjectIdSet.has(row.id)),
    [dataScopeRows, selectedObjectIdSet],
  );

  const scopeMetaSummary = [
    includeAttachments ? 'Attachment' : null,
    metadataBackup ? 'Metadata included' : null,
  ].filter(Boolean).join(', ') || 'No extras selected';

  const selectedPlatform = useMemo(
    () => platforms.find((item) => item.crmId === crmId),
    [crmId, platforms],
  );

  const platformOptions = useMemo(
    () =>
      platforms.map((item) => ({
        value: item.crmId,
        label: `${capitalize(item.crmName)} ( ${item.crmProfile?.email} )`,
      })),
    [platforms],
  );

  const selectedPlatformLabel = capitalize(selectedPlatform?.crmName ?? 'Platform');

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
    setStepErrors({});
    createBackupMutation.reset();
    onClose();
  }

  const handleToggleRow = useCallback((id: string) => {
    setSelectedObjectIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const handleToggleAllVisible = useCallback(() => {
    startBulkSelectionTransition(() => {
      if (allVisibleSelected) {
        setSelectedObjectIds((current) => current.filter((id) => !visibleRowIdSet.has(id)));
        return;
      }

      setSelectedObjectIds((current) => [...new Set([...current, ...visibleRowIdSet])]);
    });
  }, [allVisibleSelected, visibleRowIdSet]);

  useEffect(() => {
    const selectedIds = new Set(selectedFilterRows.map((row) => row.id));
    setExpandedFilterObjects((current) => current.filter((id) => selectedIds.has(id)));
  }, [selectedFilterRows]);

  const ensureObjectFieldsLoaded = useCallback((rowId: string, objectApiName: string) => {
    if (objectFields[rowId] || objectFieldsLoading[rowId]) {
      return;
    }

    setObjectFieldsLoading((prev) => ({ ...prev, [rowId]: true }));
    queryClient.fetchQuery({
      queryKey: ['backup-config', 'object-fields', crmId, objectApiName],
      queryFn: () => backupConfigService.getObjectFields(crmId, objectApiName),
      staleTime: 5 * 60 * 1000,
    })
      .then((res) => setObjectFields((prev) => ({ ...prev, [rowId]: res })))
      .catch(() => setObjectFields((prev) => ({ ...prev, [rowId]: [] })))
      .finally(() => setObjectFieldsLoading((prev) => ({ ...prev, [rowId]: false })));
  }, [backupConfigService, crmId, objectFields, objectFieldsLoading, queryClient]);

  const destinationSummary = destination === 'S3'
    ? `S3 — ${s3Config.bucketName || 'No bucket'} (${s3Config.region || 'No region'})`
    : destination === 'Google'
      ? `Google Cloud — ${googleConfig.bucketName || 'No bucket'} (${googleConfig.projectId || 'No project'})`
      : `Azure Blob — ${azureConfig.containerName || 'No container'} (${azureConfig.accountName || 'No account'})`;

  function handleScheduleModeChange(mode: ScheduleMode) {
    setScheduleMode(mode);
    // Reset selections to only those valid for the new mode
    const validIds = new Set(
      dataScopeRows.filter((r) => r.backupMode === mode || r.backupMode === 'both').map((r) => r.id),
    );
    setSelectedObjectIds((prev) => prev.filter((id) => validIds.has(id)));
  }

  function buildPayload(): CreateBackupPayload {
    const frequencyMap: Record<DurationType, CreateBackupFrequency> = {
      hour: 'HOURS', day: 'DAYS', week: 'WEEKS', month: 'MONTHS',
    };
    const destinationTypeMap: Record<DestinationType, 'S3' | 'GOOGLE' | 'AZURE'> = {
      S3: 'S3', Google: 'GOOGLE', Azure: 'AZURE',
    };
    const destinationConfig: Record<string, string> =
      destination === 'S3'
        ? { bucketName: s3Config.bucketName, region: s3Config.region, accessKeyId: s3Config.accessKeyId, secretAccessKey: s3Config.secretAccessKey }
        : destination === 'Google'
          ? { bucketName: googleConfig.bucketName, projectId: googleConfig.projectId, serviceAccountKey: googleConfig.serviceAccountKey }
          : { accountName: azureConfig.accountName, accountKey: azureConfig.accountKey, containerName: azureConfig.containerName };

    const objectNames = selectedObjectIds.map((id) => dataScopeRows.find((r) => r.id === id)?.name ?? id);
    const objects = selectedObjectIds.map((id) => {
      const row = dataScopeRows.find((r) => r.id === id);
      const cfg = objectFilters[id] ?? { conditionType: 'AND' as const, expression: '', fields: [] };
      return {
        name: row?.name ?? id,
        condition: { type: cfg.conditionType },
        field: cfg.fields.map((f) => ({ name: f.name, filter: { value: f.value, operator: f.operator } })),
      };
    });

    const payload: CreateBackupPayload = {
      crmId,
      name: policyName,
      description,
      environment: environment.toUpperCase(),
      objectNames,
      schedule: scheduleMode === 'realtime' ? 'REALTIME' : 'SCHEDULE',
      objects,
      destination: { type: destinationTypeMap[destination], config: destinationConfig },
    };

    if (scheduleMode === 'schedule') {
      const now = new Date();
      const monthDateIso = new Date(now.getFullYear(), now.getMonth(), monthDate).toISOString();
      payload.scheduleConfig = {
        timeZone: timeZone.toLowerCase(),
        type: scheduleType === 'one_time' ? 'ONE_TIME' : 'INCREMENTAL',
        scheduling: {
          frequency: frequencyMap[duration],
          interval,
          weekDays: weekDays.map((d) => d.toUpperCase()),
          monthDate: monthDateIso,
        },
      };
    }

    return payload;
  }

  async function handleContinue() {
    let errors: BackupFieldErrors = {};

    if (currentStep === 1) {
      errors = await validateBackupStep1({ name: policyName });
    } else if (currentStep === 2) {
      errors = await validateBackupStep2({ selectedObjectIds });
    } else if (currentStep === 4) {
      errors = await validateBackupStep4({ destination, s3Config, googleConfig, azureConfig });
    }

    setStepErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (currentStep === 2 && scheduleMode === 'realtime') {
      setCurrentStep(4);
    } else if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  }

  function handleBack() {
    setStepErrors({});
    if (currentStep === 4 && scheduleMode === 'realtime') {
      setCurrentStep(2);
    } else if (currentStep > 1) {
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
            <StepMarker step={3} label='Scheduling' status={scheduleMode === 'realtime' ? 'skipped' : currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'upcoming'} />
            <StepMarker step={4} label='Destination' status={currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'upcoming'} />
            <StepMarker step={5} label='Review & Create' status={currentStep === 5 ? 'active' : 'upcoming'} />
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-6'>
          {currentStep === 1 && (
            <DefineBackupPolicyStep
              crmId={crmId}
              description={description}
              environment={environment}
              platformOptions={platformOptions}
              policyName={policyName}
              scheduleMode={scheduleMode}
              stepErrors={stepErrors}
              onCrmIdChange={setCrmId}
              onDescriptionChange={setDescription}
              onEnvironmentChange={setEnvironment}
              onPolicyNameChange={(value) => {
                setPolicyName(value);
                setStepErrors((errors) => ({ ...errors, name: undefined }));
              }}
              onScheduleModeChange={handleScheduleModeChange}
            />
          )}

          {currentStep === 2 && (
            <DataScopeStep
              filteredRows={filteredRows}
              isLoading={isObjectListLoading}
              search={search}
              selectedObjectIdSet={selectedObjectIdSet}
              totalObjects={dataScopeRows.length}
              stepErrors={stepErrors}
              allVisibleSelected={allVisibleSelected}
              isBulkSelectionPending={isBulkSelectionPending}
              onSearchChange={setSearch}
              onToggleAllVisible={handleToggleAllVisible}
              onToggleRow={handleToggleRow}
            />
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

                    {/* Filters — per selected object */}
                    <div>
                      <div className='mb-3 flex items-center justify-between gap-3'>
                        <div>
                          <Typography as='span' variant='label' color='secondary'>
                            Filters
                          </Typography>
                          <Typography variant='bodySm' color='muted' className='mt-1'>
                            Choose only the objects you want to filter. Fields load when you open a filter editor.
                          </Typography>
                        </div>
                        <Typography variant='bodySm' color='muted'>
                          {selectedFilterRows.length} selected {selectedFilterRows.length === 1 ? 'object' : 'objects'}
                        </Typography>
                      </div>
                      <div className='space-y-3'>
                        {selectedFilterRows.map((row) => {
                          const cfg = objectFilters[row.id] ?? { conditionType: 'AND', expression: '', fields: [] };
                          const isOpen = expandedFilterObjects.includes(row.id);
                          const fields = objectFields[row.id] ?? [];
                          const isLoadingFields = objectFieldsLoading[row.id] ?? false;
                          const hasFilters = cfg.fields.length > 0 || (cfg.conditionType === 'CUSTOM' && cfg.expression.trim().length > 0);
                          const summaryText = cfg.fields.length > 0
                            ? `${cfg.fields.length} ${cfg.fields.length === 1 ? 'rule' : 'rules'}`
                            : 'No filters yet';

                          function updateCfg(patch: Partial<ObjectFilterConfig>) {
                            setObjectFilters((prev) => ({ ...prev, [row.id]: { ...cfg, ...patch } }));
                          }

                          function handleToggleOpen() {
                            setExpandedFilterObjects((current) =>
                              current.includes(row.id)
                                ? current.filter((id) => id !== row.id)
                                : [...current, row.id],
                            );

                            if (!isOpen) {
                              ensureObjectFieldsLoaded(row.id, row.id);
                            }
                          }

                          function addField() {
                            updateCfg({ fields: [...cfg.fields, { name: '', dataType: null, operator: '=', value: '' }] });
                          }

                          function removeField(idx: number) {
                            updateCfg({ fields: cfg.fields.filter((_, i) => i !== idx) });
                          }

                          function updateField(idx: number, patch: Partial<FieldFilter>) {
                            updateCfg({ fields: cfg.fields.map((f, i) => i === idx ? { ...f, ...patch } : f) });
                          }

                          function handleFieldNameChange(idx: number, name: string) {
                            const matched = fields.find((f) => f.name === name);
                            const dataType = matched?.dataType ?? null;
                            const operators = dataType ? OPERATORS_BY_TYPE[dataType] : OPERATORS_BY_TYPE.string;
                            updateField(idx, { name, dataType, operator: operators[0], value: '' });
                          }

                          return (
                            <div
                              key={row.id}
                              className={[
                                'overflow-hidden rounded-2xl border bg-white shadow-sm transition',
                                hasFilters ? 'border-blue-200 shadow-blue-100/40' : 'border-gray-200',
                              ].join(' ')}
                            >
                              <button
                                type='button'
                                onClick={handleToggleOpen}
                                className='flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50'
                              >
                                <div className='min-w-0 flex-1'>
                                  <div className='flex flex-wrap items-center gap-2'>
                                    <Typography variant='sectionTitle' color='secondary'>{row.name}</Typography>
                                    <span
                                      className={[
                                        'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]',
                                        hasFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
                                      ].join(' ')}
                                    >
                                      {hasFilters ? 'Configured' : 'Not set'}
                                    </span>
                                  </div>
                                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                                    <span className='rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600'>
                                      {summaryText}
                                    </span>
                                    <span className='rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600'>
                                      Condition: {cfg.conditionType}
                                    </span>
                                    {cfg.conditionType === 'CUSTOM' && cfg.expression.trim() && (
                                      <span className='rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700'>
                                        Custom expression
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className='flex items-center gap-3'>
                                  <span className='text-[11px] font-medium text-gray-500'>
                                    {isOpen ? 'Hide editor' : hasFilters ? 'Edit filters' : 'Set filters'}
                                  </span>
                                  <svg
                                    viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8'
                                    className={['h-4 w-4 text-gray-400 transition-transform', isOpen ? 'rotate-180' : ''].join(' ')}
                                  >
                                    <path d='M5 7.5L10 12.5L15 7.5' strokeLinecap='round' strokeLinejoin='round' />
                                  </svg>
                                </div>
                              </button>

                              {isOpen && (
                                <div className='space-y-4 border-t border-gray-100 bg-slate-50/40 px-5 py-5'>
                                  {isLoadingFields ? (
                                    <div className='flex items-center gap-2 text-xs text-gray-400'>
                                      <span className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent' />
                                      Loading fields...
                                    </div>
                                  ) : (
                                    <>
                                      {/* Condition type */}
                                      <div>
                                        <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                                          Condition
                                        </Typography>
                                        <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
                                          {(['AND', 'OR', 'CUSTOM'] as ConditionType[]).map((ct) => (
                                            <button
                                              key={ct}
                                              type='button'
                                              onClick={() => updateCfg({ conditionType: ct })}
                                              className={[
                                                'min-w-[64px] border-r border-blue-600 px-4 py-1.5 text-xs font-medium transition last:border-r-0',
                                                cfg.conditionType === ct ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                                              ].join(' ')}
                                            >
                                              {ct}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Field rows */}
                                      {cfg.fields.length > 0 && (
                                        <div className='space-y-2'>
                                          {cfg.fields.map((field, idx) => {
                                            const availableOps = field.dataType ? OPERATORS_BY_TYPE[field.dataType] : OPERATORS_BY_TYPE.string;
                                            return (
                                              <div key={idx} className='flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3'>
                                                {/* Number badge */}
                                                <span className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-600'>
                                                  {idx + 1}
                                                </span>

                                                {/* Field name — dropdown from API */}
                                                <div className='relative min-w-0 flex-1'>
                                                  <select
                                                    value={field.name}
                                                    onChange={(e) => handleFieldNameChange(idx, e.target.value)}
                                                    className='h-9 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                                  >
                                                    <option value=''>Select field</option>
                                                    {fields.map((f) => (
                                                      <option key={f.name} value={f.name}>{f.name}</option>
                                                    ))}
                                                  </select>
                                                  <div className='pointer-events-none absolute inset-y-0 right-1.5 flex items-center'><SelectChevron /></div>
                                                </div>

                                                {/* Data type badge — auto-detected, read-only */}
                                                {field.dataType && (
                                                  <span className='flex-shrink-0 rounded-md bg-gray-100 px-2 py-1 font-mono text-[10px] text-gray-500'>
                                                    {field.dataType}
                                                  </span>
                                                )}

                                                {/* Operator — filtered by data type */}
                                                <div className='relative flex-shrink-0'>
                                                  <select
                                                    value={field.operator}
                                                    onChange={(e) => updateField(idx, { operator: e.target.value as FilterOperator })}
                                                    className='h-9 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                                  >
                                                    {availableOps.map((op) => (
                                                      <option key={op} value={op}>{op}</option>
                                                    ))}
                                                  </select>
                                                  <div className='pointer-events-none absolute inset-y-0 right-1.5 flex items-center'><SelectChevron /></div>
                                                </div>

                                                {/* Value — input type based on dataType */}
                                                {field.dataType === 'boolean' ? (
                                                  <div className='relative min-w-0 flex-1'>
                                                    <select
                                                      value={field.value}
                                                      onChange={(e) => updateField(idx, { value: e.target.value })}
                                                      className='h-9 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                                    >
                                                      <option value=''>Select</option>
                                                      <option value='true'>true</option>
                                                      <option value='false'>false</option>
                                                    </select>
                                                    <div className='pointer-events-none absolute inset-y-0 right-1.5 flex items-center'><SelectChevron /></div>
                                                  </div>
                                                ) : (
                                                  <input
                                                    type={field.dataType === 'number' ? 'number' : field.dataType === 'date' ? 'date' : field.dataType === 'datetime' ? 'datetime-local' : 'text'}
                                                    value={field.value}
                                                    onChange={(e) => updateField(idx, { value: e.target.value })}
                                                    placeholder='Value'
                                                    className='h-9 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                                  />
                                                )}

                                                {/* Remove */}
                                                <button
                                                  type='button'
                                                  onClick={() => removeField(idx)}
                                                  className='flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition'
                                                >
                                                  <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
                                                    <path d='M5 5l10 10M15 5L5 15' strokeLinecap='round' />
                                                  </svg>
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Custom expression */}
                                      {cfg.conditionType === 'CUSTOM' && (
                                        <label className='block'>
                                          <Typography as='span' className='mb-1 block' variant='label' color='secondary'>
                                            Expression
                                          </Typography>
                                          <Typography className='mb-2' variant='bodySm' color='muted'>
                                            Reference fields by their number above, e.g. <span className='font-mono'>1 AND 2 OR 3</span>
                                          </Typography>
                                          <input
                                            type='text'
                                            value={cfg.expression}
                                            onChange={(e) => updateCfg({ expression: e.target.value })}
                                            placeholder='e.g. 1 AND 2 OR 3'
                                            className='h-10 w-full rounded-lg border border-gray-300 px-4 font-mono text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                          />
                                        </label>
                                      )}

                                      <div className='flex items-center justify-between gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3'>
                                        <div>
                                          <Typography variant='bodySm' color='secondary'>
                                            Add another rule for {row.name}
                                          </Typography>
                                          <Typography variant='bodySm' color='muted' className='mt-1'>
                                            Combine multiple fields with {cfg.conditionType}.
                                          </Typography>
                                        </div>
                                        <button
                                          type='button'
                                          onClick={addField}
                                          className='inline-flex items-center gap-1.5 rounded-lg border border-blue-500 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition'
                                        >
                                          <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-3.5 w-3.5'>
                                            <path d='M10 4v12M4 10h12' strokeLinecap='round' />
                                          </svg>
                                          Add Field
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          {currentStep === 4 && (
            <DestinationStep
              destination={destination}
              googleConfig={googleConfig}
              azureConfig={azureConfig}
              s3Config={s3Config}
              stepErrors={stepErrors}
              fieldClass={fieldClass}
              onDestinationChange={setDestination}
              onS3ConfigChange={(patch) => setS3Config((current) => ({ ...current, ...patch }))}
              onGoogleConfigChange={(patch) => setGoogleConfig((current) => ({ ...current, ...patch }))}
              onAzureConfigChange={(patch) => setAzureConfig((current) => ({ ...current, ...patch }))}
              onClearError={(field) => setStepErrors((current) => ({ ...current, [field]: undefined }))}
            />
          )}

          {currentStep === 5 && (
            <ReviewStep
              createErrorMessage={createBackupMutation.error?.message}
              defineDetails={policyName || `${selectedPlatformLabel} ${environment} full backup`}
              defineMeta={`${selectedPlatformLabel} | ${environment}`}
              destinationDetails={destinationSummary}
              destinationMeta={destination}
              schedulingDetails={schedulingDetails}
              schedulingMeta={schedulingMeta}
              scopeDetails={selectedObjectsSummary}
              scopeMeta={scopeMetaSummary}
              onEditStep={(step) => setCurrentStep(step)}
            />
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
                  disabled={createBackupMutation.isPending}
                  className='inline-flex min-w-[118px] items-center justify-center rounded-lg border border-blue-500 bg-white px-6 py-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50'
                >
                  Save Policy
                </button>
                <button
                  type='button'
                  onClick={() => createBackupMutation.mutate()}
                  disabled={createBackupMutation.isPending}
                  className='inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60'
                >
                  {createBackupMutation.isPending && (
                    <span className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  )}
                  {createBackupMutation.isPending ? 'Creating…' : 'Create Backup'}
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
