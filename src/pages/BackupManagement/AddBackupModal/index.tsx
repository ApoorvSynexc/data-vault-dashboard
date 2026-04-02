import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StepMarker } from './components';
import { DataScopeStep, DefineBackupPolicyStep, DestinationStep, ReviewStep, SchedulingStep } from './steps';
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
  CreateBackupFrequency,
  CreateBackupPayload,
  DestinationType,
  DurationType,
  FieldDataType,
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

const INITIAL_SELECTED_OBJECT_IDS = ['accounts', 'contacts'];

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
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>(INITIAL_SELECTED_OBJECT_IDS);
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
      .then((res) => {
        return setObjectFields((prev) => ({ ...prev, [rowId]: res }))
      })
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

    const objectNames = selectedObjectIds.map((id) => dataScopeRows.find((r) => r.id === id)?.id ?? id);
    const objects = selectedObjectIds.map((id) => {
      const row = dataScopeRows.find((r) => r.id === id);
      const cfg = objectFilters[id] ?? { conditionType: 'AND' as const, expression: '', fields: [] };
      const populatedFields = cfg.fields.filter((field) => field.name.trim().length > 0);
      return {
        name: row?.id ?? id,
        condition: { type: cfg.conditionType },
        field: populatedFields.map((f) => ({ name: f.name, filter: { value: f.value, operator: f.operator } })),
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
            <SchedulingStep
              scheduleMode={scheduleMode}
              scheduleType={scheduleType}
              duration={duration}
              interval={interval}
              weekDays={weekDays}
              monthDate={monthDate}
              timeZone={timeZone}
              selectedFilterRows={selectedFilterRows}
              expandedFilterObjects={expandedFilterObjects}
              objectFilters={objectFilters}
              objectFields={objectFields}
              objectFieldsLoading={objectFieldsLoading}
              operatorsByType={OPERATORS_BY_TYPE}
              onScheduleTypeChange={setScheduleType}
              onDurationChange={setDuration}
              onIntervalChange={setInterval}
              onWeekDaysChange={setWeekDays}
              onMonthDateChange={setMonthDate}
              onTimeZoneChange={setTimeZone}
              onToggleFilterCard={(row, isOpen) => {
                setExpandedFilterObjects((current) =>
                  current.includes(row.id)
                    ? current.filter((id) => id !== row.id)
                    : [...current, row.id],
                );

                if (!isOpen) {
                  ensureObjectFieldsLoaded(row.id, row.id);
                }
              }}
              onUpdateObjectFilter={(rowId, patch) => {
                setObjectFilters((prev) => {
                  const current = prev[rowId] ?? { conditionType: 'AND', expression: '', fields: [] };
                  return { ...prev, [rowId]: { ...current, ...patch } };
                });
              }}
            />
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
