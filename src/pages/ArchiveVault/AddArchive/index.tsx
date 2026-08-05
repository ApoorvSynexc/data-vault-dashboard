// Add Archive Wizard — orchestrates the 6-step flow for creating a new archive policy.
//
// State is lifted here and passed down as props to each step component.
// Steps are conditionally rendered (unmount/remount on navigation), so each
// step's local state resets when navigating away and back.
//
// Step flow:
//   1. SourceDestination — pick Salesforce org + AWS S3 destination
//   2. DefineArchive     — name and describe the policy
//   3. SelectObjects     — choose objects and configure per-object filters/children/schedule
//   4. Schedule          — set the global run schedule (frequency, timezone, time)
//   5. DryRun            — simulate the archive and preview record counts
//   6. Review            — final summary + "ARCHIVE" confirmation before creation

import { useState } from 'react';
import type { ConnectedPlatform } from '../../../services/platform/platform.service';
import type { Destination } from '../../../services/destination/destination.service';
import type { SelectedArchiveObject } from './SelectObjects';
import type { ArchiveScheduleConfig } from './Schedule';
import type { DryRunSummary, DryRunCache } from './DryRun';
import Step1 from './SourceDestination';
import Step2 from './DefineArchive';
import Step3 from './SelectObjects';
import Step3DryRun from './DryRun';
import Step4 from './Schedule';
import Step5 from './Review';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function AddArchive() {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1 — source & destination
  const [selectedConnection, setSelectedConnection] = useState<ConnectedPlatform | null>(null);
  const [selectedDestConnection, setSelectedDestConnection] = useState<Destination | null>(null);

  // Step 2 — define archive
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');

  // Step 3 — selected objects with their per-object filter/child/schedule configs
  const [selectedObjects, setSelectedObjects] = useState<SelectedArchiveObject[]>([]);

  // Step 4 — global schedule + the fully-built archival payload sent to the API
  const [scheduleConfig, setScheduleConfig] = useState<ArchiveScheduleConfig | null>(null);
  const [archivalPayload, setArchivalPayload] = useState<Record<string, unknown> | null>(null);

  // Step 5 — dry run summary (null when user skips dry run)
  const [dryRunSummary, setDryRunSummary] = useState<DryRunSummary | null>(null);
  // Cached dry run results so Back → DryRun restores the previous run
  const [dryRunCache, setDryRunCache] = useState<DryRunCache | null>(null);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 6) as Step);
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1) as Step);

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      {currentStep === 1 && (
        <Step1
          initialSelectedConnection={selectedConnection}
          initialSelectedDestConnection={selectedDestConnection}
          onNext={(conn, dest) => {
            setSelectedConnection(conn);
            setSelectedDestConnection(dest);
            goNext();
          }}
        />
      )}
      {currentStep === 2 && (
        <Step2
          archiveSource={selectedConnection?.name ?? selectedConnection?.crmProfile?.username ?? selectedConnection?.contactEmail ?? selectedConnection?.crmId ?? ''}
          destination={selectedDestConnection?.name || 'AWS S3'}
          initialPolicyName={policyName}
          initialDescription={description}
          onNext={(name, desc) => {
            setPolicyName(name);
            setDescription(desc);
            goNext();
          }}
          onBack={goBack}
        />
      )}
      {currentStep === 3 && (
        <Step3
          crmId={selectedConnection?.crmId ?? null}
          initialSelectedObjects={selectedObjects}
          onNext={(objects) => {
            setSelectedObjects(objects);
            goNext();
          }}
          onBack={goBack}
        />
      )}
      {currentStep === 4 && (
        <Step4
          crmId={selectedConnection?.crmId ?? null}
          destinationId={selectedDestConnection?.destinationId ?? null}
          policyName={policyName}
          description={description}
          selectedObjects={selectedObjects}
          initialScheduleConfig={scheduleConfig}
          onNext={(config, payload) => {
            setScheduleConfig(config);
            setArchivalPayload(payload);
            goNext();
          }}
          onBack={goBack}
        />
      )}
      {currentStep === 5 && (
        <Step3DryRun
          crmId={selectedConnection?.crmId ?? null}
          selectedObjects={selectedObjects}
          archivalPayload={archivalPayload}
          initialCache={dryRunCache}
          onNext={(summary, cache) => {
            if (summary) setDryRunSummary(summary);
            if (cache) setDryRunCache(cache);
            goNext();
          }}
          onBack={goBack}
        />
      )}
      {currentStep === 6 && (
        <Step5
          archivalPayload={archivalPayload}
          dryRunSummary={dryRunSummary}
          crmName={selectedConnection?.name ?? selectedConnection?.crmProfile?.username ?? selectedConnection?.contactEmail ?? selectedConnection?.organizationId ?? 'Salesforce Production'}
          crmConnectionName={selectedConnection?.name ?? selectedConnection?.crmProfile?.username ?? selectedConnection?.contactEmail ?? selectedConnection?.crmId ?? 'Salesforce Org'}
          destinationProvider={selectedDestConnection?.provider ?? 'AWS S3'}
          destinationName={selectedDestConnection?.name ?? 'Production Bucket'}
          policyName={policyName}
          description={description}
          selectedObjects={selectedObjects}
          scheduleConfig={scheduleConfig}
          onUpdateObjectSchedule={(objectId, schedule) => {
            setSelectedObjects((prev) => prev.map((o) =>
              (o.uuid ?? o.id) === objectId ? { ...o, scheduleConfig: schedule } : o
            ));
            // Patch archivalPayload.objects so the API call uses the updated schedule
            setArchivalPayload((prev) => {
              if (!prev) return prev;
              const objects = (prev.objects as any[]) ?? [];
              return {
                ...prev,
                objects: objects.map((o: any) =>
                  o.id === objectId
                    ? { ...o, ...(schedule ? { scheduleConfig: schedule } : { scheduleConfig: undefined }) }
                    : o
                ),
              };
            });
          }}
          onBack={goBack}
          onEditStep={(step) => setCurrentStep(step as 1 | 2 | 3 | 4 | 5 | 6)}
        />
      )}
    </div>
  );
}
