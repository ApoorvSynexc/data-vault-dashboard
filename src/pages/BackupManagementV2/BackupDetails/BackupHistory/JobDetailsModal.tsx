import { useState } from 'react';
import { formatDateTime, formatBytes } from '../../../../utils';
import ChangesDetailModal from './ChangesDetailModal';

type JobDetailsModalProps = {
  job: any;
  onClose: () => void;
  onRefresh?: () => Promise<void>;
};

const getStatusStyle = (status: string) => {
  const s = status?.toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED') return { bg: 'rgba(55,197,91,0.15)', color: '#008020' };
  if (s === 'FAILED') return { bg: 'rgba(242,68,0,0.1)', color: '#F24400' };
  if (s === 'RUNNING') return { bg: 'rgba(21,93,252,0.1)', color: '#155DFC' };
  if (s === 'PENDING') return { bg: 'rgba(234,179,8,0.1)', color: '#A16207' };
  return { bg: '#F3F4F6', color: '#374151' };
};

const getStatusLabel = (status: string) => {
  const s = status?.toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED') return 'Completed';
  if (s === 'FAILED') return 'Failed';
  if (s === 'RUNNING') return 'In Progress';
  if (s === 'PENDING') return 'Pending';
  return status || 'Unknown';
};

/* ── small icons for the stat cards ── */
const IconFile = () => (
  <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#008020' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' /><polyline points='14 2 14 8 20 8' />
  </svg>
);
const IconEdit = () => (
  <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
    <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
  </svg>
);
const IconTrash = () => (
  <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
    <polyline points='3 6 5 6 21 6' /><path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
    <path d='M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
  </svg>
);
const IconClock = () => (
  <div className='w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0' style={{ background: 'rgba(21,93,252,0.08)' }}>
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <circle cx='12' cy='12' r='10' /><polyline points='12 6 12 12 16 14' />
    </svg>
  </div>
);

