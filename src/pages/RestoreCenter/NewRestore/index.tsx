// NewRestore — 8-step wizard orchestrator for creating a new restore job.
//
// Step flow:
//   1. SelectSource        — cloud source + snapshot / archive entry
//   2. SelectScope         — what to restore (full / object / record / field / SOQL)
//   3. SetDestination      — target org + restore mode
//   4. DefineRestorePolicy — name, description, tags
//   5. ConflictConfig      — conflict rules and automation settings
//   6. Automation          — (placeholder)
//   7. PreviewValidate     — validate plan and preview record counts
//   8. ReviewSubmit        — final review + submit

import { useState } from 'react';
import SelectSource from './SelectSource';
import SelectScope from './SelectScope';
import SetDestination from './SetDestination';
import DefineRestorePolicy from './DefineRestorePolicy';
import ConflictConfig from './ConflictConfig';
import PreviewValidate from './PreviewValidate';
import ReviewSubmit from './ReviewSubmit';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface NewRestoreProps {
  onBack: () => void;
  onComplete: () => void;
}

export default function NewRestore({ onBack, onComplete }: NewRestoreProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 8) as Step);
  const goBack = () => {
    if (currentStep === 1) { onBack(); return; }
    setCurrentStep((s) => Math.max(s - 1, 1) as Step);
  };

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      {currentStep === 1 && <SelectSource onNext={goNext} onBack={goBack} />}
      {currentStep === 2 && <SelectScope onNext={goNext} onBack={goBack} />}
      {currentStep === 3 && <SetDestination onNext={goNext} onBack={goBack} />}
      {currentStep === 4 && <DefineRestorePolicy onNext={(_n, _d, _t) => goNext()} onBack={goBack} />}
      {currentStep === 5 && <ConflictConfig onNext={goNext} onBack={goBack} />}
      {currentStep === 6 && <PreviewValidate onNext={goNext} onBack={goBack} />}
      {currentStep === 7 && <PreviewValidate onNext={goNext} onBack={goBack} />}
      {currentStep === 8 && <ReviewSubmit onBack={goBack} onComplete={onComplete} />}
    </div>
  );
}
