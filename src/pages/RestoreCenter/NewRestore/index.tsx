// NewRestore — 7-step wizard orchestrator for creating a new restore job.
//
// Step flow:
//   1. SelectSource        — cloud source + snapshot / archive entry
//   2. SelectScope         — what to restore (full / object / record / field / SOQL)
//   3. SetDestination      — target org + restore mode
//   4. DefineRestorePolicy — name, description, tags
//   5. ConflictConfig      — conflict rules + CRM automation controls (combined)
//   6. PreviewValidate     — validate plan and preview record counts
//   7. ReviewSubmit        — final review + submit

import { useState } from 'react';
import SelectSource from './SelectSource';
import SelectScope from './SelectScope';
import SetDestination from './SetDestination';
import DefineRestorePolicy from './DefineRestorePolicy';
import ConflictConfig from './ConflictConfig';
import PreviewValidate from './PreviewValidate';
import ReviewSubmit from './ReviewSubmit';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface NewRestoreProps {
  onBack: () => void;
  onComplete: () => void;
  isTemplateMode?: boolean;
}

export default function NewRestore({ onBack, onComplete, isTemplateMode = false }: NewRestoreProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [templateMode, setTemplateMode] = useState(isTemplateMode);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 7) as Step);
  const goBack = () => {
    if (currentStep === 1) { onBack(); return; }
    setCurrentStep((s) => Math.max(s - 1, 1) as Step);
  };

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      {templateMode && (
        <div className='flex-shrink-0 mx-4 mt-4 sm:mx-6 sm:mt-6 flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3'>
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500'>
            <svg viewBox='0 0 24 24' fill='white' className='h-4 w-4'>
              <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><polyline points='14 2 14 8 20 8' /><line x1='16' y1='13' x2='8' y2='13' /><line x1='16' y1='17' x2='8' y2='17' /><polyline points='10 9 9 9 8 9' />
            </svg>
          </div>
          <p className='flex-1 text-sm text-yellow-900'>
            <span className='font-bold'>Creating a Template</span> — at the end, the job is saved as a reusable template instead of running. You can leave anything unspecified and fill it in when you use the template later.
          </p>
          <button
            onClick={() => setTemplateMode(false)}
            className='shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 transition whitespace-nowrap'
          >
            Exit template mode
          </button>
        </div>
      )}
      {currentStep === 1 && <SelectSource onNext={goNext} onBack={goBack} />}
      {currentStep === 2 && <SelectScope onNext={goNext} onBack={goBack} />}
      {currentStep === 3 && <SetDestination onNext={goNext} onBack={goBack} />}
      {currentStep === 4 && <DefineRestorePolicy onNext={(_n, _d, _t) => goNext()} onBack={goBack} />}
      {currentStep === 5 && <ConflictConfig onNext={goNext} onBack={goBack} />}
      {currentStep === 6 && <PreviewValidate onNext={goNext} onBack={goBack} />}
      {currentStep === 7 && <ReviewSubmit onBack={goBack} onComplete={onComplete} />}
    </div>
  );
}
