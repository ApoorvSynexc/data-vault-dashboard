import { useState } from 'react';
import type { ConnectedPlatform } from '../../../services/platform/platform.service';
import type { Destination } from '../../../services/destination/destination.service';
import type { SelectedArchiveObject } from './SelectObjects';
import type { ArchiveScheduleConfig } from './Schedule';
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

  // Step 3 — select objects
  const [selectedObjects, setSelectedObjects] = useState<SelectedArchiveObject[]>([]);

  // Step 5 — schedule (was step 4)
  const [scheduleConfig, setScheduleConfig] = useState<ArchiveScheduleConfig | null>(null);
  const [archivalPayload, setArchivalPayload] = useState<Record<string, unknown> | null>(null);

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
          archiveSource={selectedConnection?.name || selectedConnection?.crmProfile?.name || 'Salesforce Production'}
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
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 6 && (
        <Step5
          archivalPayload={archivalPayload}
          crmName={selectedConnection?.crmProfile?.name ?? selectedConnection?.name ?? 'Salesforce Production'}
          crmConnectionName={selectedConnection?.name ?? 'Salesforce Org'}
          destinationProvider={selectedDestConnection?.provider ?? 'AWS S3'}
          destinationName={selectedDestConnection?.name ?? 'Production Bucket'}
          policyName={policyName}
          description={description}
          selectedObjects={selectedObjects}
          scheduleConfig={scheduleConfig}
          onBack={goBack}
          onEditStep={(step) => setCurrentStep(step as 1 | 2 | 3 | 4 | 5 | 6)}
        />
      )}
    </div>
  );
}
