import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettingsService, type StandardObject } from '../../services/settings/settings.service';
import { useCrmMetadataService, type CrmMetadataObject } from '../../services/crm-metadata/crm-metadata.service';
import PermissionGate from '../../components/PermissionGate';

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type='button'
      onClick={() => onChange(!checked)}
      className='relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200'
      style={{ background: checked ? '#155DFC' : '#d1d5db' }}
    >
      <span
        className='pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200'
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
      <div className='px-6 py-4 border-b border-gray-100'>
        <p className='text-sm font-semibold text-gray-900'>{title}</p>
        {desc && <p className='text-xs text-gray-400 mt-0.5'>{desc}</p>}
      </div>
      <div className='px-6 py-4'>{children}</div>
    </div>
  );
}

// ── Setting row ───────────────────────────────────────────────────────────────

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-6 py-3 border-b border-gray-50 last:border-0'>
      <div className='min-w-0'>
        <p className='text-sm text-gray-700 font-medium'>{label}</p>
        {hint && <p className='text-xs text-gray-400 mt-0.5'>{hint}</p>}
      </div>
      <div className='shrink-0'>{children}</div>
    </div>
  );
}

const inputCls = 'h-8 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20 bg-white w-28 text-right';
const selectCls = 'h-8 rounded-lg border border-gray-200 px-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20 bg-white w-32';

// ── Standard Objects ──────────────────────────────────────────────────────────

