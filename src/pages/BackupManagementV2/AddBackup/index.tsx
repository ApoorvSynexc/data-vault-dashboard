import { useState, useEffect } from 'react';
import Step1 from './steps/Step1';
import Step2 from './steps/Step2';
import { useAppDispatch } from '../../../store/hooks';
import { fetchDestinations } from '../../../store/slices/destinationsSlice';

type Step = 1 | 2 | 3 | 4;

export default function AddBackup() {
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState<Step>(1);

  useEffect(() => {
    dispatch(fetchDestinations());
  }, [dispatch]);

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  return (
    <div>
      {currentStep === 1 && <Step1 onNext={handleNextStep} />}
      {currentStep === 2 && <Step2 onNext={handleNextStep} />}
      {/* Step 3 and 4 will be added here */}
    </div>
  );
}
