// Settings — matches HTML reference screen-settings

import { useState } from 'react';

// ── Toggle component ──────────────────────────────────────────────────────────

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

// ── ToggleRow ─────────────────────────────────────────────────────────────────

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='px-5 py-3 border-b border-gray-100'>
        <h3 className='text-sm font-semibold text-gray-800'>{title}</h3>
      </div>
      <div className='px-5 py-3 flex flex-col'>
        {children}
      </div>
    </div>
  );
}

// ── FormGroup ─────────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings() {

  // Notification Channels
  const [notifEmail,          setNotifEmail]          = useState(true);
  return (
    <div className='flex flex-col gap-5 p-4 sm:p-6 w-full'>

      {/* ── Page Header ── */}
      <div className='flex items-center justify-between gap-4 flex-wrap'>
        <div>
          <h1 className='text-base font-bold text-gray-900'>Settings</h1>
          <p className='text-sm text-gray-500 mt-0.5'>Configure defaults, approvals, notifications, and compliance rules</p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>

        {/* ── Left column ── */}
        <div className='flex flex-col gap-5'>

          <Card title='Performance'>
            {/* <FormGroup label='Async job threshold (records)'>
              <input type='number' className={inputCls} defaultValue={1000} />
            </FormGroup> */}
            {/* <FormGroup label='Batch size'>
              <input type='number' className={inputCls} defaultValue={200} />
            </FormGroup> */}
            {/* <FormGroup label='Concurrent job limit per org'>
              <input type='number' className={inputCls} defaultValue={3} />
            </FormGroup> */}
            <FormGroup label='API guard threshold (%)' hint='Auto-pause retrieval when daily API limit hits this %'>
              <input type='number' className={inputCls} defaultValue={80} />
            </FormGroup>
          </Card>

        </div>

        {/* ── Right column ── */}
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
            <ToggleRow label='Email'                      checked={notifEmail}      onChange={setNotifEmail}      />
          </Card>
        </div>
      </div>
    </div>
  );
}
