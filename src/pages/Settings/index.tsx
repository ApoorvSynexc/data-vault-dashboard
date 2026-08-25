import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettingsService, type StandardObject } from '../../services/settings/settings.service';

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

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className='flex items-center justify-between gap-4 py-2.5 border-b border-gray-50 last:border-0'>
      <div className='min-w-0'>
        <p className='text-sm font-medium text-gray-800'>{label}</p>
        {desc && <p className='text-xs text-gray-400 mt-0.5'>{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='px-5 py-3 border-b border-gray-100 flex items-center justify-between'>
        <h3 className='text-sm font-semibold text-gray-800'>{title}</h3>
        {action}
      </div>
      <div className='px-5 py-4 flex flex-col'>
        {children}
      </div>
    </div>
  );
}

function FormGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-1 py-2.5 border-b border-gray-50 last:border-0'>
      <label className='text-xs font-semibold text-gray-500'>{label}</label>
      {children}
      {hint && <p className='text-[11px] text-gray-400'>{hint}</p>}
    </div>
  );
}

const inputCls = 'h-8 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/30 bg-white';
const selectCls = 'h-8 w-full rounded-lg border border-gray-200 px-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/30 bg-white';

// ── Object tag ────────────────────────────────────────────────────────────────

function ObjectTag({ obj, onRemove, disabled }: { obj: StandardObject; onRemove: () => void; disabled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 pl-3 py-1 rounded-full text-sm font-medium transition-colors ${
      obj.isDefault
        ? 'pr-3 bg-gray-100 text-gray-600'
        : 'pr-2 bg-blue-50 text-blue-700'
    }`}>
      {obj.name}
      {!obj.isDefault && (
        <button
          onClick={onRemove}
          disabled={disabled}
          className='flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-700 transition-colors text-xs disabled:opacity-40'
          title='Remove'
        >
          ✕
        </button>
      )}
    </span>
  );
}

// ── Add object input ──────────────────────────────────────────────────────────

function AddObjectInput({
  existing,
  onAdd,
  saving,
}: {
  existing: StandardObject[];
  onAdd: (name: string) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = value.trim();
  const alreadyIn = existing.some((o) => o.name.toLowerCase() === trimmed.toLowerCase());

  function submit() {
    if (!trimmed) return;
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(trimmed)) {
      setError('Invalid API name — letters, numbers, and underscores only.');
      return;
    }
    if (alreadyIn) {
      setError('Already in the list.');
      return;
    }
    setError('');
    onAdd(trimmed);
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex gap-2'>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder='e.g. ServiceContract'
          className={`${inputCls} flex-1`}
        />
        <button
          onClick={submit}
          disabled={saving || !trimmed}
          className='h-8 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors'
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
      {error
        ? <p className='text-xs text-red-500'>{error}</p>
        : <p className='text-[11px] text-gray-400'>Enter the Salesforce API name of the object to add.</p>
      }
    </div>
  );
}

// ── Standard Objects card ─────────────────────────────────────────────────────

function StandardObjectsCard({
  objects,
  onAdd,
  onRemove,
  saving,
}: {
  objects: StandardObject[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  saving: boolean;
}) {
  const customCount = objects.filter((o) => !o.isDefault).length;

  return (
    <Card
      title='Standard Objects'
      action={
        <div className='flex items-center gap-3'>
          <span className='text-xs text-gray-400'>{objects.length} total</span>
          {customCount > 0 && (
            <span className='text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full'>
              {customCount} custom added
            </span>
          )}
        </div>
      }
    >
      <div className='flex flex-col gap-4'>
        <p className='text-xs text-gray-500'>
          Only these objects appear in Backup and Archive configuration flows.
          Default objects cannot be removed. Custom-added objects are shown in blue.
        </p>

        {/* Tag cloud */}
        <div className='flex flex-wrap gap-2'>
          {objects.map((obj) => (
            <ObjectTag
              key={obj.name}
              obj={obj}
              onRemove={() => onRemove(obj.name)}
              disabled={saving}
            />
          ))}
        </div>

        {/* Add */}
        <div className='border-t border-gray-100 pt-3'>
          <p className='text-xs font-semibold text-gray-500 mb-2'>Add object</p>
          <AddObjectInput existing={objects} onAdd={onAdd} saving={saving} />
        </div>
      </div>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

  function handleAdd(name: string) {
    addMutation.mutate(name);
  }

  function handleRemove(name: string) {
    removeMutation.mutate(name);
  }

  return (
    <div className='flex flex-col gap-5 p-4 sm:p-6 w-full'>

      <div className='flex items-center justify-between gap-4 flex-wrap'>
        <div>
          <h1 className='text-base font-bold text-gray-900'>Settings</h1>
          <p className='text-sm text-gray-500 mt-0.5'>Configure defaults, approvals, notifications, and compliance rules</p>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
        <div className='flex flex-col gap-5'>
          <Card title='Performance'>
            <FormGroup label='API guard threshold (%)' hint='Auto-pause retrieval when daily API limit hits this %'>
              <input type='number' className={inputCls} defaultValue={80} />
            </FormGroup>
          </Card>
        </div>

        <div className='flex flex-col gap-5'>
          <Card title='Rollback & Retention'>
            <FormGroup label='Rollback window (days)'>
              <select className={selectCls} defaultValue='14'>
                <option value='7'>7 days</option>
                <option value='14'>14 days</option>
                <option value='30'>30 days</option>
              </select>
            </FormGroup>
          </Card>

          <Card title='Notification Channels'>
            <ToggleRow label='Email' checked={notifEmail} onChange={setNotifEmail} />
          </Card>
        </div>
      </div>

      <StandardObjectsCard
        objects={objects}
        onAdd={handleAdd}
        onRemove={handleRemove}
        saving={addMutation.isPending || removeMutation.isPending}
      />
    </div>
  );
}
