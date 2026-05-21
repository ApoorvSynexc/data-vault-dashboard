import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { TIMEZONES, getDefaultTimezone } from '../../../../utils/timezones';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';

type ScheduleConfig = {
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

type FrequencyType = 'One Time' | 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

type Props = {
  backup: any;
  onClose: () => void;
};

const mapBackendFrequency = (f: string): FrequencyType => {
  const m: Record<string, FrequencyType> = { ONCE: 'One Time', HOURLY: 'Hourly', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom' };
  return m[f] || 'Daily';
};
const mapBackendDays = (days?: string[]) => {
  if (!days) return ['Mon'];
  const m: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };
  return days.map(d => m[d] || d);
};
const mapBackendMonths = (months?: string[]) => {
  if (!months) return ['Jan'];
  const m: Record<string, string> = { JAN: 'Jan', FEB: 'Feb', MAR: 'Mar', APR: 'Apr', MAY: 'May', JUN: 'Jun', JUL: 'Jul', AUG: 'Aug', SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dec' };
  return months.map(mo => m[mo] || mo);
};

const dayMap: Record<string, string> = { Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN' };
const monthMap: Record<string, string> = { Jan: 'JAN', Feb: 'FEB', Mar: 'MAR', Apr: 'APR', May: 'MAY', Jun: 'JUN', Jul: 'JUL', Aug: 'AUG', Sep: 'SEP', Oct: 'OCT', Nov: 'NOV', Dec: 'DEC' };

export default function EditScheduleModal({ backup, onClose }: Props) {
  const backupConfigService = useBackupConfigService();
  const queryClient = useQueryClient();
  const existing = backup?.scheduleConfig?.scheduling;
  const existingTz = backup?.scheduleConfig?.timeZone;

  const [frequency, setFrequency] = useState<FrequencyType>(existing ? mapBackendFrequency(existing.frequency) : 'Daily');
  const [runMode, setRunMode] = useState<'runNow' | 'scheduleRun'>((!existing?.startDate && !existing?.startTime) ? 'runNow' : 'scheduleRun');
  const [selectedDays, setSelectedDays] = useState<string[]>(mapBackendDays(existing?.weekDays));
  const [selectedMonths, setSelectedMonths] = useState<string[]>(mapBackendMonths(existing?.selectedMonths));
  const [dayOfMonth, setDayOfMonth] = useState(String(existing?.monthDate || '01').padStart(2, '0'));
  const [startTime, setStartTime] = useState(existing?.startTime || '12:00');
  const [timeZone, setTimeZone] = useState(existingTz || getDefaultTimezone().value);
  const [startDate, setStartDate] = useState(existing?.startDate || dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(existing?.endDate || dayjs().add(7, 'days').format('YYYY-MM-DD'));
  const [backupIn, setBackupIn] = useState('1 Hour');
  const [backupFrequency, setBackupFrequency] = useState('Daily');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const saveMutation = useMutation({
    mutationFn: (scheduleConfig: ScheduleConfig) =>
      backupConfigService.updateBackupConfig(backup.backupConfigId, { scheduleConfig }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-detail', backup.slug] });
      onClose();
    },
  });

  const handleSave = () => {
    const scheduling: any = { frequency: frequency === 'One Time' ? 'ONCE' : frequency.toUpperCase(), interval: 1 };

    if (frequency === 'One Time') {
      if (runMode === 'scheduleRun') { scheduling.startDate = startDate; scheduling.startTime = startTime; }
    } else if (frequency === 'Hourly') {
      scheduling.interval = parseInt(backupIn.split(' ')[0]) || 1;
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Daily') {
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Weekly') {
      scheduling.weekDays = selectedDays.map(d => dayMap[d] || d);
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Monthly') {
      scheduling.monthDate = parseInt(dayOfMonth);
      scheduling.selectedMonths = selectedMonths.map(m => monthMap[m] || m);
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Custom') {
      scheduling.startDate = startDate; scheduling.endDate = endDate; scheduling.startTime = startTime;
    }

    saveMutation.mutate({ timeZone, type: frequency === 'One Time' ? 'ONE_TIME' : 'INCREMENTAL', scheduling });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
      <div className='bg-white rounded-2xl w-full flex flex-col' style={{ maxWidth: '680px', maxHeight: '86vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div className='flex items-center justify-between px-8 pt-7 pb-5' style={{ borderBottom: '1.5px solid #F1F5F9' }}>
          <div>
            <h2 className='font-bold' style={{ fontSize: '20px', color: '#111827' }}>Edit Schedule</h2>
            <p className='text-sm mt-0.5' style={{ color: '#64748B' }}>Define how frequently your backup should be performed</p>
          </div>
          <button onClick={onClose} className='p-2 rounded-lg hover:bg-gray-100 transition' style={{ color: '#6B7280' }}>
            <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className='flex-1 overflow-y-auto px-8 py-6'>
          {/* Frequency Buttons */}
          <div className='flex gap-2 flex-wrap mb-6'>
            {(['One Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'] as FrequencyType[]).map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${frequency === freq ? 'bg-blue-600 text-white' : 'border border-blue-600 text-blue-600 hover:bg-blue-50'}`}
              >
                {freq}
              </button>
            ))}
          </div>

          {/* One Time */}
          {frequency === 'One Time' && (
            <div className='space-y-4'>
              {(['runNow', 'scheduleRun'] as const).map((mode) => (
                <label key={mode} className='flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50' style={{ borderColor: runMode === mode ? '#3b82f6' : '#d1d5db', backgroundColor: runMode === mode ? '#eff6ff' : 'transparent' }}>
                  <input type='radio' name='runMode' value={mode} checked={runMode === mode} onChange={() => setRunMode(mode)} className='mt-1' />
                  <div>
                    <p className='font-medium text-gray-900'>{mode === 'runNow' ? 'Run Now' : 'Schedule Backup Run'}</p>
                    <p className='text-sm text-gray-600'>{mode === 'runNow' ? 'Backup will run once immediately' : 'Backup will run at scheduled time'}</p>
                  </div>
                </label>
              ))}
              {runMode === 'scheduleRun' && (
                <div className='grid grid-cols-2 gap-4 pt-4 border-t border-gray-200'>
                  <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Date</label><input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
                  <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label><input type='time' value={startTime} onChange={e => setStartTime(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
                  <div className='col-span-2'><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label><select value={timeZone} onChange={e => setTimeZone(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>{TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}</select></div>
                </div>
              )}
            </div>
          )}

          {/* Hourly */}
          {frequency === 'Hourly' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Backup in Every</label><select value={backupIn} onChange={e => setBackupIn(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'><option>1 Hour</option><option>2 Hours</option><option>6 Hours</option><option>12 Hours</option></select></div>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label><select value={timeZone} onChange={e => setTimeZone(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>{TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}</select></div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label><input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starting Time</label><input type='time' value={startTime} onChange={e => setStartTime(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
              </div>
            </div>
          )}

          {/* Daily */}
          {frequency === 'Daily' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Run At</label><input type='time' value={startTime} onChange={e => setStartTime(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label><select value={timeZone} onChange={e => setTimeZone(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>{TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}</select></div>
              </div>
              <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label><input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
            </div>
          )}

          {/* Weekly */}
          {frequency === 'Weekly' && (
            <div className='space-y-4'>
              <div><label className='block text-sm font-semibold text-gray-900 mb-3'>Select Days</label><div className='flex gap-2 flex-wrap'>{days.map(day => <button key={day} onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])} className={`px-3 py-2 rounded-lg font-medium transition-colors ${selectedDays.includes(day) ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{day}</button>)}</div></div>
              <div className='grid grid-cols-2 gap-4'>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label><input type='time' value={startTime} onChange={e => setStartTime(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label><select value={timeZone} onChange={e => setTimeZone(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>{TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}</select></div>
              </div>
              <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label><input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
            </div>
          )}

          {/* Monthly */}
          {frequency === 'Monthly' && (
            <div className='space-y-4'>
              <div><label className='block text-sm font-semibold text-gray-900 mb-3'>Select Months</label><div className='flex gap-2 flex-wrap'>{months.map(month => <button key={month} onClick={() => setSelectedMonths(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month])} className={`px-3 py-2 rounded-lg font-medium transition-colors ${selectedMonths.includes(month) ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{month}</button>)}</div></div>
              <div className='grid grid-cols-2 gap-4'>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Day of the Month</label><select value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>{Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d).padStart(2, '0')}>{String(d).padStart(2, '0')}</option>)}</select></div>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label><input type='time' value={startTime} onChange={e => setStartTime(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label><select value={timeZone} onChange={e => setTimeZone(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>{TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}</select></div>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label><input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
              </div>
            </div>
          )}

          {/* Custom */}
          {frequency === 'Custom' && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starts On Date</label><input type='date' value={startDate} onChange={e => setStartDate(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Ends On Date</label><input type='date' value={endDate} onChange={e => setEndDate(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Backup Frequency</label><select value={backupFrequency} onChange={e => setBackupFrequency(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div>
                <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Starting Time</label><input type='time' value={startTime} onChange={e => setStartTime(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500' /></div>
              </div>
              <div><label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label><select value={timeZone} onChange={e => setTimeZone(e.target.value)} className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'>{TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}</select></div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 px-8 py-5' style={{ borderTop: '1.5px solid #F1F5F9' }}>
          <button onClick={onClose} className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className='px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed'
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
