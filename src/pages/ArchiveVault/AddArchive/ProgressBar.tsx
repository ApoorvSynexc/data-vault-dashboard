const STEPS = [
  {
    id: 1, label: 'Source & Destination',
    icon: (a: boolean) => (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <polyline points='21 8 21 21 3 21 3 8' /><rect x='1' y='3' width='22' height='5' /><line x1='10' y1='12' x2='14' y2='12' />
      </svg>
    ),
  },
  {
    id: 2, label: 'Define Archive',
    icon: (a: boolean) => (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='3' y='3' width='18' height='18' rx='2' /><line x1='3' y1='9' x2='21' y2='9' /><line x1='9' y1='21' x2='9' y2='9' />
      </svg>
    ),
  },
  {
    id: 3, label: 'Data',
    icon: (a: boolean) => (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
      </svg>
    ),
  },
  {
    id: 4, label: 'Dry Run',
    icon: (a: boolean) => (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' /><circle cx='12' cy='12' r='3' />
      </svg>
    ),
  },
  {
    id: 5, label: 'Schedule',
    icon: (a: boolean) => (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='3' y='4' width='18' height='18' rx='2' /><line x1='16' y1='2' x2='16' y2='6' /><line x1='8' y1='2' x2='8' y2='6' /><line x1='3' y1='10' x2='21' y2='10' />
      </svg>
    ),
  },
  {
    id: 6, label: 'Review',
    icon: (a: boolean) => (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke={a ? '#fff' : '#62748E'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' /><polyline points='14 2 14 8 20 8' />
      </svg>
    ),
  },
];

export default function ProgressBar({ activeStep }: { activeStep: number }) {
  return (
    <div className='flex-shrink-0 bg-white rounded-2xl px-6 py-4 flex flex-col gap-3'
      style={{ border: '0.8px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Step indicators */}
      <div className='flex items-center w-full'>
        {STEPS.map((step, idx) => {
          const isActive = step.id === activeStep;
          const isDone = step.id < activeStep;
          const circleBg = isDone || isActive ? '#155DFC' : '#F1F5F9';
          const labelColor = isActive ? '#155DFC' : isDone ? '#33363F' : '#94A3B8';
          return (
            <>
              {/* Icon + label — shrink-0 so label width doesn't affect connector */}
              <div key={step.id} className='flex items-center gap-2 flex-shrink-0'>
                <div className='flex items-center justify-center rounded-full flex-shrink-0'
                  style={{ width: 34, height: 34, background: circleBg }}>
                  {isDone
                    ? <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12' /></svg>
                    : step.icon(isActive)
                  }
                </div>
                <span className='text-xs font-medium whitespace-nowrap' style={{ color: labelColor }}>
                  {step.label}
                </span>
              </div>
              {/* Connector — flex-1 alone, so all connectors are equal width */}
              {idx < STEPS.length - 1 && (
                <div key={`line-${step.id}`} className='flex-1 h-px mx-2 rounded-full' style={{ background: isDone ? '#155DFC' : '#E2E8F0' }} />
              )}
            </>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className='w-full h-1.5 rounded-full' style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div className='h-full rounded-full transition-all duration-300'
          style={{ background: '#155DFC', width: `${((activeStep - 1) / (STEPS.length - 1)) * 100}%` }} />
      </div>
    </div>
  );
}
