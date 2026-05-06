import { useState } from 'react';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import Step3 from './steps/Step3';
import Step4 from './steps/Step4';

type Step = 1 | 2 | 3 | 4;
type BackupStrategy = 'realtime' | 'scheduled';

export default function AddBackup() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedStrategy, setSelectedStrategy] = useState<BackupStrategy>('realtime');

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleNext = (strategy?: BackupStrategy) => {
    if (strategy) {
      setSelectedStrategy(strategy);
    }
    handleNextStep();
  };

  return (
    <div>
      {currentStep === 1 && <Step1 onNext={() => handleNext()} />}
      {currentStep === 2 && <Step2 onNext={() => handleNext()} onBack={handlePrevStep} />}
      {currentStep === 3 && <Step3 onNext={handleNext} onBack={handlePrevStep} />}
      {currentStep === 4 && <Step4 strategy={selectedStrategy} onNext={() => handleNext()} onBack={handlePrevStep} />}
    </div>
  );
}
