import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { TIMEZONES, getDefaultTimezone } from '../../../../utils/timezones';
import type { SelectedArchiveObject } from '../SelectObjects';
import ProgressBar from '../ProgressBar';

type FrequencyType = 'One Time' | 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

export type ArchiveScheduleConfig = {
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

interface Step4Props {
  crmId?: string | null;
  destinationId?: string | null;
  policyName?: string;
  description?: string;
  selectedObjects?: SelectedArchiveObject[];
  initialScheduleConfig?: ArchiveScheduleConfig | null;
  onNext: (scheduleConfig: ArchiveScheduleConfig, payload: Record<string, unknown>) => void;
  onBack: () => void;
}

const dayMap: Record<string, string> = { Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN' };
const monthMap: Record<string, string> = { Jan: 'JAN', Feb: 'FEB', Mar: 'MAR', Apr: 'APR', May: 'MAY', Jun: 'JUN', Jul: 'JUL', Aug: 'AUG', Sep: 'SEP', Oct: 'OCT', Nov: 'NOV', Dec: 'DEC' };
const backDayMap: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };
const backMonthMap: Record<string, string> = { JAN: 'Jan', FEB: 'Feb', MAR: 'Mar', APR: 'Apr', MAY: 'May', JUN: 'Jun', JUL: 'Jul', AUG: 'Aug', SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dec' };
const freqBackMap: Record<string, FrequencyType> = { ONCE: 'One Time', HOURLY: 'Hourly', DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom' };

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ALL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const OPERATOR_MAP: Record<string, string> = {
  'equals': '=', 'not equals': '!=', 'contains': 'LIKE',
  'does not contain': 'LIKE', 'starts with': 'LIKE',
  'greater than': '>', 'less than': '<',
  'greater than or equal': '>=', 'less than or equal': '<=',
  'in': 'IN',
};

export default function Step4({ crmId, destinationId, policyName = '', description = '', selectedObjects = [], initialScheduleConfig, onNext, onBack }: Step4Props) {
  const navigate = useNavigate();

  const scheduledObjects = selectedObjects.filter((o) => !!o.scheduleConfig);
  const unscheduledObjects = selectedObjects.filter((o) => !o.scheduleConfig);
  const allScheduled = unscheduledObjects.length === 0;

  const init = () => {
    if (initialScheduleConfig?.scheduling) {
      const s = initialScheduleConfig.scheduling;
      return {
        frequency: freqBackMap[s.frequency] ?? 'Daily' as FrequencyType,
        runMode: (!s.startDate && !s.startTime) ? 'runNow' as const : 'scheduleRun' as const,
        selectedDays: s.weekDays ? s.weekDays.map((d) => backDayMap[d] || d) : ['Mon'],
        selectedMonths: s.selectedMonths ? s.selectedMonths.map((m) => backMonthMap[m] || m) : ['Jan'],
        dayOfMonth: String(s.monthDate || '01').padStart(2, '0'),
        startTime: s.startTime || '12:00',
        timeZone: initialScheduleConfig.timeZone,
        startDate: s.startDate || dayjs().format('YYYY-MM-DD'),
        endDate: s.endDate || dayjs().add(7, 'days').format('YYYY-MM-DD'),
      };
    }
    return {
      frequency: 'Daily' as FrequencyType,
      runMode: 'runNow' as const,
      selectedDays: ['Mon'],
      selectedMonths: ['Jan'],
      dayOfMonth: '01',
      startTime: '12:00',
      timeZone: getDefaultTimezone().value,
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().add(7, 'days').format('YYYY-MM-DD'),
    };
  };

  const initial = init();
  const [frequency, setFrequency] = useState<FrequencyType>(initial.frequency);
  const [runMode, setRunMode] = useState<'runNow' | 'scheduleRun'>(initial.runMode);
  const [selectedDays, setSelectedDays] = useState<string[]>(initial.selectedDays);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(initial.selectedMonths);
  const [dayOfMonth, setDayOfMonth] = useState(initial.dayOfMonth);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [backupIn, setBackupIn] = useState('1 Hour');
  const [archiveFrequency, setArchiveFrequency] = useState('Daily');

  const inputCls = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white';

  const buildScheduleConfig = (): ArchiveScheduleConfig => {
    const scheduling: any = {
      frequency: frequency === 'One Time' ? 'ONCE' : frequency.toUpperCase(),
      interval: 1,
    };
    if (frequency === 'One Time') {
      if (runMode === 'scheduleRun') { scheduling.startDate = startDate; scheduling.startTime = startTime; }
    } else if (frequency === 'Hourly') {
      scheduling.interval = parseInt(backupIn.split(' ')[0]) || 1;
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Daily') {
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Weekly') {
      scheduling.weekDays = selectedDays.map((d) => dayMap[d] || d);
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Monthly') {
      scheduling.monthDate = parseInt(dayOfMonth);
      scheduling.selectedMonths = selectedMonths.map((m) => monthMap[m] || m);
      scheduling.startDate = startDate; scheduling.startTime = startTime;
    } else if (frequency === 'Custom') {
      scheduling.startDate = startDate; scheduling.endDate = endDate; scheduling.startTime = startTime;
    }
    return { timeZone, type: frequency === 'One Time' ? 'ONE_TIME' : 'INCREMENTAL', scheduling };
  };

  const buildCombinedPayload = (objects: SelectedArchiveObject[], globalSchedule: ArchiveScheduleConfig | null) => ({
    crmId: crmId ?? '',
    name: policyName || objects.map((o) => o.name).join(', '),
    description,
    destinationId: destinationId ?? '',
    objectNames: objects.map((o) => o.id),
    schedule: 'SCHEDULE',
    ...(globalSchedule ? { scheduleConfig: globalSchedule } : {}),
    objects: objects.map((obj) => {
      const payload = obj.archivalPayload;
      const perObjectSchedule = obj.scheduleConfig ?? null;
      return {
        id: obj.uuid,
        name: obj.id,
        type: obj.type,
        condition: payload?.condition ?? { type: 'AND' as const },
        field: (payload?.field ?? []).map((f) => ({
          name: f.name,
          dataType: (f.dataType ?? 'string').toUpperCase(),
          filter: { value: f.filter.value, operator: OPERATOR_MAP[f.filter.operator] ?? f.filter.operator },
        })),
        ...(perObjectSchedule ? { scheduleConfig: perObjectSchedule } : {}),
        ...(payload?.children && payload.children.length > 0 ? { children: payload.children } : {}),
      };
    }),
  });

  const handleNext = () => {
    if (!allScheduled) {
      if (frequency !== 'One Time' && !startDate) { alert('Please select a start date'); return; }
      if (frequency !== 'One Time' && !startTime) { alert('Please select a starting time'); return; }
      if (frequency === 'One Time' && runMode === 'scheduleRun' && !startDate) { alert('Please select a start date'); return; }
      if (frequency === 'One Time' && runMode === 'scheduleRun' && !startTime) { alert('Please select a starting time'); return; }
      if (frequency === 'Weekly' && selectedDays.length === 0) { alert('Please select at least one day'); return; }
      if (frequency === 'Monthly' && selectedMonths.length === 0) { alert('Please select at least one month'); return; }
      if (frequency === 'Custom' && !endDate) { alert('Please select an end date for custom schedule'); return; }
    }
    const globalConfig = allScheduled ? null : buildScheduleConfig();
    const payload = buildCombinedPayload(selectedObjects, globalConfig);
    onNext(globalConfig ?? (selectedObjects[0]?.scheduleConfig as ArchiveScheduleConfig) ?? buildScheduleConfig(), payload);
  };

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-6 min-h-0 gap-4'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/archive-vault' className='font-semibold text-sm text-gray-700 hover:text-blue-600 transition-colors'>
            Archive Vault
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Archive</span>
        </div>

        {/* Progress bar */}
        <ProgressBar activeStep={4} />

        {/* Header */}
        <div className='flex items-start justify-between flex-shrink-0'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Schedule Archive</h1>
            <p className='text-gray-600 mt-1'>Configure when data to be archived</p>
          </div>
          <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
            Step <span className='text-blue-600'>5</span> of 6
          </span>
        </div>

        {/* Already-scheduled objects summary */}
        {scheduledObjects.length > 0 && (
          <div className='rounded-xl flex flex-col gap-3 flex-shrink-0'
            style={{ border: '1px solid #BBF7D0', background: '#F0FDF4', padding: '16px 20px' }}>
            <div className='flex items-center gap-2'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='20 6 9 17 4 12' />
              </svg>
              <span className='text-sm font-semibold text-green-800'>
                {scheduledObjects.length === selectedObjects.length
                  ? 'All objects already have a schedule assigned'
                  : `${scheduledObjects.length} of ${selectedObjects.length} object${selectedObjects.length > 1 ? 's' : ''} already have a schedule assigned`}
              </span>
            </div>
            <div className='flex flex-col gap-2'>
              {scheduledObjects.map((obj) => {
                const s = obj.scheduleConfig!;
                const freqLabel = freqBackMap[s.scheduling.frequency] ?? s.scheduling.frequency;
                const timeStr = s.scheduling.startTime ? ` at ${s.scheduling.startTime}` : '';
                const dateStr = s.scheduling.startDate ? ` from ${s.scheduling.startDate}` : '';
                return (
                  <div key={obj.uuid} className='flex items-center gap-3 px-3 py-2 rounded-lg bg-white'
                    style={{ border: '1px solid #D1FAE5' }}>
                    <div className='w-2 h-2 rounded-full bg-green-500 flex-shrink-0' />
                    <span className='text-sm font-medium text-gray-800 flex-1'>{obj.name}</span>
                    <span className='text-xs text-gray-500 flex-shrink-0'>
                      {freqLabel}{timeStr}{dateStr} · {s.timeZone}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Schedule form — only shown if some objects need a schedule */}
        {!allScheduled && (
          <>
            {unscheduledObjects.length < selectedObjects.length && (
              <div className='rounded-xl flex-shrink-0 flex items-center gap-3 px-4 py-3'
                style={{ border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#2563EB' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0'>
                  <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
                </svg>
                <span className='text-sm text-blue-800'>
                  The schedule below will apply to{' '}
                  <span className='font-semibold'>
                    {unscheduledObjects.map((o) => o.name).join(', ')}
                  </span>
                </span>
              </div>
            )}

            <div className='bg-white rounded-xl p-6 flex flex-col gap-6 flex-1 min-h-0'
              style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

              {/* Frequency tabs */}
              <div className='flex gap-2 flex-wrap'>
                {(['One Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'] as FrequencyType[]).map((freq) => (
                  <button key={freq} onClick={() => setFrequency(freq)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${frequency === freq ? 'bg-blue-600 text-white' : 'border border-blue-600 text-blue-600 hover:bg-blue-50'}`}>
                    {freq}
                  </button>
                ))}
              </div>

              <div className='flex-1 min-h-0 overflow-y-auto'>

                {/* One Time */}
                {frequency === 'One Time' && (
                  <div className='space-y-5 w-full'>
                    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3'>
                      <svg className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
                        <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
                      </svg>
                      <p className='text-sm text-blue-700'>If you choose this option, you may not be able to automate this archive in future. This option is best suitable for one time archive.</p>
                    </div>
                    <div className='flex gap-4'>
                      <label className='flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex-1'
                        style={{ borderColor: runMode === 'runNow' ? '#3b82f6' : '#d1d5db', background: runMode === 'runNow' ? '#eff6ff' : 'transparent' }}>
                        <input type='radio' name='runMode' value='runNow' checked={runMode === 'runNow'} onChange={() => setRunMode('runNow')} className='mt-1 flex-shrink-0' />
                        <div>
                          <p className='font-semibold text-gray-900 text-sm'>Archive Now</p>
                          <p className='text-sm text-gray-500 mt-0.5'>Archive will run once hit Archive Button</p>
                        </div>
                      </label>
                      <label className='flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex-1'
                        style={{ borderColor: runMode === 'scheduleRun' ? '#3b82f6' : '#d1d5db', background: runMode === 'scheduleRun' ? '#eff6ff' : 'transparent' }}>
                        <input type='radio' name='runMode' value='scheduleRun' checked={runMode === 'scheduleRun'} onChange={() => setRunMode('scheduleRun')} className='mt-1 flex-shrink-0' />
                        <div>
                          <p className='font-semibold text-gray-900 text-sm'>Schedule Archive</p>
                          <p className='text-sm text-gray-500 mt-0.5'>Archive will run at scheduled time</p>
                        </div>
                      </label>
                    </div>
                    {runMode === 'scheduleRun' && (
                      <div className='space-y-5 pt-4 border-t border-gray-100'>
                        <div className='grid grid-cols-2 gap-5'>
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
                  <div className='space-y-5 w-full'>
                    <div className='grid grid-cols-2 gap-5'>
                      <div>
                        <label className='block text-sm font-semibold text-gray-900 mb-2'>Archive in Every</label>
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
                    <div className='grid grid-cols-2 gap-5'>
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
                  <div className='space-y-5 w-full'>
                    <div className='grid grid-cols-2 gap-5'>
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
                  <div className='space-y-5 w-full'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-3'>Select Days</label>
                      <div className='flex gap-2 flex-wrap'>
                        {ALL_DAYS.map((day) => (
                          <button key={day}
                            onClick={() => setSelectedDays((p) => p.includes(day) ? p.filter((d) => d !== day) : [...p, day])}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${selectedDays.includes(day) ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-5'>
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
                  <div className='space-y-5 w-full'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-3'>Select Months</label>
                      <div className='flex gap-2 flex-wrap'>
                        {ALL_MONTHS.map((month) => (
                          <button key={month}
                            onClick={() => setSelectedMonths((p) => p.includes(month) ? p.filter((m) => m !== month) : [...p, month])}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${selectedMonths.includes(month) ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                            {month}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-5'>
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
                    <div className='grid grid-cols-2 gap-5'>
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
                  <div className='space-y-5 w-full'>
                    <div className='grid grid-cols-2 gap-5'>
                      <div>
                        <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts On Date</label>
                        <input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className='block text-sm font-semibold text-gray-900 mb-2'>Ends On Date</label>
                        <input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-5'>
                      <div>
                        <label className='block text-sm font-semibold text-gray-900 mb-2'>Archive Frequency</label>
                        <select value={archiveFrequency} onChange={(e) => setArchiveFrequency(e.target.value)} className={inputCls}>
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
          </>
        )}

        {/* All scheduled — full-page confirmation */}
        {allScheduled && selectedObjects.length > 0 && (
          <div className='bg-white rounded-xl flex flex-col items-center justify-center gap-4 flex-1 py-12'
            style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className='w-14 h-14 rounded-full flex items-center justify-center' style={{ background: '#DCFCE7' }}>
              <svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#16A34A' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='20 6 9 17 4 12' />
              </svg>
            </div>
            <div className='text-center'>
              <p className='text-lg font-bold text-gray-900'>All schedules are set</p>
              <p className='text-sm text-gray-500 mt-1'>Every selected object already has a schedule. Click Next to proceed.</p>
            </div>
          </div>
        )}

      </div>

      {/* Sticky Footer */}
      <div className='flex-shrink-0 flex justify-between gap-4 px-6 py-4 bg-gray-50 border-t border-gray-200'>
        <button
          onClick={() => navigate('/archive-vault')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-3'>
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            className='px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700'
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
