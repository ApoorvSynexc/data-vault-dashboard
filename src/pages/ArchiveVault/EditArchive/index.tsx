import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useArchivalService } from '../../../services/archival/archival.service';
import { usePlatformService } from '../../../services/platform/platform.service';
import { useDestinationService } from '../../../services/destination/destination.service';
import type { ConnectedPlatform } from '../../../services/platform/platform.service';
import type { Destination } from '../../../services/destination/destination.service';
import type { SelectedArchiveObject } from '../AddArchive/SelectObjects';
import type { ArchiveScheduleConfig } from '../AddArchive/Schedule';
import type { DryRunSummary } from '../AddArchive/DryRun';
import Step2 from '../AddArchive/DefineArchive';
import Step3 from '../AddArchive/SelectObjects';
import Step4 from '../AddArchive/Schedule';
import Step3DryRun from '../AddArchive/DryRun';
import Step5 from '../AddArchive/Review';

// Edit always starts at step 2 — CRM and destination are locked for existing configs.
// Step numbering is kept identical to AddArchive so the ProgressBar and onEditStep
// callbacks stay consistent; we simply never render step 1.
type Step = 2 | 3 | 4 | 5 | 6;

function mapConfigToSelectedObjects(configObjects: any[]): SelectedArchiveObject[] {
  if (!Array.isArray(configObjects)) return [];
  return configObjects.map((obj: any) => ({
    uuid: obj.id ?? obj.uuid ?? crypto.randomUUID(),
    id: obj.name,
    name: obj.name,
    type: (obj.type as 'STANDARD' | 'CUSTOM') ?? 'STANDARD',
    scheduleConfig: obj.scheduleConfig ?? undefined,
    archivalPayload: {
      name: obj.name,
      condition: obj.condition ?? { type: 'AND' },
      field: (obj.field ?? []).map((f: any) => ({
        name: f.name,
        dataType: f.dataType ?? 'STRING',
        filter: { value: f.filter?.value ?? '', operator: f.filter?.operator ?? '=' },
      })),
      children: obj.children ?? [],
    },
  }));
}

// Returns true when every object in the config has a "ONCE" per-object schedule,
// OR the top-level scheduleConfig (if present) is ONCE. These configs cannot be edited.
function isConfigOneTime(config: any): boolean {
  const objects: any[] = config.objects ?? [];
  if (objects.length === 0) return false;
  const allObjectsOneTime = objects.every(
    (o) => o.scheduleConfig?.scheduling?.frequency === 'ONCE'
  );
  if (allObjectsOneTime) return true;
  // Fall back to top-level schedule if no per-object schedule
  const topFreq = config.scheduleConfig?.scheduling?.frequency;
  return topFreq === 'ONCE';
}

