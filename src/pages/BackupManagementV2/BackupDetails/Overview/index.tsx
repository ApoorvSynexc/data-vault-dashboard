import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import { formatBytes, formatDate, formatTime, formatDateTime, capitalize, calculateNextRun } from '../../../../utils';
import EditScheduleModal from './EditScheduleModal';

type OverviewProps = {
  backup: any;
  onViewTriggers?: () => void;
};

export default function Overview({ backup, onViewTriggers }: OverviewProps) {
  const { slug } = useParams();
  const backupConfigService = useBackupConfigService();
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);

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

  // Derive schedule from triggerResults when not explicitly set
  const derivedSchedule = displayData?.schedule
    ?? (displayData?.triggerResults ? 'REALTIME' : undefined);

  // objects array from detail API already has type: 'STANDARD' | 'CUSTOM'
  const objects: any[] = displayData?.objects ?? [];

  // sizes from API — no extra call needed
  const totalSizeBytes: number = displayData?.sizeInBytes ?? 0;
  const standardSizeBytes = objects.filter((o: any) => o.type?.toUpperCase() === 'STANDARD').reduce((s: number, o: any) => s + (o.sizeInBytes ?? 0), 0);
  const customSizeBytes   = objects.filter((o: any) => o.type?.toUpperCase() === 'CUSTOM').reduce((s: number, o: any) => s + (o.sizeInBytes ?? 0), 0);

  const top5 = [...objects]
    .sort((a, b) => (b.sizeInBytes ?? 0) - (a.sizeInBytes ?? 0))
    .slice(0, 5);

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
    <>
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
            <p className='text-xs text-gray-500'>{displayData?.backupStatus === 'SUCCESS' ? 'Successfully Completed' : displayData?.backupStatus === 'FAILED' ? 'Failed' : 'Pending'}</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Last Run</span>
            </div>
            <p className='text-sm font-semibold text-gray-900'>{formatDateTime(displayData?.lastBackupAt, displayData?.scheduleConfig?.timeZone)}</p>
            <p className='text-xs text-gray-500'>{displayData?.lastBackupAt ? formatDate(displayData.lastBackupAt, displayData?.scheduleConfig?.timeZone) : 'Never'}</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v-1h8v1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3h2v3h-2z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Data Size</span>
            </div>
            <p className='text-sm font-semibold text-gray-900'>{totalSizeBytes > 0 ? formatBytes(totalSizeBytes) : '--'}</p>
            <p className='text-xs text-gray-500'>Current Backup Size</p>
          </div>

          <div className='bg-gray-50 rounded p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M7 3a1 1 0 000 2h6a1 1 0 000-2H7zM4 7a1 1 0 011-1h10a1 1 0 011 1v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z' />
              </svg>
              <span className='text-xs font-medium text-gray-600'>Objects</span>
            </div>
            <p className='text-sm font-semibold text-gray-900'>{displayData?.objects?.length || 0}</p>
            <p className='text-xs text-gray-500'>{displayData?.objectNames?.length || 0} Objects Selected</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className='grid grid-cols-3 gap-4 items-start'>
        {/* Left Column - Backup Details & Scheduling */}
        <div className='col-span-2 space-y-4 self-start'>
          {/* Backup Details */}
          <div className='bg-white rounded border border-gray-200 p-4'>
            <h3 className='text-sm font-semibold text-gray-900 mb-4'>Backup Details</h3>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Name</span>
                <span className='text-xs font-medium text-gray-900'>{displayData?.name || 'N/A'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Source Platform</span>
                <span className='text-xs font-medium text-gray-900'>
                  {(() => {
                    const crmName = displayData?.crmDetail?.crmName || displayData?.crmName || displayData?.platform;
                    const connName = displayData?.crmDetail?.name;
                    if (crmName && connName) return `${crmName.charAt(0).toUpperCase() + crmName.slice(1)} (${connName})`;
                    return crmName || 'N/A';
                  })()}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Destination Platform</span>
                <span className='text-xs font-medium text-gray-900'>{displayData?.destinationDetail?.destinationName ?? displayData?.destinationDetail?.type ?? (displayData?.destinationId ? 'Cloud Storage' : 'N/A')}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Environment</span>
                <span className='text-xs font-medium text-gray-900'>{displayData?.crmDetail?.environment ? capitalize(displayData.crmDetail.environment) : displayData?.environment ? capitalize(displayData.environment) : 'N/A'}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Backup Type</span>
                <span className='text-xs font-medium text-gray-900'>
                  {displayData?.scheduleConfig?.type
                    ? capitalize(displayData.scheduleConfig.type)
                    : derivedSchedule === 'REALTIME'
                    ? 'Realtime'
                    : 'N/A'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Total Objects</span>
                <span className='text-xs font-medium text-gray-900'>{displayData?.objects?.length || 0} Objects</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-xs text-gray-600'>Triggered By</span>
                <span className='text-xs font-medium text-gray-900'>
                  {derivedSchedule === 'REALTIME' ? 'Realtime' : derivedSchedule === 'SCHEDULE' ? 'Schedule' : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Last 5 Triggers — only shown for realtime backups */}
          {derivedSchedule === 'REALTIME' && (
          <div className='bg-white rounded border border-gray-200 p-4'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-sm font-semibold text-gray-900'>Last 5 Triggers Created</h3>
              <button onClick={onViewTriggers} className='text-xs font-medium text-blue-600 hover:underline'>View All →</button>
            </div>
            <div className='space-y-2'>
              {(displayData?.triggerResults ?? []).length === 0 ? (
                <p className='text-xs text-gray-500 text-center py-2'>No triggers available</p>
              ) : (
                [...(displayData?.triggerResults ?? [])].slice(0, 5).map((t: any) => (
                  <div key={t.triggerName} className='flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0'>
                    <span className='text-xs text-gray-800 font-medium truncate mr-2'>{t.triggerName}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${t.status === 'EXIST' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          )}

          {/* Backup Scheduling — only shown for scheduled backups */}
          {derivedSchedule === 'SCHEDULE' && (
          <div className='bg-white rounded border border-gray-200 p-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-sm font-semibold text-gray-900'>Backup Scheduling</h3>
              <button onClick={() => setIsEditScheduleOpen(true)} className='text-xs font-medium text-blue-600 hover:underline'>Edit Schedule →</button>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Frequency</p>
                <p className='text-xs font-medium text-gray-900'>{displayData?.scheduleConfig?.scheduling?.frequency || '----'}</p>
              </div>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Time</p>
                <p className='text-xs font-medium text-gray-900'>{displayData?.scheduleConfig?.scheduling?.startTime ? formatTime(`2000-01-01T${displayData.scheduleConfig.scheduling.startTime}`, displayData?.scheduleConfig?.timeZone) : 'N/A'}</p>
              </div>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Next Run</p>
                <p className='text-xs font-medium text-gray-900'>
                  {calculateNextRun(
                    displayData?.scheduleConfig?.scheduling?.startTime,
                    displayData?.scheduleConfig?.scheduling?.startDate,
                    displayData?.scheduleConfig?.scheduling?.frequency,
                    displayData?.scheduleConfig?.scheduling?.interval,
                    displayData?.scheduleConfig?.timeZone
                  )}
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-600 mb-1'>Time Zone</p>
                <p className='text-xs font-medium text-gray-900'>{displayData?.scheduleConfig?.timeZone || 'N/A'}</p>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Right Column - Data Snapshot & Top Objects */}
        <div className='space-y-4'>
          {/* Data Snapshot */}
          <div className='bg-white rounded border border-gray-200 p-4'>
            <h3 className='text-sm font-semibold text-gray-900 mb-4'>Data Snapshot</h3>
            <div className='flex flex-col items-center'>
              <div className='relative w-28 h-28 mb-4'>
                {(() => {
                  const C = 2 * Math.PI * 40; // ≈ 251.3
                  const stdLen = totalSizeBytes > 0 ? (standardSizeBytes / totalSizeBytes) * C : 0;
                  const cusLen = totalSizeBytes > 0 ? (customSizeBytes / totalSizeBytes) * C : 0;
                  return (
                    <svg className='w-full h-full' viewBox='0 0 100 100'>
                      <circle cx='50' cy='50' r='40' fill='none' stroke='#e5e7eb' strokeWidth='8' />
                      {/* custom — purple, drawn first (larger segment) */}
                      {cusLen > 0 && (
                        <circle cx='50' cy='50' r='40' fill='none' stroke='#a855f7' strokeWidth='8'
                          strokeDasharray={`${cusLen} ${C - cusLen}`}
                          strokeDashoffset={C / 4 - stdLen} />
                      )}
                      {/* standard — blue, drawn on top so it's always visible */}
                      {stdLen > 0 && (
                        <circle cx='50' cy='50' r='40' fill='none' stroke='#3b82f6' strokeWidth='8'
                          strokeDasharray={`${stdLen} ${C - stdLen}`}
                          strokeDashoffset={C / 4} />
                      )}
                    </svg>
                  );
                })()}

                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                  <p className='text-sm font-bold text-gray-900'>{totalSizeBytes > 0 ? formatBytes(totalSizeBytes) : '--'}</p>
                  <p className='text-[10px] text-gray-600'>TOTAL SIZE</p>
                </div>
              </div>
              <div className='space-y-2 w-full text-[11px]'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-blue-500'></span>
                    <span className='text-gray-600'>Standard Object</span>
                  </div>
                  <span className='font-medium text-gray-900'>{standardSizeBytes > 0 ? formatBytes(standardSizeBytes) : '--'}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-purple-500'></span>
                    <span className='text-gray-600'>Custom Object</span>
                  </div>
                  <span className='font-medium text-gray-900'>{customSizeBytes > 0 ? formatBytes(customSizeBytes) : '--'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Largest Objects */}
          <div className='bg-white rounded border border-gray-200 p-4'>
            <h3 className='text-sm font-semibold text-gray-900 mb-4'>Top 5 Largest Object</h3>
            <div className='space-y-2 text-[11px]'>
              {top5.length === 0 ? (
                <p className='text-gray-500 text-center py-2'>No data available</p>
              ) : top5.map((o) => (
                <div key={o.name} className='flex items-center justify-between'>
                  <span className='text-gray-900 font-medium'>{o.name}</span>
                  <span className='text-gray-600'>{o.sizeInBytes ? formatBytes(o.sizeInBytes) : '--'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    {isEditScheduleOpen && (
      <EditScheduleModal backup={displayData} onClose={() => setIsEditScheduleOpen(false)} />
    )}
    </>
  );
}
