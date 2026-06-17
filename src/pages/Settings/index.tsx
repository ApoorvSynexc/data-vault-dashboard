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
  // Automation Defaults
  const [disableTriggers,     setDisableTriggers]     = useState(true);
  const [disableValidations,  setDisableValidations]  = useState(true);
  const [disableFlows,        setDisableFlows]        = useState(true);
  const [suppressEmail,       setSuppressEmail]       = useState(true);

  // Approval Rules
  const [selfApproval,        setSelfApproval]        = useState(false);

  // Rollback & Retention
  const [preJobSnapshot,      setPreJobSnapshot]      = useState(true);
  const [extraApproval,       setExtraApproval]       = useState(true);

  // Compliance & Privacy
  const [gdprErasure,         setGdprErasure]         = useState(true);
  const [regionConstraint,    setRegionConstraint]    = useState(true);
  const [piiLogging,          setPiiLogging]          = useState(true);
  const [legalHold,           setLegalHold]           = useState(true);
  const [mfaReauth,           setMfaReauth]           = useState(true);

  // Notification Channels
  const [notifEmail,          setNotifEmail]          = useState(true);
  const [notifSlack,          setNotifSlack]          = useState(true);
  const [notifTeams,          setNotifTeams]          = useState(false);
  const [notifSalesforce,     setNotifSalesforce]     = useState(true);
  const [notifWebhook,        setNotifWebhook]        = useState(false);

  return (
    <div className='flex flex-col gap-5 p-4 sm:p-6 w-full'>

      {/* ── Page Header ── */}
      <div className='flex items-center justify-between gap-4 flex-wrap'>
        <div>
          <h2 className='text-base font-bold text-gray-900'>Retrieval Settings</h2>
          <p className='text-sm text-gray-500 mt-0.5'>Configure defaults, approvals, notifications, and compliance rules</p>
        </div>
        <button
          className='inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90'
          style={{ background: '#155DFC' }}
        >
          Save Settings
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>

        {/* ── Left column ── */}
        <div className='flex flex-col gap-5'>

          <Card title='Automation Defaults'>
            <ToggleRow label='Disable Triggers (default ON)'          checked={disableTriggers}    onChange={setDisableTriggers}    />
            <ToggleRow label='Disable Validation Rules (default ON)'  checked={disableValidations} onChange={setDisableValidations}  />
            <ToggleRow label='Disable Flows (default ON)'             checked={disableFlows}       onChange={setDisableFlows}       />
            <ToggleRow label='Suppress Email Notifications'           checked={suppressEmail}      onChange={setSuppressEmail}      />
          </Card>

          <Card title='Approval Rules'>
            <FormGroup label='Volume threshold requiring approval'>
              <input type='number' className={inputCls} defaultValue={10000} />
            </FormGroup>
            <FormGroup label='Production destination policy'>
              <select className={selectCls} defaultValue='always'>
                <option value='always'>Always require approval</option>
                <option value='role'>Configurable per user role</option>
              </select>
            </FormGroup>
            <FormGroup label='Approval expiry window'>
              <select className={selectCls} defaultValue='24h'>
                <option value='24h'>24 hours</option>
                <option value='48h'>48 hours</option>
                <option value='72h'>72 hours</option>
              </select>
            </FormGroup>
            <ToggleRow label='Allow self-approval' checked={selfApproval} onChange={setSelfApproval} />
          </Card>

          <Card title='Performance'>
            <FormGroup label='Async job threshold (records)'>
              <input type='number' className={inputCls} defaultValue={1000} />
            </FormGroup>
            <FormGroup label='Batch size'>
              <input type='number' className={inputCls} defaultValue={200} />
            </FormGroup>
            <FormGroup label='Concurrent job limit per org'>
              <input type='number' className={inputCls} defaultValue={3} />
            </FormGroup>
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
            <ToggleRow label='Auto-take pre-job snapshot'                          checked={preJobSnapshot} onChange={setPreJobSnapshot} />
            <ToggleRow label='Require extra approval for past-retention records'   checked={extraApproval}  onChange={setExtraApproval}  />
          </Card>

          <Card title='Compliance & Privacy'>
            <ToggleRow label='GDPR Erasure Check'         desc='Block re-introduction of erased records'           checked={gdprErasure}      onChange={setGdprErasure}      />
            <ToggleRow label='Region / Residency Constraint' desc='Block EU records to US org without exception'   checked={regionConstraint} onChange={setRegionConstraint} />
            <ToggleRow label='PII Access Logging'                                                                  checked={piiLogging}       onChange={setPiiLogging}       />
            <ToggleRow label='Legal Hold Transfer'        desc='Holds follow records into destination'             checked={legalHold}        onChange={setLegalHold}        />
            <ToggleRow label='MFA Re-auth for High-Risk Jobs'                                                      checked={mfaReauth}        onChange={setMfaReauth}        />
            <FormGroup label='Data masking on Sandbox retrieval'>
              <select className={selectCls} defaultValue='auto'>
                <option value='auto'>Auto-mask all PII-tagged fields</option>
                <option value='manual'>Manual rules</option>
                <option value='none'>No masking</option>
              </select>
            </FormGroup>
          </Card>

          <Card title='Notification Channels'>
            <ToggleRow label='Email'                      checked={notifEmail}      onChange={setNotifEmail}      />
            <ToggleRow label='Slack'                      checked={notifSlack}      onChange={setNotifSlack}      />
            <ToggleRow label='Microsoft Teams'            checked={notifTeams}      onChange={setNotifTeams}      />
            <ToggleRow label='Salesforce Platform Events' checked={notifSalesforce} onChange={setNotifSalesforce} />
            <ToggleRow label='Webhook'                    checked={notifWebhook}    onChange={setNotifWebhook}    />
          </Card>

        </div>
      </div>
    </div>
  );
}
