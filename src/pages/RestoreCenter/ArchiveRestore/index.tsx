import Typography from '../../../components/Typography';

interface Props {
  onBack: () => void;
  onNewRestore: () => void;
}

export default function ArchiveRestore({ onBack, onNewRestore }: Props) {
  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4'>

        {/* Header */}
        <div className='flex-shrink-0 flex items-center justify-between gap-4'>
          <div>
            <Typography as='h1' variant='pageTitle' color='primary'>Archive Restore</Typography>
            <Typography variant='bodySm' color='muted' className='mt-0.5'>
              Restore records from Archive Vault entries.
            </Typography>
          </div>
          <button
            onClick={onNewRestore}
            className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg text-white flex-shrink-0'
            style={{ background: '#155DFC' }}
          >
            <svg width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'>
              <line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' />
            </svg>
            New Archive Restore
          </button>
        </div>

        {/* Coming soon placeholder */}
        <div className='flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-20 text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-2xl mb-4' style={{ background: 'rgba(21,93,252,0.08)' }}>
            <svg width='28' height='28' fill='none' stroke='#155DFC' strokeWidth='1.8' viewBox='0 0 24 24'>
              <path d='M5 8l4 4 4-4'/><rect x='3' y='3' width='18' height='18' rx='2'/>
            </svg>
          </div>
          <Typography as='h2' variant='sectionTitle' color='primary' className='mb-2'>
            Archive Restore
          </Typography>
          <p className='text-sm text-gray-500 max-w-sm'>
            Restore from Archive Vault entries. Select an archival snapshot and choose the target org, scope, and conflict rules.
          </p>
          <button
            onClick={onNewRestore}
            className='mt-6 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white'
            style={{ background: '#155DFC' }}
          >
            Start Archive Restore
          </button>
        </div>

      </div>

      {/* Footer */}
      <div className='flex-shrink-0 flex items-center px-4 sm:px-6 py-4 border-t border-gray-200 bg-white'>
        <button
          onClick={onBack}
          className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