function AddObjectInput({ existing, onAdd }: { existing: StandardObject[]; onAdd: (name: string) => void }) {
  const crmMetadataService = useCrmMetadataService();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: crmObjects = [], isFetching } = useQuery<CrmMetadataObject[]>({
    queryKey: ['crm-metadata-objects-settings'],
    queryFn: async () => {
      const res = await crmMetadataService.getObjectList('backup');
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    },
  });

  const existingNames = new Set(existing.map((o) => o.name.toLowerCase()));

  const filtered = crmObjects.filter((o) => {
    if (o.custom) return false;
    if (existingNames.has(o.name.toLowerCase())) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.name.toLowerCase().includes(q) || o.label?.toLowerCase().includes(q);
  });

  function handleSelect(obj: CrmMetadataObject) {
    setError('');
    setSearch('');
    setOpen(false);
    onAdd(obj.name);
  }

  // close dropdown on outside click
  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <div className='flex flex-col gap-1.5' ref={containerRef} onBlur={handleBlur}>
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); setError(''); }}
            onFocus={() => setOpen(true)}
            placeholder={isFetching ? 'Loading objects…' : 'Search by name or label…'}
            disabled={isFetching}
            className='h-8 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/20 bg-white disabled:opacity-60'
          />
          {open && !isFetching && (
            <div className='absolute left-0 bottom-9 z-50 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden'>
              {filtered.length === 0 ? (
                <p className='px-3 py-2.5 text-xs text-gray-400'>No objects found</p>
              ) : (
                <ul className='max-h-52 overflow-y-auto divide-y divide-gray-50'>
                  {filtered.map((obj) => (
                    <li key={obj.name}>
                      <button
                        type='button'
                        tabIndex={0}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(obj); }}
                        className='flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-blue-50 transition-colors'
                      >
                        <span className='text-sm text-gray-800 font-medium truncate'>{obj.name}</span>
                        {obj.label && obj.label !== obj.name && (
                          <span className='text-xs text-gray-400 shrink-0 truncate max-w-[40%]'>{obj.label}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      {error
        ? <p className='text-xs text-red-500'>{error}</p>
        : <p className='text-xs text-gray-400'>Select from your connected Salesforce objects.</p>
      }
    </div>
  );
}

function StandardObjectsSection({
  objects, onAdd, onRemove, saving,
}: {
  objects: StandardObject[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  saving: boolean;
}) {
  const customCount = objects.filter((o) => !o.isDefault).length;

  return (
    <div className='bg-white rounded-xl border border-gray-200 shadow-sm'>
      {/* Header */}
      <div className='px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 rounded-t-xl overflow-hidden'>
        <div>
          <p className='text-sm font-semibold text-gray-900'>Standard Objects</p>
          <p className='text-xs text-gray-400 mt-0.5'>
            Only these objects appear in Backup and Archive flows. Default objects cannot be removed.
          </p>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          {customCount > 0 && (
            <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100'>
              {customCount} added
            </span>
          )}
          <span className='text-xs text-gray-400'>{objects.length} total</span>
        </div>
      </div>

      {/* Object list */}
      <div className='divide-y divide-gray-50 overflow-hidden'>
        {objects.map((obj) => (
          <div key={obj.name} className='flex items-center justify-between gap-3 px-6 py-2.5 hover:bg-gray-50/60 transition-colors'>
            <div className='flex items-center gap-3 min-w-0'>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                obj.isDefault
                  ? 'bg-gray-50 text-gray-400 border-gray-200'
                  : 'bg-blue-50 text-blue-500 border-blue-100'
              }`}>
                {obj.isDefault ? 'DEFAULT' : 'CUSTOM'}
              </span>
              <span className='text-sm text-gray-700 font-medium truncate'>{obj.name}</span>
            </div>
            {!obj.isDefault && (
              <PermissionGate permission='settings.write'>
                <button
                  onClick={() => onRemove(obj.name)}
                  disabled={saving}
                  className='text-gray-300 hover:text-red-400 transition-colors text-xs shrink-0 disabled:opacity-40 p-1'
                  title='Remove'
                >
                  ✕
                </button>
              </PermissionGate>
            )}
          </div>
        ))}
      </div>

      {/* Add row — overflow visible so dropdown is not clipped */}
      <PermissionGate permission='settings.write'>
        <div className='px-6 py-4 border-t border-gray-100 bg-gray-50/40 rounded-b-xl relative'>
          <p className='text-xs font-semibold text-gray-500 mb-2'>Add object by API name</p>
          <AddObjectInput existing={objects} onAdd={onAdd} />
        </div>
      </PermissionGate>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const settingsService = useSettingsService();
  const queryClient     = useQueryClient();
  const [notifEmail, setNotifEmail] = useState(true);

  const { data: settingsResp } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => settingsService.getSettings(),
  });

  const objects: StandardObject[] = settingsResp?.data?.standardObjects ?? [];

  const addMutation = useMutation({
    mutationFn: (name: string) => settingsService.addStandardObject(name),
    onSuccess: () => queryClient.refetchQueries({ queryKey: ['settings'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (name: string) => settingsService.removeStandardObject(name),
    onSuccess: () => queryClient.refetchQueries({ queryKey: ['settings'] }),
  });

  return (
    <div className='flex flex-col gap-6 p-4 sm:p-6 w-full'>

      {/* Page header */}
      <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm'>
        <div>
          <h2 className='text-lg font-bold text-gray-900'>Settings</h2>
          <p className='mt-0.5 text-sm text-gray-500'>Configure defaults, approvals, notifications, and compliance rules</p>
        </div>
      </div>

      {/* Top row — 3 sections side by side */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>

        <Section title='Performance' desc='API usage and job behaviour'>
          <SettingRow label='API guard threshold' hint='Auto-pause when daily limit hits this %'>
            <input type='number' className={inputCls} defaultValue={80} />
          </SettingRow>
        </Section>

        <Section title='Rollback & Retention' desc='Data recovery window'>
          <SettingRow label='Rollback window'>
            <select className={selectCls} defaultValue='14'>
              <option value='7'>7 days</option>
              <option value='14'>14 days</option>
              <option value='30'>30 days</option>
            </select>
          </SettingRow>
        </Section>

        <Section title='Notifications' desc='Alert delivery channels'>
          <SettingRow label='Email alerts'>
            <Toggle checked={notifEmail} onChange={setNotifEmail} />
          </SettingRow>
        </Section>

      </div>

      {/* Standard Objects — full width */}
      <StandardObjectsSection
        objects={objects}
        onAdd={(name) => addMutation.mutate(name)}
        onRemove={(name) => removeMutation.mutate(name)}
        saving={addMutation.isPending || removeMutation.isPending}
      />

    </div>
  );
}
