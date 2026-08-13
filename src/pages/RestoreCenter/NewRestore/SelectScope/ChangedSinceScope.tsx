import { useState } from 'react';
import Typography from '../../../../components/Typography';

interface Props {
  onChange: (date: string) => void;
}

export default function ChangedSinceScope({ onChange }: Props) {
  const [date, setDate] = useState('2026-05-01');

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      <div className='px-5 py-3 border-b border-gray-100'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>Δ Changed-Since Mode</Typography>
      </div>
      <div className='p-5 space-y-4'>
        <div className='flex flex-col sm:flex-row sm:items-end gap-4'>
          <div>
            <label className='block text-xs font-semibold text-gray-700 mb-1.5'>Since date</label>
            <input type='date' value={date}
              onChange={(e) => { setDate(e.target.value); onChange(e.target.value); }}
              className='h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500' />
          </div>
        </div>
        <div className='flex items-start gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4'>
          <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-gray-600 font-bold'>Δ</div>
          <div>
            <p className='text-sm font-bold text-gray-800'>Diff-based restore</p>
            <p className='text-xs text-gray-600 mt-1'>
              Two-level: first the system finds <strong>records</strong> that have at least one field differing from the snapshot, then within those records it writes back <strong>only the differing fields</strong>. Records with no differences and unchanged fields are left untouched.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