export default function JobDetailsModal({ job, onClose, onRefresh }: JobDetailsModalProps) {
  const [view, setView] = useState<'job' | 'changes'>('job');
  if (!job) return null;

  const startedAt = job.startedAt ? new Date(job.startedAt) : null;
  const completedAt = job.completedAt ? new Date(job.completedAt) : null;

  let durationText = 'N/A';
  if (startedAt && completedAt) {
    const ms = completedAt.getTime() - startedAt.getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    durationText = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  const objectsList: any[] = job.object || [];
  const totalDataSize = objectsList.reduce((sum: number, obj: any) => sum + (obj.sizeInBytes || 0), 0);

  const newRecordsCount     = objectsList.reduce((s: number, o: any) => s + (o.insertCount || 0), 0);
  const updatedRecordsCount = objectsList.reduce((s: number, o: any) => s + (o.updateCount || 0), 0);
  const deletedRecordsCount = objectsList.reduce((s: number, o: any) => s + (o.deleteCount || 0), 0);
  const totalRecords = newRecordsCount + updatedRecordsCount + deletedRecordsCount;

  const statusStyle = getStatusStyle(job.status);

  const chartSegments = [
    { value: newRecordsCount, color: '#008020', label: 'New Records' },
    { value: updatedRecordsCount, color: '#93C5FD', label: 'Updated Records' },
    { value: deletedRecordsCount, color: '#F24400', label: 'Deleted Records' },
  ];

  const total = chartSegments.reduce((s, seg) => s + seg.value, 0) || 1;
  const R = 40;
  const C = 2 * Math.PI * R;

  const statCards = [
    { value: newRecordsCount, label: 'New Records', color: '#008020', icon: <IconFile /> },
    { value: updatedRecordsCount, label: 'Updated Records', color: '#155DFC', icon: <IconEdit /> },
    { value: deletedRecordsCount, label: 'Deleted Records', color: '#F24400', icon: <IconTrash /> },
  ];

  if (view === 'changes') {
    return (
      <ChangesDetailModal
        isOpen={true}
        onClose={onClose}
        onBack={() => setView('job')}
        job={job}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
      <div className='bg-white rounded-2xl w-full flex flex-col' style={{ maxWidth: '1024px', height: '86vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* ── Header ── */}
        <div className='flex items-center justify-between px-8 pt-7 pb-5' style={{ borderBottom: '1.5px solid #F1F5F9' }}>
          <div className='flex items-center gap-4'>
            {/* Solid green circle with white check */}
            <div className='flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center' style={{ background: '#22C55E' }}>
              <svg width='26' height='26' viewBox='0 0 24 24' fill='none'>
                <path d='M20 6L9 17l-5-5' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </div>
            <div>
              <h2 className='font-bold leading-snug' style={{ fontSize: '22px', color: '#111827' }}>
                Backup History - {startedAt ? formatDateTime(startedAt) : 'N/A'}
              </h2>
              <p className='text-sm mt-0.5' style={{ color: '#64748B' }}>Backup job details →</p>
            </div>
          </div>
          <button onClick={onClose} className='p-2 rounded-lg hover:bg-gray-100 transition' style={{ color: '#6B7280' }}>
            <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className='mx-6 my-5 rounded-xl overflow-hidden' style={{ border: '1.5px solid #E8EDF5', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className='grid grid-cols-6'>
            {/* Status — no icon */}
            <div className='flex flex-col gap-1.5 py-4 px-5' style={{ borderRight: '1.5px solid #E8EDF5' }}>
              <p className='text-xs font-medium' style={{ color: '#64748B' }}>Status</p>
              <span
                className='inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold w-fit'
                style={{ background: statusStyle.bg, color: statusStyle.color }}
              >
                {getStatusLabel(job.status)}
              </span>
            </div>

            {/* Started At, Duration, Data Size, Backup Type, Backup Mode — each with clock icon */}
            {[
              { label: 'Started At', value: startedAt ? formatDateTime(startedAt) : 'N/A' },
              { label: 'Duration', value: durationText },
              { label: 'Data Size', value: formatBytes(totalDataSize) },
              { label: 'Backup Type', value: job.jobType === 'BULK' ? 'Full Backup' : 'Real-time' },
              { label: 'Backup Mode', value: job.jobType === 'BULK' ? 'Scheduled' : 'Realtime' },
            ].map(({ label, value }, i) => (
              <div key={i} className='flex items-center gap-3 py-4 px-5' style={{ borderRight: i < 4 ? '1.5px solid #E8EDF5' : 'none' }}>
                <IconClock />
                <div className='flex flex-col gap-0.5'>
                  <p className='text-xs font-medium' style={{ color: '#64748B' }}>{label}</p>
                  <p className='text-sm font-semibold' style={{ color: '#111827' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two-column body ── */}
        <div className='grid grid-cols-2 gap-5 px-6 pb-7 flex-1 overflow-y-auto'>

          {/* Left — Job Details */}
          <div className='rounded-xl p-6' style={{ border: '1.5px solid #E8EDF5' }}>
            <div className='flex items-center gap-2 mb-4'>
              <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <line x1='8' y1='6' x2='21' y2='6' /><line x1='8' y1='12' x2='21' y2='12' /><line x1='8' y1='18' x2='21' y2='18' />
                <line x1='3' y1='6' x2='3.01' y2='6' /><line x1='3' y1='12' x2='3.01' y2='12' /><line x1='3' y1='18' x2='3.01' y2='18' />
              </svg>
              <h3 className='text-lg font-bold' style={{ color: '#111827' }}>Job Details</h3>
            </div>

            <div className='flex flex-col'>
              {[
                { label: 'Job Status', value: getStatusLabel(job.status) },
                { label: 'Job Duration', value: durationText },
                { label: 'Data Size', value: formatBytes(totalDataSize) },
                { label: 'Backup Data Type', value: job.jobType === 'BULK' ? 'Full Backup' : 'Incremental' },
                { label: 'Backup Type', value: job.jobType === 'BULK' ? 'Scheduled' : 'Realtime' },
                { label: 'Object Backed up', value: String(objectsList.length) },
              ].map(({ label, value }, i, arr) => (
                <div
                  key={label}
                  className='flex items-center justify-between py-3'
                  style={i < arr.length - 1 ? { borderBottom: '1px solid #F1F5F9' } : undefined}
                >
                  <span className='text-sm' style={{ color: '#64748B' }}>{label}</span>
                  <span className='text-sm font-semibold' style={{ color: '#111827' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Changes Overview */}
          <div className='rounded-xl p-6 flex flex-col gap-5' style={{ border: '1.5px solid #E8EDF5' }}>
            {/* Title row */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <polyline points='22 12 18 12 15 21 9 3 6 12 2 12' />
                </svg>
                <h3 className='text-lg font-bold' style={{ color: '#111827' }}>Changes Overview</h3>
              </div>
              <button
                onClick={() => setView('changes')}
                className='text-sm font-semibold transition hover:opacity-70'
                style={{ color: '#155DFC' }}
              >
                View Detail
              </button>
            </div>

            {/* Donut + legend */}
            <div className='flex items-center gap-6'>
              {/* Donut chart */}
              <div className='flex-shrink-0'>
                <svg viewBox='0 0 100 100' width='140' height='140'>
                  {/* grey track */}
                  <circle cx='50' cy='50' r={R} fill='none' stroke='#F1F5F9' strokeWidth='12' />
                  {chartSegments.map((seg, i) => {
                    const offset = chartSegments.slice(0, i).reduce((s, x) => s + x.value, 0);
                    const segLen = (seg.value / total) * C;
                    const rotation = (offset / total) * 360 - 90;
                    return (
                      <circle
                        key={i}
                        cx='50' cy='50'
                        r={R}
                        fill='none'
                        stroke={seg.color}
                        strokeWidth='12'
                        strokeDasharray={`${segLen} ${C - segLen}`}
                        strokeDashoffset='0'
                        transform={`rotate(${rotation} 50 50)`}
                      />
                    );
                  })}
                  <text x='50' y='44' textAnchor='middle' fontSize='13' fontWeight='800' fill='#111827' fontFamily='Inter'>{totalRecords}</text>
                  <text x='50' y='55' textAnchor='middle' fontSize='6.5' fill='#64748B' fontFamily='Inter'>Total Record</text>
                  <text x='50' y='63' textAnchor='middle' fontSize='6.5' fill='#64748B' fontFamily='Inter'>Updated</text>
                </svg>
              </div>

              {/* Legend */}
              <div className='flex-1 flex flex-col'>
                {chartSegments.map((seg, i, arr) => (
                  <div
                    key={seg.label}
                    className='flex items-center justify-between py-3'
                    style={i < arr.length - 1 ? { borderBottom: '1px solid #F1F5F9' } : undefined}
                  >
                    <div className='flex items-center gap-2.5'>
                      <span className='w-3 h-3 rounded-full flex-shrink-0' style={{ background: seg.color }} />
                      <span className='text-sm' style={{ color: '#374151' }}>{seg.label}</span>
                    </div>
                    <span className='text-sm font-bold' style={{ color: '#111827' }}>{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stat cards */}
            <div className='grid grid-cols-4 gap-2'>
              {statCards.map(({ value, label, color, icon }) => (
                <div
                  key={label}
                  className='rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1'
                  style={{ border: '1.5px solid #E8EDF5', background: '#FFFFFF' }}
                >
                  {icon}
                  <span className='text-xl font-bold leading-none mt-1' style={{ color }}>{value}</span>
                  <span className='text-[11px] leading-tight' style={{ color: '#64748B' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
