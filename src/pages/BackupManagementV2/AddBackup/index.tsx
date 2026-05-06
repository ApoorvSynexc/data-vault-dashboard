import { useState } from 'react';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';

type Step = 1 | 2 | 3 | 4;

export default function AddBackup() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

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

  return (
    <div>
      {currentStep === 1 && <Step1 onNext={handleNextStep} />}
      {currentStep === 2 && <Step2 onNext={handleNextStep} onBack={handlePrevStep} />}
      {/* Step 3 and 4 will be added here */}
    </div>
  );
}
