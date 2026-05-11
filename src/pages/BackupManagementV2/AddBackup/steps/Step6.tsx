import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { TIMEZONES, getDefaultTimezone } from '../../../../utils/timezones';

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

type Step6Props = {
  onNext: (scheduleConfig: ScheduleConfig) => void;
  onBack: () => void;
  initialScheduleConfig?: ScheduleConfig | null;
};

type FrequencyType = 'One Time' | 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

const mapBackendFrequencyToFrontend = (frequency: string): FrequencyType => {
  const frequencyMap: Record<string, FrequencyType> = {
    'ONCE': 'One Time',
    'HOURLY': 'Hourly',
    'DAILY': 'Daily',
    'WEEKLY': 'Weekly',
    'MONTHLY': 'Monthly',
    'CUSTOM': 'Custom',
  };
  return frequencyMap[frequency] || 'Daily';
};

const mapBackendDaysToFrontend = (days?: string[]): string[] => {
  if (!days) return ['Mon'];
  const dayMap: Record<string, string> = {
    'MON': 'Mon',
    'TUE': 'Tue',
    'WED': 'Wed',
    'THU': 'Thu',
    'FRI': 'Fri',
    'SAT': 'Sat',
    'SUN': 'Sun',
  };
  return days.map(d => dayMap[d] || d);
};

const mapBackendMonthsToFrontend = (months?: string[]): string[] => {
  if (!months) return ['Jan'];
  const monthMap: Record<string, string> = {
    'JAN': 'Jan',
    'FEB': 'Feb',
    'MAR': 'Mar',
    'APR': 'Apr',
    'MAY': 'May',
    'JUN': 'Jun',
    'JUL': 'Jul',
    'AUG': 'Aug',
    'SEP': 'Sep',
    'OCT': 'Oct',
    'NOV': 'Nov',
    'DEC': 'Dec',
  };
  return months.map(m => monthMap[m] || m);
};

