import { useState } from 'react';
import type { ConnectedPlatform } from '../../../services/platform/platform.service';
import type { Destination } from '../../../services/destination/destination.service';
import type { SelectedArchiveObject } from './Step3';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';

type Step = 1 | 2 | 3 | 4 | 5;

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

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 5) as Step);
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
    </div>
  );
}