export default function EditArchive() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const archivalService = useArchivalService();
  const platformService = usePlatformService();
  const destinationService = useDestinationService();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [oneTimeBlocked, setOneTimeBlocked] = useState(false);
  const [backupConfigId, setBackupConfigId] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>(2);

  const [selectedConnection, setSelectedConnection] = useState<ConnectedPlatform | null>(null);
  const [selectedDestConnection, setSelectedDestConnection] = useState<Destination | null>(null);
  const [policyName, setPolicyName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedObjects, setSelectedObjects] = useState<SelectedArchiveObject[]>([]);
  const [scheduleConfig, setScheduleConfig] = useState<ArchiveScheduleConfig | null>(null);
  const [archivalPayload, setArchivalPayload] = useState<Record<string, unknown> | null>(null);
  const [dryRunSummary, setDryRunSummary] = useState<DryRunSummary | null>(null);

  useEffect(() => {
    if (!slug) { navigate('/archive-vault'); return; }

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setOneTimeBlocked(false);

        const [configRes, platformsRes, destinationsRes] = await Promise.all([
          archivalService.getDetail(slug),
          platformService.getConnectedPlatforms(),
          destinationService.listDestinations(),
        ]);

        const config = configRes?.data ?? configRes;
        if (!config) throw new Error('Config not found');

        // Block editing one-time archives — they have already run or are scheduled
        // to run once; changing filters/schedule after the fact is not meaningful.
        if (isConfigOneTime(config)) {
          setOneTimeBlocked(true);
          return;
        }

        setBackupConfigId(config.backupConfigId ?? config.id ?? '');
        setPolicyName(config.name ?? '');
        setDescription(config.description ?? '');

        const platforms: ConnectedPlatform[] = Array.isArray(platformsRes)
          ? platformsRes
          : ((platformsRes as any)?.data ?? []);
        setSelectedConnection(platforms.find((p) => p.crmId === config.crmId) ?? null);

        const destinations: Destination[] = Array.isArray(destinationsRes)
          ? destinationsRes
          : ((destinationsRes as any)?.data ?? []);
        setSelectedDestConnection(destinations.find((d) => d.destinationId === config.destinationId) ?? null);

        const objects = mapConfigToSelectedObjects(config.objects ?? []);
        setSelectedObjects(objects);

        // Use the global scheduleConfig if present; otherwise take the first
        // per-object schedule as the representative value for the Schedule step.
        const globalSchedule = config.scheduleConfig ?? null;
        const firstPerObject = (config.objects ?? []).find((o: any) => o.scheduleConfig)?.scheduleConfig ?? null;
        setScheduleConfig(globalSchedule ?? firstPerObject);
      } catch (err: any) {
        setLoadError(err?.message ?? 'Failed to load archival config');
      } finally {
        setLoading(false);
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 6) as Step);
  // Step 2 "Back" goes to the archive list — step 1 (CRM/dest) is not editable
  const goBack = (step?: Step) => {
    if (step !== undefined) { setCurrentStep(step); return; }
    setCurrentStep((s) => (s <= 2 ? 2 : Math.max(s - 1, 2) as Step));
  };

  if (loading) {
    return (
      <div className='flex-1 min-h-0 flex flex-col items-center justify-center gap-3'>
        <svg className='animate-spin h-8 w-8 text-blue-600' fill='none' viewBox='0 0 24 24'>
          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8H4z' />
        </svg>
        <p className='text-sm text-gray-500'>Loading archival config…</p>
      </div>
    );
  }

  if (oneTimeBlocked) {
    return (
      <div className='flex-1 min-h-0 flex flex-col items-center justify-center gap-4'>
        <div className='rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-center max-w-md'>
          <p className='text-base font-semibold text-amber-800 mb-1'>Cannot edit a one-time archive</p>
          <p className='text-sm text-amber-700'>
            This archive is configured to run once. One-time archives cannot be edited after they are created.
          </p>
        </div>
        <Link to='/archive-vault' className='text-sm text-blue-600 hover:underline'>← Back to Archive Vault</Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className='flex-1 min-h-0 flex flex-col items-center justify-center gap-4'>
        <div className='rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-center max-w-md'>
          <p className='text-sm font-semibold text-red-700 mb-1'>Failed to load config</p>
          <p className='text-sm text-red-600'>{loadError}</p>
        </div>
        <Link to='/archive-vault' className='text-sm text-blue-600 hover:underline'>← Back to Archive Vault</Link>
      </div>
    );
  }

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      {currentStep === 2 && (
        <Step2
          archiveSource={selectedConnection?.name || selectedConnection?.crmProfile?.name || 'Salesforce Production'}
          destination={selectedDestConnection?.name || 'AWS S3'}
          initialPolicyName={policyName}
          initialDescription={description}
          onNext={(name, desc) => { setPolicyName(name); setDescription(desc); goNext(); }}
          onBack={() => navigate('/archive-vault')}
        />
      )}
      {currentStep === 3 && (
        <Step3
          crmId={selectedConnection?.crmId ?? null}
          initialSelectedObjects={selectedObjects}
          onNext={(objects) => { setSelectedObjects(objects); goNext(); }}
          onBack={() => goBack(2)}
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
          editMode
          onNext={(config, payload) => { setScheduleConfig(config); setArchivalPayload(payload); goNext(); }}
          onBack={() => { setSelectedObjects([]); goBack(3); }}
        />
      )}
      {currentStep === 5 && (
        <Step3DryRun
          crmId={selectedConnection?.crmId ?? null}
          selectedObjects={selectedObjects}
          archivalPayload={archivalPayload}
          onNext={(summary) => { if (summary) setDryRunSummary(summary); goNext(); }}
          onBack={() => goBack(4)}
        />
      )}
      {currentStep === 6 && (
        <Step5
          archivalPayload={archivalPayload}
          dryRunSummary={dryRunSummary}
          crmName={selectedConnection?.crmProfile?.name ?? selectedConnection?.name ?? 'Salesforce Production'}
          crmConnectionName={selectedConnection?.name ?? 'Salesforce Org'}
          destinationProvider={selectedDestConnection?.provider ?? 'AWS S3'}
          destinationName={selectedDestConnection?.name ?? 'Production Bucket'}
          policyName={policyName}
          description={description}
          selectedObjects={selectedObjects}
          scheduleConfig={scheduleConfig}
          onBack={() => goBack(5)}
          onEditStep={(step) => setCurrentStep(step as Step)}
          editMode
          backupConfigId={backupConfigId}
        />
      )}
    </div>
  );
}
