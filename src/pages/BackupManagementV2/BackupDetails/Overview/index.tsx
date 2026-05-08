import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';

type OverviewProps = {
  backup: any;
};

export default function Overview({ backup }: OverviewProps) {
  const { slug } = useParams();
  const backupConfigService = useBackupConfigService();

  const { data: backupDetail, isLoading, error } = useQuery({
    queryKey: ['backup-detail', slug],
    queryFn: async () => {
      if (!slug) return null;
      const response = await backupConfigService.getBackupConfig(slug);
      return response?.data || null;
    },
    enabled: !!slug,
  });

  // Merge API data with backup prop for fallback
  const displayData = backupDetail || backup;
  console.log({backupDetail});
  

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center py-12 text-red-600'>
        <p>Failed to load backup details. Please try again.</p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Status Overview Cards */}
      <div className='bg-white rounded border border-gray-200 p-4'>
        <div className='grid grid-cols-4 gap-3'>
          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Status</span>
            </div>
            <p className='text-sm font-semibold text-green-600'>{displayData?.backupStatus || 'N/A'}</p>
            <p className='text-xs text-gray-500'>Successfully Completed</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Last Run</span>
            </div>
            <p className='text-sm font-semibold text-gray-900'>{displayData?.lastBackupAt ? new Date(displayData.lastBackupAt).toLocaleString() : 'N/A'}</p>
            <p className='text-xs text-gray-500'>{displayData?.lastBackupAt ? new Date(displayData.lastBackupAt).toLocaleDateString() : 'Never'}</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v-1h8v1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3h2v3h-2z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Data Size</span>
            </div>
            <p className='text-sm font-semibold text-gray-900'>{displayData?.sizeInBytes ? `${(displayData.sizeInBytes / (1024 ** 3)).toFixed(1)} GB` : '0 GB'}</p>
            <p className='text-xs text-gray-500'>+7.4% vs last backup</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M7 3a1 1 0 000 2h6a1 1 0 000-2H7zM4 7a1 1 0 011-1h10a1 1 0 011 1v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Objects</span>
            </div>
            <p className='text-sm font-semibold text-gray-900'>152</p>
            <p className='text-xs text-gray-500'>12,424,545 Records</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className='grid grid-cols-3 gap-4'>
        {/* Left Column - Backup Details & Scheduling */}
        <div className='col-span-2 space-y-4'>
          {/* Backup Details */}
          <div className='bg-white rounded border border-gray-200 p-4'>
            <h3 className='text-sm font-semibold text-gray-900 mb-4'>Backup Details</h3>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Platform</span>
                <span className='text-xs font-medium text-gray-900'>{displayData?.crmName || displayData?.platform || 'N/A'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Organization</span>
                <span className='text-xs font-medium text-gray-900'>{displayData?.name || 'N/A'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Environment</span>
                <span className='text-xs font-medium text-gray-900'>{displayData?.environment || 'N/A'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Backup Type</span>
                <span className='text-xs font-medium text-gray-900'>Full Backup</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Total Records</span>
                <span className='text-xs font-medium text-gray-900'>12,424,545 Records</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Triggered By</span>
                <span className='text-xs font-medium text-gray-900'>Schedule</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>API Version</span>
                <span className='text-xs font-medium text-gray-900'>v58.0</span>
              </div>
            </div>
          </div>

          {/* Backup Scheduling */}
          <div className='bg-white rounded border border-gray-200 p-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-sm font-semibold text-gray-900'>Backup Scheduling</h3>
              <a href='#' className='text-xs font-medium text-blue-600 hover:underline'>Edit Schedule →</a>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Frequency</p>
                <p className='text-xs font-medium text-gray-900'>{displayData?.scheduleConfig?.scheduling?.frequency || 'Daily'}</p>
              </div>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Time</p>
                <p className='text-xs font-medium text-gray-900'>02:00 AM</p>
              </div>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Next Run</p>
                <p className='text-xs font-medium text-gray-900'>Tomorrow, 02:00 AM</p>
              </div>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Time Zone</p>
                <p className='text-xs font-medium text-gray-900'>(GMT-04:00) America/New_York</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Data Snapshot & Top Objects */}
        <div className='space-y-4'>
          {/* Data Snapshot */}
          <div className='bg-white rounded border border-gray-200 p-4'>
            <h3 className='text-sm font-semibold text-gray-900 mb-4'>Data Snapshot</h3>
            <div className='flex flex-col items-center'>
              <div className='relative w-28 h-28 mb-4'>
                <svg className='w-full h-full' viewBox='0 0 100 100'>
                  <circle cx='50' cy='50' r='40' fill='none' stroke='#e5e7eb' strokeWidth='8' />
                  <circle cx='50' cy='50' r='40' fill='none' stroke='#10b981' strokeWidth='8' strokeDasharray='125 360' strokeDashoffset='-31' />
                </svg>
                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                  <p className='text-sm font-bold text-gray-900'>6.2 GB</p>
                  <p className='text-[10px] text-gray-600'>TOTAL SIZE</p>
                </div>
              </div>
              <div className='space-y-2 w-full text-[11px]'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-blue-500'></span>
                    <span className='text-gray-600'>Standard Object</span>
                  </div>
                  <span className='font-medium text-gray-900'>3.1 GB</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-purple-500'></span>
                    <span className='text-gray-600'>Custom Object</span>
                  </div>
                  <span className='font-medium text-gray-900'>1.1 GB</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-orange-500'></span>
                    <span className='text-gray-600'>File & Attachment</span>
                  </div>
                  <span className='font-medium text-gray-900'>1.1 GB</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-green-500'></span>
                    <span className='text-gray-600'>Meta Data</span>
                  </div>
                  <span className='font-medium text-gray-900'>1.1 GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Largest Objects */}
          <div className='bg-white rounded border border-gray-200 p-4'>
            <h3 className='text-sm font-semibold text-gray-900 mb-4'>Top 5 Largest Object</h3>
            <div className='space-y-2 text-[11px]'>
              <div className='flex items-center justify-between'>
                <span className='text-gray-900 font-medium'>Account</span>
                <span className='text-gray-600'>765 MB</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-gray-900 font-medium'>Opportunity</span>
                <span className='text-gray-600'>565 MB</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-gray-900 font-medium'>Contact</span>
                <span className='text-gray-600'>465 MB</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-gray-900 font-medium'>Case</span>
                <span className='text-gray-600'>365 MB</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-gray-900 font-medium'>Lead</span>
                <span className='text-gray-600'>340 MB</span>
              </div>
            </div>
            <a href='#' className='block mt-3 text-[11px] font-medium text-blue-600 hover:underline text-center'>View All →</a>
          </div>
        </div>
      </div>

      {/* Recent Backup Runs */}
      <div className='bg-white rounded border border-gray-200 p-4'>
        <h3 className='text-sm font-semibold text-gray-900 mb-4'>Recent Backup Runs</h3>
        <div className='overflow-x-auto'>
          <table className='w-full text-xs'>
            <thead>
              <tr className='border-b border-gray-200'>
                <th className='text-left px-2 py-2 font-medium text-gray-600'>Start Time</th>
                <th className='text-left px-2 py-2 font-medium text-gray-600'>Status</th>
                <th className='text-left px-2 py-2 font-medium text-gray-600'>Duration</th>
                <th className='text-left px-2 py-2 font-medium text-gray-600'>Data Size</th>
                <th className='text-left px-2 py-2 font-medium text-gray-600'>Objects</th>
                <th className='text-left px-2 py-2 font-medium text-gray-600'>Data Backup</th>
                <th className='text-left px-2 py-2 font-medium text-gray-600'>Backup Type</th>
                <th className='text-left px-2 py-2 font-medium text-gray-600'>Action</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((i) => (
                <tr key={i} className='border-b border-gray-200 hover:bg-gray-50'>
                  <td className='px-2 py-2 text-gray-900'>Apr 2{4-i}, 2026, 02:00 AM</td>
                  <td className='px-2 py-2'><span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700'>Completed</span></td>
                  <td className='px-2 py-2 text-gray-900'>40m 10s</td>
                  <td className='px-2 py-2 text-gray-900'>5.2 GB</td>
                  <td className='px-2 py-2 text-gray-900'>152</td>
                  <td className='px-2 py-2 text-gray-900'>Full Backup</td>
                  <td className='px-2 py-2 text-gray-900'>Scheduled</td>
                  <td className='px-2 py-2 text-gray-400'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z' />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
