import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';
import FinalStep from './steps/FinalStep';
import { useBackupConfigService } from '../../../services/backup-config/backup-config.service';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type BackupStrategy = 'realtime' | 'scheduled';

type SelectedObject = {
  id: string;
  type: 'STANDARD' | 'CUSTOM';
};

export default function AddBackup() {
  const [searchParams] = useSearchParams();
  const editSlug = searchParams.get('edit') ?? null;
  const isEditMode = !!editSlug;

  const initialStep = Math.min(Math.max(parseInt(searchParams.get('step') || '1'), 1), 7) as Step;
  const [currentStep, setCurrentStep] = useState<Step>(initialStep);
  const [selectedStrategy, setSelectedStrategy] = useState<BackupStrategy>('realtime');
  const [entireDatasetSelected, setEntireDatasetSelected] = useState(false);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const environment = 'Production';
  const [selectedObjects, setSelectedObjects] = useState<SelectedObject[]>([]);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [editConfigId, setEditConfigId] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

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
    setSelectedPlatformId(item.crmId ?? null);
    setDestinationId(item.destinationId ?? null);
    setPolicyName(item.name ?? '');
    setDescription(item.description ?? '');
    const strat: BackupStrategy = item.schedule === 'REALTIME' ? 'realtime' : 'scheduled';
    setSelectedStrategy(strat);

    const objs: SelectedObject[] = (item.objects ?? []).map((o: any) => ({
      id: o.name ?? o.id,
      type: (o.type === 'CUSTOM' ? 'CUSTOM' : 'STANDARD') as 'STANDARD' | 'CUSTOM',
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
    setSelectedStrategy(strategy);
    setEntireDatasetSelected(entireDataset);
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

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      {currentStep === 1 && (
        <Step1
          strategy={selectedStrategy}
          initialSelectedPlatformId={selectedPlatformId}
          onNext={(platformId) => {
            if (platformId) setSelectedPlatformId(platformId);
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
            handleNextStep();
          }}
          onBack={handlePrevStep}
        />
      )}
      {currentStep === 3 && (
        <Step3
          strategy={selectedStrategy}
          policyName={policyName}
          description={description}
          onNext={(name, desc) => {
            setPolicyName(name);
            setDescription(desc);
            handleNextStep();
          }}
          onBack={handlePrevStep}
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
          crmId={selectedPlatformId}
          entireDatasetSelected={entireDatasetSelected}
          selectedObjectIds={selectedObjects.map((o) => o.id)}
          strategy={selectedStrategy}
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
        />
      )}
      {currentStep === 6 && selectedStrategy === 'realtime' && (
        <FinalStep
          strategy={selectedStrategy}
          onBack={handlePrevStep}
          onEditStep={(step) => {
            if (step === 1) setSelectedObjects([]);
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
        />
      )}
      {currentStep === 7 && selectedStrategy === 'scheduled' && (
        <FinalStep
          strategy={selectedStrategy}
          onBack={handlePrevStep}
          onEditStep={(step) => {
            if (step === 1) setSelectedObjects([]);
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
        />
      )}
    </div>
  );
}
