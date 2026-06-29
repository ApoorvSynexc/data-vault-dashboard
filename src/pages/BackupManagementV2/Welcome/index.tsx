import { useNavigate } from 'react-router-dom';
import PermissionGate from '../../../components/PermissionGate';

// const TEMPLATES = [
//   { id: 1, title: 'Full org backup — all 200 objects',       subtitle: 'Daily schedule · ~5 min setup' },
//   { id: 2, title: 'Contacts & Accounts only',                subtitle: 'Lightweight backup · ~ 3 min setup' },
//   { id: 3, title: 'Real-time sync for Leads',                subtitle: 'Continuous backup as records change' },
//   { id: 4, title: 'Custom — start from scratch',             subtitle: 'Pick your own objects and schedule' },
// ];

const STEPS = [
  { number: '1', label: 'Connect',  description: 'Pick your Salesforce org and destination storage' },
  { number: '2', label: 'Select',   description: 'Choose objects to back up — all or specific ones' },
  { number: '3', label: 'Schedule', description: 'Run once, daily, or in real-time. We handle the rest' },
];

export default function BackupManagementWelcome() {
  const navigate = useNavigate();

  return (
    <div className='flex-1 min-h-0 flex flex-col bg-gray-50 overflow-hidden w-full'>
      <div className='flex-1 min-h-0 flex flex-col items-center w-full px-10' style={{ justifyContent: 'space-evenly' }}>

        {/* ── Icon + headings + description ── */}
        <div className='flex flex-col items-center text-center w-full flex-shrink-0'>
          <div
            className='flex items-center justify-center rounded-full mb-2'
            style={{ width: 52, height: 52, background: 'rgba(21, 93, 252, 0.1)' }}
          >
            <svg width='26' height='26' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
              <polyline points='16 16 12 12 8 16' />
              <line x1='12' y1='12' x2='12' y2='21' />
              <path d='M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3' />
            </svg>
          </div>
          <p className='font-medium mb-1' style={{ color: 'rgba(51,54,63,0.4)', fontSize: 'clamp(13px, 1.4vw, 20px)' }}>
            No Backup Found
          </p>
          <h1 className='font-medium mb-2' style={{ color: '#33363F', fontSize: 'clamp(18px, 2.2vw, 32px)' }}>
            Start Your First Backup
          </h1>
          <p className='font-light' style={{ color: '#33363F', fontSize: 'clamp(11px, 1.1vw, 15px)', lineHeight: 1.7, maxWidth: '60%' }}>
            Protect your Salesforce data by scheduling automatic backups to secure cloud storage —
            so you can restore any record, any time, with zero data loss.
          </p>
        </div>

        {/* ── Step cards ── */}
        <div className='flex gap-4 w-full flex-shrink-0'>
          {STEPS.map((step) => (
            <div
              key={step.number}
              className='flex-1 rounded-xl p-4'
              style={{ background: 'rgba(21, 93, 252, 0.05)' }}
            >
              <div
                className='flex items-center justify-center rounded-full bg-white mb-2 font-medium text-sm'
                style={{ width: 28, height: 28 }}
              >
                {step.number}
              </div>
              <p className='font-semibold mb-1' style={{ color: '#155DFC', fontSize: 'clamp(12px, 1.1vw, 15px)' }}>
                {step.label}
              </p>
              <p style={{ color: '#33363F', fontSize: 'clamp(11px, 1vw, 13px)', lineHeight: 1.6 }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* ── Templates (commented out) ──
        <div className='flex flex-col items-center w-full flex-shrink-0'>
          <p className='tracking-widest uppercase mb-2' style={{ color: '#64748B', fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
            START WITH A TEMPLATE
          </p>
          <div className='grid grid-cols-2 gap-3 w-full'>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate('/backup-management/add')}
                className='text-left rounded-lg px-4 py-3 transition hover:shadow-md'
                style={{ background: 'rgba(21, 93, 252, 0.1)' }}
              >
                <p className='font-semibold' style={{ color: '#33363F', fontSize: 'clamp(11px, 1vw, 14px)' }}>
                  {t.title}
                </p>
                <p className='mt-0.5' style={{ color: '#64748B', fontSize: 'clamp(10px, 0.85vw, 12px)' }}>
                  {t.subtitle}
                </p>
              </button>
            ))}
          </div>
        </div>
        ── */}

        {/* ── CTA button ── */}
        <PermissionGate permission='backup.write'>
          <button
            onClick={() => navigate('/backup-management/add')}
            className='flex items-center justify-center font-semibold text-white rounded-full transition hover:opacity-90 flex-shrink-0'
            style={{ background: '#155DFC', width: 'clamp(220px, 26vw, 362px)', height: 'clamp(44px, 5vh, 58px)', fontSize: 'clamp(13px, 1.1vw, 16px)', gap: 10 }}
          >
            + New Backup
          </button>
        </PermissionGate>

      </div>
    </div>
  );
}
