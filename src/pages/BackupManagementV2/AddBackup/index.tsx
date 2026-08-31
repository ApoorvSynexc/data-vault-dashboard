import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';
import FinalStep from './steps/FinalStep';
import { useBackupConfigService } from '../../../services/backup-config/backup-config.service';
import { useCrmMetadataService } from '../../../services/crm-metadata/crm-metadata.service';

type BackupObject = {
  uuid: string;
  id: string;
  name: string;
  type: string;
  estimatedSize: string;
  isCustom: boolean;
  recordCount?: number;
};

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type BackupStrategy = 'realtime' | 'scheduled';

type SelectedObject = {
  uuid: string;
  id: string;
  type: 'STANDARD' | 'CUSTOM';
  isUserSelected: boolean;
  children?: { id: string; name: string }[];
};

const WIZARD_STORAGE_KEY = 'addBackupWizardState';

function loadWizardState() {
  try {
    const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(WIZARD_STORAGE_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AddBackup() {
  const [searchParams] = useSearchParams();
  const editSlug = searchParams.get('edit') ?? null;
  const isEditMode = !!editSlug;

  const restored = !isEditMode ? loadWizardState() : null;

  const initialStep = isEditMode
    ? (Math.min(Math.max(parseInt(searchParams.get('step') || '1'), 1), 7) as Step)
    : ((restored?.currentStep ?? 1) as Step);
  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const [selectedStrategy, setSelectedStrategy] = useState<BackupStrategy>(restored?.selectedStrategy ?? 'realtime');
  const [entireDatasetSelected, setEntireDatasetSelected] = useState<boolean>(restored?.entireDatasetSelected ?? false);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(restored?.selectedPlatformId ?? null);
  const [selectedConnectionName, setSelectedConnectionName] = useState<string>(restored?.selectedConnectionName ?? '');
  const [selectedDestinationName, setSelectedDestinationName] = useState<string>(restored?.selectedDestinationName ?? '');
  const [policyName, setPolicyName] = useState<string>(restored?.policyName ?? '');
  const [description, setDescription] = useState<string>(restored?.description ?? '');
  const environment = 'Production';
  const [selectedObjects, setSelectedObjects] = useState<SelectedObject[]>(restored?.selectedObjects ?? []);
  const [destinationId, setDestinationId] = useState<string | null>(restored?.destinationId ?? null);
  const [editConfigId, setEditConfigId] = useState<string | null>(null);
  const [editConfigStatus, setEditConfigStatus] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const navigate = useNavigate();
  const crmMetadataService = useCrmMetadataService();

  // --- Object list fetch (lives here so it survives step navigation) ---
  // Only starts after user confirms strategy on Step 4
  const [objectFetchReady, setObjectFetchReady] = useState(false);
  const [objectFetchType, setObjectFetchType] = useState<'realtime' | 'schedule' | null>(null);
  const [displayObjects, setDisplayObjects] = useState<BackupObject[]>([]);

  const { data: objectsData, isLoading: isLoadingObjects, error: objectsError } = useQuery({
    queryKey: ['crm-objects-v1', selectedPlatformId, objectFetchType],
    queryFn: () => crmMetadataService.getObjectList('backup', objectFetchType!),
    enabled: !!selectedPlatformId && objectFetchReady && !!objectFetchType,
  });

  useEffect(() => {
    if (!objectsData?.data) return;
    const raw = Array.isArray(objectsData.data) ? (objectsData.data as any[]) : [];
    const mapped: BackupObject[] = raw
      .filter((item) => item?.name)
      .map((item) => ({
        uuid: crypto.randomUUID(),
        id: item.name,
        name: item.label ?? item.name,
        type: 'Object',
        estimatedSize: '--',
        isCustom: item.custom ?? false,
        recordCount: item.count,
      }));
    setDisplayObjects(mapped);
  }, [objectsData]);
  // --- End object list fetch ---

  const saveStateAndNavigate = (to: string) => {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({
      currentStep,
      selectedStrategy,
      entireDatasetSelected,
      selectedPlatformId,
      selectedConnectionName,
      selectedDestinationName,
      policyName,
      description,
      selectedObjects,
      destinationId,
    }));
    navigate(to);
  };

  const backupConfigService = useBackupConfigService();

  const { data: editData } = useQuery({
    queryKey: ['backup-config-edit', editSlug],
    queryFn: () => backupConfigService.getBackupConfig(editSlug!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (!editData || prefilled) return;
    const item = (editData as any)?.data?.data ?? (editData as any)?.data ?? (editData as any);
    if (!item) return;

    setEditConfigId(item.backupConfigId ?? null);
    setEditConfigStatus(item.status ?? item.backupStatus ?? null);
    setSelectedPlatformId(item.crmId ?? null);
    setDestinationId(item.destinationId ?? null);
    const datasetValue = item.dataset ?? item.datasetType ?? item.dataSet;
    setEntireDatasetSelected(
      datasetValue === 'ENTIRE' || datasetValue === 'entire' || datasetValue === true
    );
    setPolicyName(item.name ?? '');
    setDescription(item.description ?? '');
    const strat: BackupStrategy = item.schedule === 'REALTIME' ? 'realtime' : 'scheduled';
    setSelectedStrategy(strat);

    const objs: SelectedObject[] = (item.objects ?? []).map((o: any) => ({
      uuid: o.id,
      id: o.name ?? o.id,
      type: (o.type === 'CUSTOM' ? 'CUSTOM' : 'STANDARD') as 'STANDARD' | 'CUSTOM',
      // Existing configs predate this flag — default to user-selected.
      isUserSelected: o.isUserSelected ?? true,
      children: o.children,
    }));
    setSelectedObjects(objs);

    if (item.scheduleConfig) setScheduleConfig(item.scheduleConfig);

    // Jump directly to FinalStep
    setCurrentStep(strat === 'realtime' ? 6 : 7);
    setPrefilled(true);
  }, [editData, prefilled]);

  const getMaxSteps = () => {
    return selectedStrategy === 'realtime' ? 6 : 7;
  };

  const handleNextStep = () => {
    const maxSteps = getMaxSteps();
    if (currentStep < maxSteps) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleStrategySelected = (strategy: BackupStrategy, entireDataset: boolean) => {
    const strategyChanged = strategy !== selectedStrategy;
    const entireDatasetToggled = entireDataset !== entireDatasetSelected;
    if (strategyChanged || entireDatasetToggled) {
      setSelectedObjects([]);
    }
    if (strategyChanged) {
      setDisplayObjects([]);
    }
    setSelectedStrategy(strategy);
    setEntireDatasetSelected(entireDataset);
    setObjectFetchType(strategy === 'realtime' ? 'realtime' : 'schedule');
    setObjectFetchReady(true);
    handleNextStep();
  };

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

  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);

  const isDraft = !editConfigId || editConfigStatus?.toUpperCase() === 'DRAFT';
  const isNonDraftEdit = !!editConfigId && !isDraft;
  const isScheduledNonDraft = isNonDraftEdit && selectedStrategy === 'scheduled';
  const isRealtimeNonDraft = isNonDraftEdit && selectedStrategy === 'realtime';

  // When editing a non-draft backup, after editing an allowed step,
  // jump straight back to FinalStep instead of continuing the normal flow.
  const returnToFinalStep = () => setCurrentStep(isRealtimeNonDraft ? 6 : 7);

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      {currentStep === 1 && (
        <Step1
          strategy={selectedStrategy}
          initialSelectedPlatformId={selectedPlatformId}
          onNext={(platformId, connectionName) => {
            if (platformId && platformId !== selectedPlatformId) {
              setSelectedPlatformId(platformId);
              setSelectedObjects([]);
            } else if (platformId) {
              setSelectedPlatformId(platformId);
            }
            if (connectionName !== undefined) setSelectedConnectionName(connectionName);
            handleNextStep();
          }}
        />
      )}
      {currentStep === 2 && (
        <Step2
          strategy={selectedStrategy}
          initialDestinationId={destinationId}
          onNext={(destination) => {
            if (destination?.destinationId) {
              setDestinationId(destination.destinationId);
            }
            if (destination?.name) setSelectedDestinationName(destination.name);
            handleNextStep();
          }}
          onBack={handlePrevStep}
          onAddNewDestination={() => saveStateAndNavigate('/connections/aws/connect?returnTo=/backup-management/add?step=2')}
        />
      )}
      {currentStep === 3 && (
        <Step3
          strategy={selectedStrategy}
          sourceName={selectedConnectionName}
          destinationName={selectedDestinationName}
          policyName={policyName}
          description={description}
          onNext={(name, desc) => {
            setPolicyName(name);
            setDescription(desc);
            handleNextStep();
          }}
          onBack={handlePrevStep}
          onDone={isNonDraftEdit ? (name, desc) => {
            setPolicyName(name);
            setDescription(desc);
            returnToFinalStep();
          } : undefined}
        />
      )}
      {currentStep === 4 && (
        <Step4
          initialStrategy={selectedStrategy}
          initialEntireDatasetSelected={entireDatasetSelected}
          onNext={handleStrategySelected}
          onBack={handlePrevStep}
        />
      )}
      {currentStep === 5 && (
        <Step5
          entireDatasetSelected={entireDatasetSelected}
          selectedObjectIds={selectedObjects.map((o) => o.id)}
          initialSelectedObjects={selectedObjects}
          strategy={selectedStrategy}
          displayObjects={displayObjects}
          isLoadingObjects={isLoadingObjects}
          objectsError={objectsError}
          onSelectionChange={(uuids) => {
            setSelectedObjects(uuids.map((uuid) => {
              const displayObj = displayObjects.find((o) => o.uuid === uuid);
              const existing = selectedObjects.find((o) => o.uuid === uuid || (displayObj && o.id === displayObj.id));
              if (existing) return { ...existing, uuid };
              return { uuid, id: displayObj?.id ?? uuid, type: (displayObj?.isCustom ? 'CUSTOM' : 'STANDARD') as 'STANDARD' | 'CUSTOM', isUserSelected: true };
            }));
          }}
          onNext={(objects) => {
            setSelectedObjects(objects);
            handleNextStep();
          }}
          onBack={handlePrevStep}
        />
      )}
      {currentStep === 6 && selectedStrategy === 'scheduled' && (
        <Step6
          initialScheduleConfig={scheduleConfig}
          onNext={(schedule) => {
            setScheduleConfig(schedule);
            handleNextStep();
          }}
          onBack={handlePrevStep}
          onDone={isScheduledNonDraft ? (schedule) => {
            setScheduleConfig(schedule);
            returnToFinalStep();
          } : undefined}
          hideOnce={isScheduledNonDraft}
        />
      )}
      {currentStep === 6 && selectedStrategy === 'realtime' && (
        <FinalStep
          strategy={selectedStrategy}
          onBack={handlePrevStep}
          onEditStep={(step) => {
            setCurrentStep(step as Step);
          }}
          crmId={selectedPlatformId}
          policyName={policyName}
          description={description}
          environment={environment}
          selectedObjects={selectedObjects}
          scheduleConfig={scheduleConfig}
          destinationId={destinationId}
          editConfigId={editConfigId}
          editConfigStatus={editConfigStatus}
          entireDatasetSelected={entireDatasetSelected}
        />
      )}
      {currentStep === 7 && selectedStrategy === 'scheduled' && (
        <FinalStep
          strategy={selectedStrategy}
          onBack={handlePrevStep}
          onEditStep={(step) => {
            setCurrentStep(step as Step);
          }}
          crmId={selectedPlatformId}
          policyName={policyName}
          description={description}
          environment={environment}
          selectedObjects={selectedObjects}
          scheduleConfig={scheduleConfig}
          destinationId={destinationId}
          editConfigId={editConfigId}
          editConfigStatus={editConfigStatus}
          entireDatasetSelected={entireDatasetSelected}
        />
      )}
    </div>
  );
}
