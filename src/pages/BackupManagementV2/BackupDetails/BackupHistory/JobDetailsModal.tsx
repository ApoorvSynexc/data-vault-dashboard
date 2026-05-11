import { useState } from 'react';
import { formatDateTime, formatBytes } from '../../../../utils';

type JobDetailsModalProps = {
  job: any;
  onClose: () => void;
};

export default function JobDetailsModal({ job, onClose }: JobDetailsModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  if (!job) return null;

  const startedAt = job.startedAt ? new Date(job.startedAt) : null;
  const completedAt = job.completedAt ? new Date(job.completedAt) : null;

  // FUNCTIONAL: Calculate duration from API data
  let durationText = 'N/A';
  if (startedAt && completedAt) {
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    durationText = `${hours}h ${minutes}m ${seconds}s`;
  }

  // FUNCTIONAL: Get objects from job response
  const objectsList = job.object || [];
  const totalDataSize = objectsList.reduce((sum: number, obj: any) => sum + (obj.sizeInBytes || 0), 0);

  // FUNCTIONAL: Extract object names from API response
  const updatedObjectNames = objectsList.map((obj: any) => obj.name).filter(Boolean);

  // FUNCTIONAL: Paginate object names
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedObjects = updatedObjectNames.slice(startIdx, endIdx);
  const totalPages = Math.ceil(updatedObjectNames.length / itemsPerPage);

  // FUNCTIONAL: Count standard vs custom objects (custom objects end with __c)
  const standardObjectsCount = objectsList.filter((obj: any) => !obj.name?.includes('__c')).length;
  const customObjectsCount = objectsList.filter((obj: any) => obj.name?.includes('__c')).length;

  // TODO: DUMMY DATA - These values need additional API data to be functional
  const newObjectsAdded = 3; // Placeholder: Need separate endpoint or field for new objects
  const newRecordsCount = job.recordCount || 0; // Might be from job.recordCount but not confirmed
  const updatedRecordsCount = job.completedRecordCount || 0; // Might be from completedRecordCount but not confirmed
  const deletedRecordsCount = 0; // Placeholder: Not available in current API response

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
              <p className='text-sm text-gray-600 mt-1'>Backup job details →</p>
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
          {/* Top Stats Row - All data from API response */}
          <div className='grid grid-cols-6 gap-4'>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Status</p>
              {/* FUNCTIONAL: From job.status */}
              <span className='inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800'>
                {job.status || 'UNKNOWN'}
              </span>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Started At</p>
              {/* FUNCTIONAL: From job.startedAt */}
              <p className='text-sm text-gray-900 font-medium'>{startedAt ? formatDateTime(startedAt) : 'N/A'}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Duration</p>
              {/* FUNCTIONAL: Calculated from startedAt and completedAt */}
              <p className='text-sm text-gray-900 font-medium'>{durationText}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Data Size</p>
              {/* FUNCTIONAL: Calculated from job.object array sizeInBytes */}
              <p className='text-sm text-gray-900 font-medium'>{formatBytes(totalDataSize)}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Backup Type</p>
              {/* FUNCTIONAL: From job.jobType */}
              <p className='text-sm text-gray-900 font-medium'>{job.jobType === 'BULK' ? 'Full Backup' : 'Real-time'}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-600 mb-2'>Backup Mode</p>
              {/* FUNCTIONAL: From job.jobType */}
              <p className='text-sm text-gray-900 font-medium'>{job.jobType === 'BULK' ? 'Scheduled' : 'Realtime'}</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className='grid grid-cols-2 gap-6'>
            {/* Job Details - All functional data from API */}
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
                  {/* FUNCTIONAL: From job.status */}
                  <span className='text-sm font-medium text-gray-900'>{job.status}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Job Duration</span>
                  {/* FUNCTIONAL: Calculated from startedAt and completedAt */}
                  <span className='text-sm font-medium text-gray-900'>{durationText}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Data Size</span>
                  {/* FUNCTIONAL: Calculated from job.object array */}
                  <span className='text-sm font-medium text-gray-900'>{formatBytes(totalDataSize)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Backup Data Type</span>
                  {/* FUNCTIONAL: From job.jobType */}
                  <span className='text-sm font-medium text-gray-900'>{job.jobType === 'BULK' ? 'Full Backup' : 'Incremental'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Backup Type</span>
                  {/* FUNCTIONAL: From job.jobType */}
                  <span className='text-sm font-medium text-gray-900'>{job.jobType === 'BULK' ? 'Scheduled' : 'Realtime'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm text-gray-600'>Object Backed up</span>
                  {/* FUNCTIONAL: From job.object array length */}
                  <span className='text-sm font-medium text-gray-900'>{objectsList.length}</span>
                </div>
              </div>
            </div>

            {/* Updated Objects Details - Functional data from job.object array */}
            <div className='border border-gray-200 rounded-lg p-4'>
              <h3 className='font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path d='M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' />
                </svg>
                Updated Objects Details
              </h3>
              <div className='space-y-4'>
                <div>
                  <p className='text-xs font-medium text-gray-600 mb-3'>Objects Updated</p>
                  {/* FUNCTIONAL: Object names from job.object array */}
                  <div className='flex flex-wrap gap-2'>
                    {paginatedObjects.length > 0 ? (
                      paginatedObjects.map((objName: string, idx: number) => (
                        <span
                          key={idx}
                          className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200'
                        >
                          {objName}
                        </span>
                      ))
                    ) : (
                      <span className='text-xs text-gray-500'>No objects updated</span>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className='flex justify-between items-center mt-3'>
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className='text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-300'
                      >
                        ← Prev
                      </button>
                      <span className='text-xs text-gray-600'>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className='text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-300'
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
                <div className='grid grid-cols-2 gap-3 pt-3 border-t border-gray-200'>
                  <div>
                    <p className='text-xs text-gray-600'>Standard Objects</p>
                    {/* FUNCTIONAL: Count from job.object array (objects without __c suffix) */}
                    <p className='text-sm font-semibold text-gray-900'>
                      {standardObjectsCount} Updated
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-600'>Custom Objects</p>
                    {/* FUNCTIONAL: Count from job.object array (objects with __c suffix) */}
                    <p className='text-sm font-semibold text-gray-900'>
                      {customObjectsCount} Updated
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Changes Overview - Mix of functional and dummy data */}
          <div className='border border-gray-200 rounded-lg p-4'>
            <h3 className='font-semibold text-gray-900 mb-4 flex items-center gap-2'>
              <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' />
              </svg>
              Changes Overview
            </h3>
            <div className='grid grid-cols-4 gap-4'>
              <div className='text-center'>
                {/* TODO: DUMMY DATA - Need separate API field for new objects added */}
                <div className='text-2xl font-bold text-green-600'>{newObjectsAdded}</div>
                <p className='text-xs text-gray-600 mt-1'>New Objects Added</p>
              </div>
              <div className='text-center'>
                {/* FUNCTIONAL: From job.recordCount if available */}
                <div className='text-2xl font-bold text-blue-600'>{newRecordsCount}</div>
                <p className='text-xs text-gray-600 mt-1'>New Records</p>
              </div>
              <div className='text-center'>
                {/* FUNCTIONAL: From job.completedRecordCount or total from objects array */}
                <div className='text-2xl font-bold text-orange-600'>{updatedRecordsCount}</div>
                <p className='text-xs text-gray-600 mt-1'>Updated Records</p>
              </div>
              <div className='text-center'>
                {/* TODO: DUMMY DATA - Not available in current API response */}
                <div className='text-2xl font-bold text-red-600'>{deletedRecordsCount}</div>
                <p className='text-xs text-gray-600 mt-1'>Deleted Records</p>
              </div>
            </div>
          </div>

          {/* TODO: DUMMY DATA - New Objects section requires additional API data */}
          <div className='border border-gray-200 rounded-lg p-4'>
            <h3 className='font-semibold text-gray-900 mb-4 flex items-center gap-2'>
              <svg className='w-5 h-5 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' />
              </svg>
              New Objects
            </h3>
            <div className='space-y-3'>
              <div>
                <p className='text-sm text-gray-700 mb-2'>New Objects</p>
                {/* TODO: DUMMY DATA - Hardcoded until API provides new objects list */}
                <div className='flex flex-wrap gap-2'>
                  {['Dealership', 'Partners', 'Stack Holders'].map((obj, idx) => (
                    <span key={idx} className='text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded'>
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4 pt-3 border-t border-gray-200'>
                <div>
                  <p className='text-xs text-gray-600'>Standard Objects</p>
                  {/* TODO: DUMMY DATA - Need API data for new standard objects count */}
                  <p className='text-lg font-semibold text-gray-900'>--</p>
                </div>
                <div>
                  <p className='text-xs text-gray-600'>Custom Objects</p>
                  {/* TODO: DUMMY DATA - Need API data for new custom objects count */}
                  <p className='text-lg font-semibold text-gray-900'>03</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
