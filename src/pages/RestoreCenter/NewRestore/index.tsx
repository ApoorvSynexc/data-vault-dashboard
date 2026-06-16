// NewRestore — 6-step wizard orchestrator for creating a new restore job.
//
// Step flow:
//   1. SelectSource    — pick backup or archive snapshot as the source
//   2. SelectScope     — choose what to restore (full / object-level / record-level / by-field / SOQL)
//   3. SetDestination  — pick target org + restore mode (overwrite / insert-only / sandbox)
//   4. ConflictConfig  — configure conflict rules and automation settings
//   5. PreviewValidate — validate the restore plan and preview record counts
//   6. ReviewSubmit    — final review + submit to run

import { useState } from 'react';
import SelectSource from './SelectSource';
import SelectScope from './SelectScope';
import SetDestination from './SetDestination';
import ConflictConfig from './ConflictConfig';
import PreviewValidate from './PreviewValidate';
import ReviewSubmit from './ReviewSubmit';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface NewRestoreProps {
  onBack: () => void;
  onComplete: () => void;
}

export default function NewRestore({ onBack, onComplete }: NewRestoreProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 6) as Step);
  const goBack = () => {
    if (currentStep === 1) { onBack(); return; }
    setCurrentStep((s) => Math.max(s - 1, 1) as Step);
  };

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      {currentStep === 1 && <SelectSource onNext={goNext} onBack={goBack} />}
      {currentStep === 2 && <SelectScope onNext={goNext} onBack={goBack} />}
      {currentStep === 3 && <SetDestination onNext={goNext} onBack={goBack} />}
      {currentStep === 4 && <ConflictConfig onNext={goNext} onBack={goBack} />}
      {currentStep === 5 && <PreviewValidate onNext={goNext} onBack={goBack} />}
      {currentStep === 6 && <ReviewSubmit onBack={goBack} onComplete={onComplete} />}
    </div>
  );
}
