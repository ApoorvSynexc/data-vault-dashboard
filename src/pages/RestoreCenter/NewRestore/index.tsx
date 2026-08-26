// NewRestore — 9-step wizard orchestrator for creating a new restore job.
//
// Step flow:
//   1. SelectSource        — cloud source (storage platform + connection)
//   2. SelectSourceType    — source type (backup snapshot / archive vault) + sub-picker
//   3. SelectScope         — what to restore (full / object / record / field / SOQL)
//   4. SetDestination      — target org + restore mode
//   5. DefineRestorePolicy — name, description, tags
//   6. ConflictConfig      — conflict rules + CRM automation controls (combined)
//   7. EdgeCases           — edge case handling + field defaults
//   8. PreviewValidate     — validate plan and preview record counts
//   9. ReviewSubmit        — final review + submit

import { useState } from 'react';
import SelectSource from './SelectSource';
import SelectSourceType from './SelectSourceType';
import SelectScope from './SelectScope';
import SetDestination from './SetDestination';
import DefineRestorePolicy from './DefineRestorePolicy';
import ConflictConfig from './ConflictConfig';
import EdgeCases from './EdgeCases';
import PreviewValidate from './PreviewValidate';
import ReviewSubmit from './ReviewSubmit';
import type { Destination } from '../../../services/destination/destination.service';
import type { SourceSelection } from './SelectSourceType';
import type { RestoreRetrievePayload, RestoreScope } from '../../../services/restore/restore.service';
import type { ConflictOutput } from './ConflictConfig';
import { toUTCISOString } from '../../../utils';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// The objects a restore scope touches, when the scope shape says so directly.
// ALL/CHANGE_SINCE/DELETED_ONLY/INSERTS_ONLY carry no explicit per-object
// list — undefined lets the backend resolve every restorable object itself
// (see fetch-missing-record-types), same as an ENTIRE restore already does
// for object-level record counts.
const scopeObjectApiNames = (scope: RestoreScope): string[] | undefined => {
  switch (scope.type) {
    case 'OBJECT': return scope.objects;
    case 'RECORD': return Array.from(new Set(scope.records.map((r) => r.objectName)));
    case 'FIELD': return Array.from(new Set(scope.fields.map((f) => f.objectName)));
    case 'FILTER': return Array.from(new Set(scope.filters.map((f) => f.objectName)));
    case 'BULK_CSV': return Array.from(new Set(scope.bulkCsvIds.map((b) => b.objectName)));
    default: return undefined;
  }
};

interface NewRestoreProps {
  onBack: () => void;
  onComplete: () => void;
  isTemplateMode?: boolean;
}

