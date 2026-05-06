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

export default function AddBackup() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStrategy, setSelectedStrategy] = useState<BackupStrategy>('realtime');
  const [entireDatasetSelected, setEntireDatasetSelected] = useState(false);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);

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

  return (
    <div>
      {currentStep === 1 && (
        <Step1 onNext={(platformId) => {
          if (platformId) setSelectedPlatformId(platformId);
          handleNextStep();
        }} />
      )}
      {currentStep === 2 && <Step2 onNext={handleNextStep} onBack={handlePrevStep} />}
      {currentStep === 3 && <Step3 onNext={handleStrategySelected} onBack={handlePrevStep} />}
      {currentStep === 4 && <Step4 strategy={selectedStrategy} onNext={handleNextStep} onBack={handlePrevStep} />}
      {currentStep === 5 && (
        <Step5
          crmId={selectedPlatformId}
          entireDatasetSelected={entireDatasetSelected}
          onNext={handleNextStep}
          onBack={handlePrevStep}
        />
      )}
      {currentStep === 6 && selectedStrategy === 'scheduled' && (
        <Step6 onNext={handleNextStep} onBack={handlePrevStep} />
      )}
      {currentStep === 6 && selectedStrategy === 'realtime' && (
        <FinalStep strategy={selectedStrategy} onBack={handlePrevStep} />
      )}
      {currentStep === 7 && selectedStrategy === 'scheduled' && (
        <FinalStep strategy={selectedStrategy} onBack={handlePrevStep} />
      )}
    </div>
  );
}
