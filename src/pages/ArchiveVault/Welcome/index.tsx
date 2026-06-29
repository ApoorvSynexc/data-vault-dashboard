import { useNavigate } from 'react-router-dom';

// const TEMPLATES = [
//   { id: 1, title: 'Closed Cases older than 2 years',     subtitle: 'Common compliance archive . ~ 5 min setup' },
//   { id: 2, title: 'Lost opportunities older than 1 year', subtitle: 'Free up storage . ~ 3 min setup' },
//   { id: 3, title: 'Inactive contacts with no activity',   subtitle: 'No task, events, or emails for 18 months' },
//   { id: 4, title: 'Custom - start from scratch',          subtitle: 'Build your own filter and schedule' },
// ];

const STEPS = [
  { number: '1', label: 'Connect',  description: 'Pick your source org and destination connections' },
  { number: '2', label: 'Filter',   description: 'Choose what to archive - by object, age, status or any fields' },
  { number: '3', label: 'Schedule', description: 'Run once or on a recurring schedule. Records stays restorable' },
];

export default function ArchiveVaultWelcome() {
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
              <polyline points='21 8 21 21 3 21 3 8' />
              <rect x='1' y='3' width='22' height='5' />
              <line x1='10' y1='12' x2='14' y2='12' />
            </svg>
          </div>
          <p className='font-medium mb-1' style={{ color: 'rgba(51,54,63,0.4)', fontSize: 'clamp(13px, 1.4vw, 20px)' }}>
            No Archive Found
          </p>
          <h1 className='font-medium mb-2' style={{ color: '#33363F', fontSize: 'clamp(18px, 2.2vw, 32px)' }}>
            Start Your First Archive
          </h1>
          <p className='font-light' style={{ color: '#33363F', fontSize: 'clamp(11px, 1.1vw, 15px)', lineHeight: 1.7, maxWidth: '60%' }}>
            Move old, inactive, or compliance-bound records out of CRM into S3 — keeping them
            searchable and restorable without paying for production storage.
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
                onClick={() => navigate('/archive-vault/new')}
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
        <button
          onClick={() => navigate('/archive-vault/new')}
          className='flex items-center justify-center font-semibold text-white rounded-full transition hover:opacity-90 flex-shrink-0'
          style={{ background: '#155DFC', width: 'clamp(220px, 26vw, 362px)', height: 'clamp(44px, 5vh, 58px)', fontSize: 'clamp(13px, 1.1vw, 16px)', gap: 10 }}
        >
          + New Archive Policy
        </button>

      </div>
    </div>
  );
}