const INITIAL_PAYLOAD: RestoreRetrievePayload = {
  source: { backupConfigId: '', backupJobIds: [] },
  selection: { restoreScope: { type: 'ALL' } },
  destination: { type: 'SAME' },
  conflict: { restoreMode: 'OVERWRITE' },
  schedule: { type: 'ONE_TIME', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
};

export default function NewRestore({ onBack, onComplete, isTemplateMode = false }: NewRestoreProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [templateMode, setTemplateMode] = useState(isTemplateMode);
  const [selectedConnection, setSelectedConnection] = useState<Destination | null>(null);
  const [sourceSelection, setSourceSelection] = useState<SourceSelection>({ configType: 'BACKUP', backupConfigId: '', backupJobIds: [], crmId: '' });
  const [restorePayload, setRestorePayload] = useState<RestoreRetrievePayload>(INITIAL_PAYLOAD);

  const updatePayload = (patch: Partial<RestoreRetrievePayload>) =>
    setRestorePayload((prev) => ({ ...prev, ...patch }));

  // Persist step-2 sub-phase so Back from step 3 lands on jobs table, not config list
  const [dryRunStats, setDryRunStats] = useState<{ insertCount: number; updateCount: number; totalRowsRaw: number } | undefined>(undefined);

  const [step2BackupJobsPhase, setStep2BackupJobsPhase] = useState(false);
  const [step2ArchivalJobsPhase, setStep2ArchivalJobsPhase] = useState(false);

  // Shared state for conditional UI across steps
  const [scopeMode, setScopeMode] = useState<string>('full');

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 9) as Step);
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
      <div className={currentStep === 1 ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        <SelectSource
          onNext={goNext}
          onBack={goBack}
          onConnectionSelected={setSelectedConnection}
        />
      </div>
      <div className={currentStep === 2 ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        <SelectSourceType
          onNext={(sel) => {
            setSourceSelection(sel);
            const source = sel.type === 'CHANGED_BETWEEN'
              ? { backupConfigId: sel.backupConfigId, configType: sel.configType, backupJobIds: sel.backupJobIds, type: sel.type, ...(sel.startDate ? { startDate: toUTCISOString(sel.startDate) } : {}), ...(sel.endDate ? { endDate: toUTCISOString(sel.endDate) } : {}) }
              : { backupConfigId: sel.backupConfigId, configType: sel.configType, type: sel.type };
            updatePayload({ source });
            goNext();
          }}
          onBack={goBack}
          selectedConnection={selectedConnection}
          initialBackupJobsPhase={step2BackupJobsPhase}
          initialArchivalJobsPhase={step2ArchivalJobsPhase}
          onBackupJobsPhaseChange={setStep2BackupJobsPhase}
          onArchivalJobsPhaseChange={setStep2ArchivalJobsPhase}
        />
      </div>
      <div className={currentStep === 3 ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        <SelectScope onNext={(scope, mode) => { setScopeMode(mode); updatePayload({ selection: { restoreScope: scope } }); goNext(); }} onBack={goBack} sourceSelection={sourceSelection} />
      </div>
      <div className={currentStep === 4 ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        <SetDestination onNext={goNext} onBack={goBack} backupConfigId={sourceSelection.backupConfigId} configType={sourceSelection.configType} crmName={sourceSelection.crmName} crmUsername={sourceSelection.crmUsername} />
      </div>
      <div className={currentStep === 5 ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        <DefineRestorePolicy
          onNext={(jobDetail) => { updatePayload({ jobDetail: { name: jobDetail.name, description: jobDetail.description, tags: jobDetail.tags } }); goNext(); }}
          onBack={goBack}
          crmName={sourceSelection.crmName}
          crmUsername={sourceSelection.crmUsername}
          connectionName={selectedConnection?.name}
        />
      </div>
      <div className={currentStep === 6 ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        <ConflictConfig
          onNext={(conflict: ConflictOutput) => {
            updatePayload({
              conflict: {
                ...restorePayload.conflict,
                restoreMode: conflict.restoreMode as RestoreRetrievePayload['conflict']['restoreMode'],
                ...(conflict.mergeRule ? { mergeRule: conflict.mergeRule } : {}),
              },
            });
            goNext();
          }}
          onBack={goBack}
          scopeMode={scopeMode}
        />
      </div>
      <div className={currentStep === 7 ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        <EdgeCases
          onNext={(edgeCases) => {
            updatePayload({ conflict: { ...restorePayload.conflict, edgeCases } });
            goNext();
          }}
          onBack={goBack}
          backupConfigId={sourceSelection.backupConfigId}
          configType={sourceSelection.configType}
          destinationCrmId={restorePayload.destination.crmId || sourceSelection.crmId}
          scopeObjectApiNames={scopeObjectApiNames(restorePayload.selection.restoreScope)}
        />
      </div>
      {currentStep === 8 && <PreviewValidate onNext={(stats) => { setDryRunStats(stats); goNext(); }} onBack={goBack} sourceSelection={sourceSelection} restorePayload={restorePayload} />}
      {currentStep === 9 && <ReviewSubmit onBack={goBack} onComplete={onComplete} restorePayload={restorePayload} updatePayload={updatePayload} dryRunStats={dryRunStats} sourceSelection={sourceSelection} selectedConnection={selectedConnection} />}
    </div>
  );
}
