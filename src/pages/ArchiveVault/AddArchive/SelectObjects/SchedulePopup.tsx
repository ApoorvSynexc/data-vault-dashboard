import { useState } from 'react';
import dayjs from 'dayjs';
import { TIMEZONES, getDefaultTimezone } from '../../../../utils/timezones';

type FrequencyType = 'One Time' | 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

export type ScheduleConfig = {
  timeZone: string;
  type: string;
  scheduling: {
    frequency: string;
    interval: number;
    weekDays?: string[];
    monthDate?: number;
    selectedMonths?: string[];
    startDate?: string;
    endDate?: string;
    startTime?: string;
  };
};

export interface SchedulePopupProps {
  objectName: string;
  onApply: (config: ScheduleConfig) => void;
  onClose: () => void;
}

const dayMap: Record<string, string> = { Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN' };
const monthMap: Record<string, string> = { Jan: 'JAN', Feb: 'FEB', Mar: 'MAR', Apr: 'APR', May: 'MAY', Jun: 'JUN', Jul: 'JUL', Aug: 'AUG', Sep: 'SEP', Oct: 'OCT', Nov: 'NOV', Dec: 'DEC' };
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SchedulePopup({ objectName, onApply, onClose }: SchedulePopupProps) {
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [frequency, setFrequency] = useState<FrequencyType>('Daily');
  const [runMode, setRunMode] = useState<'runNow' | 'scheduleRun'>('runNow');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon']);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['Jan']);
  const [dayOfMonth, setDayOfMonth] = useState('01');
  const [startTime, setStartTime] = useState('12:00');
  const [timeZone, setTimeZone] = useState(getDefaultTimezone().value);
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().add(7, 'days').format('YYYY-MM-DD'));
  const [backupIn, setBackupIn] = useState('1 Hour');
  const [backupFrequency, setBackupFrequency] = useState('Daily');

  const handleSave = () => {
    const scheduling: any = {
      frequency: frequency === 'One Time' ? 'ONCE' : frequency.toUpperCase(),
      interval: 1,
    };

    if (frequency === 'One Time') {
      if (runMode === 'scheduleRun') {
        scheduling.startDate = startDate;
        scheduling.startTime = startTime;
      }
    } else if (frequency === 'Hourly') {
      scheduling.interval = parseInt(backupIn.split(' ')[0]) || 1;
      scheduling.startDate = startDate;
      scheduling.startTime = startTime;
    } else if (frequency === 'Daily') {
      scheduling.startDate = startDate;
      scheduling.startTime = startTime;
    } else if (frequency === 'Weekly') {
      scheduling.weekDays = selectedDays.map((d) => dayMap[d] || d);
      scheduling.startDate = startDate;
      scheduling.startTime = startTime;
    } else if (frequency === 'Monthly') {
      scheduling.monthDate = parseInt(dayOfMonth);
      scheduling.selectedMonths = selectedMonths.map((m) => monthMap[m] || m);
      scheduling.startDate = startDate;
      scheduling.startTime = startTime;
    } else if (frequency === 'Custom') {
      scheduling.startDate = startDate;
      scheduling.endDate = endDate;
      scheduling.startTime = startTime;
    }

    onApply({
      timeZone,
      type: frequency === 'One Time' ? 'ONE_TIME' : 'INCREMENTAL',
      scheduling,
    });
  };

  const inputCls = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className='bg-white rounded-2xl w-full flex flex-col' style={{ maxWidth: 680, maxHeight: '86vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className='flex items-center justify-between px-8 pt-7 pb-5' style={{ borderBottom: '1.5px solid #F1F5F9' }}>
          <div>
            <h2 className='font-bold' style={{ fontSize: 20, color: '#111827' }}>Add Schedule</h2>
            <p className='text-sm mt-0.5' style={{ color: '#64748B' }}>
              Configure archive schedule for <span className='font-medium text-gray-700'>{objectName}</span>
            </p>
          </div>
          <button onClick={onClose} className='p-2 rounded-lg hover:bg-gray-100 transition' style={{ color: '#6B7280' }}>
            <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className='flex-1 overflow-y-auto px-8 py-6'>

          {/* Override toggle */}
          <div className='flex items-center justify-between gap-4 mb-6 p-4 rounded-xl'
            style={{ background: overrideEnabled ? 'rgba(21,93,252,0.04)' : '#F8FAFC', border: `1px solid ${overrideEnabled ? 'rgba(21,93,252,0.18)' : '#E2E8F0'}`, transition: 'all 0.2s' }}>
            <div className='flex items-start gap-3'>
              <div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5'
                style={{ background: overrideEnabled ? 'rgba(21,93,252,0.1)' : '#EEF2F7' }}>
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke={overrideEnabled ? '#155DFC' : '#94A3B8'} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <circle cx='12' cy='12' r='3' /><path d='M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14' />
                </svg>
              </div>
              <div>
                <p className='text-sm font-semibold' style={{ color: overrideEnabled ? '#155DFC' : '#374151' }}>
                  Use a custom schedule for this object
                </p>
                <p className='text-xs mt-0.5' style={{ color: '#64748B' }}>
                  Override the global archive schedule and set an independent frequency just for <span className='font-medium text-gray-700'>{objectName}</span>.
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              type='button'
              onClick={() => setOverrideEnabled((v) => !v)}
              className='flex-shrink-0 relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none'
              style={{ width: 44, height: 24, background: overrideEnabled ? '#155DFC' : '#CBD5E1' }}
              aria-checked={overrideEnabled}
              role='switch'>
              <span
                className='inline-block rounded-full bg-white shadow transition-transform duration-200'
                style={{ width: 18, height: 18, transform: overrideEnabled ? 'translateX(22px)' : 'translateX(3px)' }}
              />
            </button>
          </div>

          {/* Frequency buttons — always visible, disabled when override is off */}
          <div className={`flex gap-2 flex-wrap mb-6 transition-opacity ${!overrideEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {(['One Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'] as FrequencyType[]).map((freq) => (
              <button key={freq} onClick={() => setFrequency(freq)} disabled={!overrideEnabled}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${frequency === freq ? 'bg-blue-600 text-white' : 'border border-blue-600 text-blue-600 hover:bg-blue-50'}`}>
                {freq}
              </button>
            ))}
          </div>

          {/* Frequency content — always visible, disabled when override is off */}
          <div className={`transition-opacity ${!overrideEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
          {frequency === 'One Time' && (
            <div className='space-y-4'>
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3'>
                <svg className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
                </svg>
                <p className='text-sm text-blue-700'>If you choose this option, you may not be able to automate this backup in future, this option is best suitable for one time backup.</p>
              </div>
              <div className='space-y-3'>
                <label className='flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors'
                  style={{ borderColor: runMode === 'runNow' ? '#3b82f6' : '#d1d5db', background: runMode === 'runNow' ? '#eff6ff' : 'transparent' }}>
                  <input type='radio' name='runMode' value='runNow' checked={runMode === 'runNow'} onChange={() => setRunMode('runNow')} className='mt-1' />
                  <div>
                    <p className='font-medium text-gray-900 text-sm'>Run Now</p>
                    <p className='text-sm text-gray-600'>Backup will run once hit Run Backup</p>
                  </div>
                </label>
                <label className='flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors'
                  style={{ borderColor: runMode === 'scheduleRun' ? '#3b82f6' : '#d1d5db', background: runMode === 'scheduleRun' ? '#eff6ff' : 'transparent' }}>
                  <input type='radio' name='runMode' value='scheduleRun' checked={runMode === 'scheduleRun'} onChange={() => setRunMode('scheduleRun')} className='mt-1' />
                  <div>
                    <p className='font-medium text-gray-900 text-sm'>Schedule Backup Run</p>
                    <p className='text-sm text-gray-600'>Backup will run at scheduled time</p>
                  </div>
                </label>
              </div>
              {runMode === 'scheduleRun' && (
                <div className='space-y-4 pt-4 border-t border-gray-200'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-2'>Date</label>
                      <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                      <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                    <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                      {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hourly */}
          {frequency === 'Hourly' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Backup in Every</label>
                  <select value={backupIn} onChange={(e) => setBackupIn(e.target.value)} className={inputCls}>
                    <option>1 Hour</option><option>2 Hours</option><option>6 Hours</option><option>12 Hours</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                  <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                    {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                  <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Starting Time</label>
                  <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Daily */}
          {frequency === 'Daily' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Run At</label>
                  <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                  <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                    {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {/* Weekly */}
          {frequency === 'Weekly' && (
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-3'>Select Days</label>
                <div className='flex gap-2 flex-wrap'>
                  {ALL_DAYS.map((day) => (
                    <button key={day} onClick={() => setSelectedDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day])}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${selectedDays.includes(day) ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                  <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                  <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                    {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          {/* Monthly */}
          {frequency === 'Monthly' && (
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-3'>Select Months</label>
                <div className='flex gap-2 flex-wrap'>
                  {ALL_MONTHS.map((month) => (
                    <button key={month} onClick={() => setSelectedMonths((p) => p.includes(month) ? p.filter((m) => m !== month) : [...p, month])}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${selectedMonths.includes(month) ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                      {month}
                    </button>
                  ))}
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Day of the Month</label>
                  <select value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} className={inputCls}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d).padStart(2, '0')}>{String(d).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                  <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                  <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                    {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                  <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Custom */}
          {frequency === 'Custom' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts On Date</label>
                  <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Ends On Date</label>
                  <input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Backup Frequency</label>
                  <select value={backupFrequency} onChange={(e) => setBackupFrequency(e.target.value)} className={inputCls}>
                    <option>Daily</option><option>Weekly</option><option>Monthly</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Starting Time</label>
                  <input type='time' value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className={inputCls}>
                  {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                </select>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 px-8 py-5' style={{ borderTop: '1.5px solid #F1F5F9' }}>
          <button onClick={onClose} className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm'>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!overrideEnabled}
            className={`px-6 py-2 rounded-lg font-medium transition-colors text-sm ${overrideEnabled ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
