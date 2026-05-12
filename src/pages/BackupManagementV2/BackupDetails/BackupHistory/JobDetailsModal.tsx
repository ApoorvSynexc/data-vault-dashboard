import { useState } from 'react';
import { formatDateTime, formatBytes } from '../../../../utils';
import ChangesDetailModal from './ChangesDetailModal';

type JobDetailsModalProps = {
  job: any;
  onClose: () => void;
};

export default function JobDetailsModal({ job, onClose }: JobDetailsModalProps) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  if (!job) return null;

  const startedAt = job.startedAt ? new Date(job.startedAt) : null;
  const completedAt = job.completedAt ? new Date(job.completedAt) : null;

  let durationText = 'N/A';
  if (startedAt && completedAt) {
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    durationText = `${hours}h ${minutes}m ${seconds}s`;
  }

  const objectsList = job.object || [];
  const totalDataSize = objectsList.reduce((sum: number, obj: any) => sum + (obj.sizeInBytes || 0), 0);

  const newObjectsAdded = job.newObjectsAdded || 3;
  const newRecordsCount = job.newRecordsCount || 404;
  const updatedRecordsCount = job.updatedRecordsCount || 343;
  const deletedRecordsCount = job.deletedRecordsCount || 3;
  const totalRecordsUpdated = newObjectsAdded + newRecordsCount + updatedRecordsCount + deletedRecordsCount;

  const colors = ['#22c55e', '#3b82f6', '#f97316', '#ef4444'];
  const chartData = [newObjectsAdded, newRecordsCount, updatedRecordsCount, deletedRecordsCount];
  const labels = ['New Objects Added', 'New Records', 'Updated Records', 'Deleted Records'];

  return (
    <div className='fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex items-start justify-between p-6 border-b border-gray-200 sticky top-0 bg-white'>
          <div className='flex items-start gap-4 flex-1'>
            <div className='w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0'>
              <svg className='w-6 h-6 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
              </svg>
            </div>
            <div>
              <h2 className='text-xl font-semibold text-gray-900'>
                Backup History - {startedAt ? formatDateTime(startedAt) : 'N/A'}
              </h2>
              <p className='text-sm text-gray-600 mt-1'>Backup job details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 p-1'
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {/* Top Stats Row */}
          <div className='grid grid-cols-6 gap-4'>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Status</p>
              <span className='inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800'>
                {job.status || 'UNKNOWN'}
              </span>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Started At</p>
              <p className='text-sm text-gray-900 font-medium'>{startedAt ? formatDateTime(startedAt) : 'N/A'}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Duration</p>
              <p className='text-sm text-gray-900 font-medium'>{durationText}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Data Size</p>
              <p className='text-sm text-gray-900 font-medium'>{formatBytes(totalDataSize)}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Backup Type</p>
              <p className='text-sm text-gray-900 font-medium'>{job.jobType === 'BULK' ? 'Full Backup' : 'Real-time'}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Backup Mode</p>
              <p className='text-sm text-gray-900 font-medium'>{job.jobType === 'BULK' ? 'Scheduled' : 'Realtime'}</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className='grid grid-cols-2 gap-6'>
            {/* Job Details */}
            <div className='border border-gray-200 rounded-lg p-4'>
              <h3 className='font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path d='M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z' />
                </svg>
                Job Details
              </h3>
              <div className='space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Job Status</span>
                  <span className='text-sm font-medium text-gray-900'>{job.status}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Job Duration</span>
                  <span className='text-sm font-medium text-gray-900'>{durationText}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Data Size</span>
                  <span className='text-sm font-medium text-gray-900'>{formatBytes(totalDataSize)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Backup Data Type</span>
                  <span className='text-sm font-medium text-gray-900'>{job.jobType === 'BULK' ? 'Full Backup' : 'Incremental'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Backup Type</span>
                  <span className='text-sm font-medium text-gray-900'>{job.jobType === 'BULK' ? 'Scheduled' : 'Realtime'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Object Backed up</span>
                  <span className='text-sm font-medium text-gray-900'>{objectsList.length}</span>
                </div>
              </div>
            </div>

            {/* Changes Overview with Chart */}
            <div className='border border-gray-200 rounded-lg p-4'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='font-semibold text-gray-900 flex items-center gap-2'>
                  <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                    <path d='M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' />
                  </svg>
                  Changes Overview
                </h3>
                <button
                  onClick={() => setShowDetailsModal(true)}
                  className='text-xs text-blue-600 hover:text-blue-700 font-medium'
                >
                  View Details
                </button>
              </div>

              {/* Donut Chart */}
              <div className='flex items-center justify-center mb-6'>
                <div className='relative w-32 h-32'>
                  <svg className='w-full h-full' viewBox='0 0 100 100'>
                    {chartData.map((value, index) => {
                      const total = chartData.reduce((a, b) => a + b, 0);
                      const startAngle = chartData.slice(0, index).reduce((sum, val) => sum + (val / total) * 360, 0);
                      const angle = (value / total) * 360;
                      const radius = 30;
                      const circumference = 2 * Math.PI * radius;
                      const strokeDashoffset = circumference - (angle / 360) * circumference;

                      return (
                        <circle
                          key={index}
                          cx='50'
                          cy='50'
                          r={radius}
                          fill='none'
                          stroke={colors[index]}
                          strokeWidth='8'
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          transform={`rotate(${startAngle} 50 50)`}
                        />
                      );
                    })}
                  </svg>
                  <div className='absolute inset-0 flex flex-col items-center justify-center'>
                    <p className='text-2xl font-bold text-gray-900'>{totalRecordsUpdated}</p>
                    <p className='text-xs text-gray-600'>Total Record</p>
                    <p className='text-xs text-gray-600'>Updated</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className='space-y-2'>
                {labels.map((label, idx) => (
                  <div key={idx} className='flex items-center gap-2'>
                    <div className='w-3 h-3 rounded-full' style={{ backgroundColor: colors[idx] }}></div>
                    <span className='text-xs text-gray-600'>{label}</span>
                    <span className='ml-auto text-xs font-medium text-gray-900'>{chartData[idx]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-4 gap-3'>
            <div className='flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-200'>
              <div className='text-lg font-bold text-green-600'>{newObjectsAdded}</div>
              <p className='text-xs text-gray-600 text-center mt-1'>New Object Added</p>
            </div>
            <div className='flex flex-col items-center p-3 bg-blue-50 rounded-lg border border-blue-200'>
              <div className='text-lg font-bold text-blue-600'>{newRecordsCount}</div>
              <p className='text-xs text-gray-600 text-center mt-1'>New Records</p>
            </div>
            <div className='flex flex-col items-center p-3 bg-orange-50 rounded-lg border border-orange-200'>
              <div className='text-lg font-bold text-orange-600'>{updatedRecordsCount}</div>
              <p className='text-xs text-gray-600 text-center mt-1'>Updated Records</p>
            </div>
            <div className='flex flex-col items-center p-3 bg-red-50 rounded-lg border border-red-200'>
              <div className='text-lg font-bold text-red-600'>{deletedRecordsCount}</div>
              <p className='text-xs text-gray-600 text-center mt-1'>Deleted Records</p>
            </div>
          </div>
        </div>
      </div>

      <ChangesDetailModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        startedAt={startedAt}
      />
    </div>
  );
}