export default function Step6({ onNext, onBack, initialScheduleConfig }: Step6Props) {
  const navigate = useNavigate();

  const initializeState = () => {
    if (initialScheduleConfig?.scheduling) {
      const scheduling = initialScheduleConfig.scheduling;
      return {
        frequency: mapBackendFrequencyToFrontend(scheduling.frequency),
        runMode: (!scheduling.startDate && !scheduling.startTime) ? 'runNow' as const : 'scheduleRun' as const,
        selectedDays: mapBackendDaysToFrontend(scheduling.weekDays),
        selectedMonths: mapBackendMonthsToFrontend(scheduling.selectedMonths),
        dayOfMonth: String(scheduling.monthDate || '01').padStart(2, '0'),
        startTime: scheduling.startTime || '12:00',
        timeZone: initialScheduleConfig.timeZone,
        startDate: scheduling.startDate || dayjs().format('YYYY-MM-DD'),
        endDate: scheduling.endDate || dayjs().add(7, 'days').format('YYYY-MM-DD'),
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

  const initialState = initializeState();
  const [frequency, setFrequency] = useState<FrequencyType>(initialState.frequency);
  const [runMode, setRunMode] = useState<'runNow' | 'scheduleRun'>(initialState.runMode);
  const [selectedDays, setSelectedDays] = useState<string[]>(initialState.selectedDays);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(initialState.selectedMonths);
  const [dayOfMonth, setDayOfMonth] = useState(initialState.dayOfMonth);
  const [startTime, setStartTime] = useState(initialState.startTime);
  const [timeZone, setTimeZone] = useState(initialState.timeZone);
  const [startDate, setStartDate] = useState(initialState.startDate);
  const [endDate, setEndDate] = useState(initialState.endDate);
  const [backupFrequency, setBackupFrequency] = useState('Daily');
  const [backupIn, setBackupIn] = useState('1 Hour');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayMap: Record<string, string> = {
    'Mon': 'MON',
    'Tue': 'TUE',
    'Wed': 'WED',
    'Thu': 'THU',
    'Fri': 'FRI',
    'Sat': 'SAT',
    'Sun': 'SUN',
  };
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMap: Record<string, string> = {
    'Jan': 'JAN',
    'Feb': 'FEB',
    'Mar': 'MAR',
    'Apr': 'APR',
    'May': 'MAY',
    'Jun': 'JUN',
    'Jul': 'JUL',
    'Aug': 'AUG',
    'Sep': 'SEP',
    'Oct': 'OCT',
    'Nov': 'NOV',
    'Dec': 'DEC',
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  return (
    <div className='h-full bg-gray-50 p-8 flex flex-col overflow-hidden'>
      {/* Header with Step Indicator */}
      <div className='flex items-start justify-between mb-8 flex-shrink-0'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Backup Scheduling</h1>
          <p className='text-gray-600 mt-2'>Define how frequently your backup should be performed</p>
        </div>
        <span className='text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-full whitespace-nowrap'>
          Step 6 of 7
        </span>
      </div>

      {/* Main Content */}
      <div className='flex-grow overflow-y-auto min-h-0 bg-white rounded-lg border border-gray-200 p-6'>
        {/* Frequency Buttons */}
        <div className='mb-8'>
          <div className='flex gap-2 flex-wrap'>
            {(['One Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'] as FrequencyType[]).map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  frequency === freq
                    ? 'bg-blue-600 text-white'
                    : 'border border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Content Based on Frequency */}
        {frequency === 'One Time' && (
          <div className='space-y-6'>
            {/* Info Message */}
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3'>
              <svg className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
              </svg>
              <p className='text-sm text-blue-700'>If you choose this option, you may not be able to automate this backup in future, this option is best suitable for one time backup.</p>
            </div>

            {/* Run Mode Selection */}
            <div className='space-y-3'>
              <label className='flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors' style={{borderColor: runMode === 'runNow' ? '#3b82f6' : '#d1d5db', backgroundColor: runMode === 'runNow' ? '#eff6ff' : 'transparent'}}>
                <input
                  type='radio'
                  name='runMode'
                  value='runNow'
                  checked={runMode === 'runNow'}
                  onChange={(e) => setRunMode(e.target.value as 'runNow' | 'scheduleRun')}
                  className='mt-1'
                />
                <div>
                  <p className='font-medium text-gray-900'>Run Now</p>
                  <p className='text-sm text-gray-600'>Backup will run once hit Run Backup</p>
                </div>
              </label>

              <label className='flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors' style={{borderColor: runMode === 'scheduleRun' ? '#3b82f6' : '#d1d5db', backgroundColor: runMode === 'scheduleRun' ? '#eff6ff' : 'transparent'}}>
                <input
                  type='radio'
                  name='runMode'
                  value='scheduleRun'
                  checked={runMode === 'scheduleRun'}
                  onChange={(e) => setRunMode(e.target.value as 'runNow' | 'scheduleRun')}
                  className='mt-1'
                />
                <div>
                  <p className='font-medium text-gray-900'>Schedule Backup Run</p>
                  <p className='text-sm text-gray-600'>Backup will run at scheduled time</p>
                </div>
              </label>
            </div>

            {/* Schedule Fields - Only show when Schedule Run is selected */}
            {runMode === 'scheduleRun' && (
              <div className='space-y-6 pt-4 border-t border-gray-200'>
                <div className='grid grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-2'>Date</label>
                    <input
                      type='date'
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder='Select Date'
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                    <input
                      type='time'
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {frequency === 'Hourly' && (
          <div className='space-y-6'>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Backup in Every</label>
                <select
                  value={backupIn}
                  onChange={(e) => setBackupIn(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>1 Hour</option>
                  <option>2 Hours</option>
                  <option>6 Hours</option>
                  <option>12 Hours</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                <input
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starting Time</label>
                <input
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
          </div>
        )}

        {frequency === 'Daily' && (
          <div className='space-y-6'>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Run At</label>
                <input
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
              <input
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>
        )}

        {frequency === 'Weekly' && (
          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-3'>Select Days</label>
              <div className='flex gap-2 flex-wrap'>
                {days.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                <input
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
              <input
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>
        )}

        {frequency === 'Monthly' && (
          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-3'>Select Months</label>
              <div className='flex gap-2 flex-wrap'>
                {months.map((month) => (
                  <button
                    key={month}
                    onClick={() => toggleMonth(month)}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedMonths.includes(month)
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Day of the Month</label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={String(day).padStart(2, '0')}>
                      {String(day).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                <input
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                <input
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
          </div>
        )}

        {frequency === 'Custom' && (
          <div className='space-y-6'>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts On Date</label>
                <input
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Ends On Date</label>
                <input
                  type='date'
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Backup Frequency</label>
                <select
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starting Time</label>
                <input
                  type='time'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className='flex justify-between gap-4 flex-shrink-0 mt-8'>
        <button
          onClick={() => navigate('/backup-management')}
          className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
        >
          Cancel
        </button>
        <div className='flex gap-4'>
          <button
            onClick={onBack}
            className='px-6 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <button
            onClick={() => {
              // Validate required fields
              if (frequency !== 'One Time' && !startDate) {
                alert('Please select a start date');
                return;
              }
              if (frequency !== 'One Time' && !startTime) {
                alert('Please select a starting time');
                return;
              }
              if (frequency === 'One Time' && runMode === 'scheduleRun' && !startDate) {
                alert('Please select a start date');
                return;
              }
              if (frequency === 'One Time' && runMode === 'scheduleRun' && !startTime) {
                alert('Please select a starting time');
                return;
              }
              if (frequency === 'Weekly' && selectedDays.length === 0) {
                alert('Please select at least one day');
                return;
              }
              if (frequency === 'Monthly' && selectedMonths.length === 0) {
                alert('Please select at least one month');
                return;
              }

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
                scheduling.weekDays = selectedDays.map((day: string) => dayMap[day] || day);
                scheduling.startDate = startDate;
                scheduling.startTime = startTime;
              } else if (frequency === 'Monthly') {
                const dayNum = parseInt(dayOfMonth);
                if (dayNum < 1 || dayNum > 31) {
                  alert('Please enter a valid day of month (1-31)');
                  return;
                }
                scheduling.monthDate = dayNum;
                scheduling.selectedMonths = selectedMonths.map((month: string) => monthMap[month] || month);
                scheduling.startDate = startDate;
                scheduling.startTime = startTime;
              } else if (frequency === 'Custom') {
                scheduling.frequency = 'CUSTOM';
                scheduling.interval = 1;
                scheduling.startDate = startDate;
                if (!endDate || endDate === '') {
                  alert('Please select an end date for custom schedule');
                  return;
                }
                scheduling.endDate = endDate;
                scheduling.startTime = startTime;
              }

              const scheduleConfig: ScheduleConfig = {
                timeZone,
                type: frequency === 'One Time' ? 'ONE_TIME' : 'INCREMENTAL',
                scheduling,
              };
              onNext(scheduleConfig);
            }}
            className='px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700'
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
