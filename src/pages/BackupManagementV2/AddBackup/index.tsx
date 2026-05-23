import { useState } from 'react';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';
import Step5 from './steps/Step5';
import Step6 from './steps/Step6';
import FinalStep from './steps/FinalStep';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type BackupStrategy = 'realtime' | 'scheduled';

type SelectedObject = {
  id: string;
  type: 'STANDARD' | 'CUSTOM';
};

export default function AddBackup() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStrategy, setSelectedStrategy] = useState<BackupStrategy>('realtime');
  const [entireDatasetSelected, setEntireDatasetSelected] = useState(false);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const environment = 'Production';
  const [selectedObjects, setSelectedObjects] = useState<SelectedObject[]>([]);
  const [destinationId, setDestinationId] = useState<string | null>(null);

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
          initialStrategy={selectedStrategy}
          initialEntireDatasetSelected={entireDatasetSelected}
          onNext={handleStrategySelected}
          onBack={handlePrevStep}
        />
      )}
      {currentStep === 4 && (
        <Step4
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
          onEditStep={(step) => setCurrentStep(step as Step)}
          crmId={selectedPlatformId}
          policyName={policyName}
          description={description}
          environment={environment}
          selectedObjects={selectedObjects}
          scheduleConfig={scheduleConfig}
          destinationId={destinationId}
        />
      )}
      {currentStep === 7 && selectedStrategy === 'scheduled' && (
        <FinalStep
          strategy={selectedStrategy}
          onBack={handlePrevStep}
          onEditStep={(step) => setCurrentStep(step as Step)}
          crmId={selectedPlatformId}
          policyName={policyName}
          description={description}
          environment={environment}
          selectedObjects={selectedObjects}
          scheduleConfig={scheduleConfig}
          destinationId={destinationId}
        />
      )}
    </div>
  );
}
