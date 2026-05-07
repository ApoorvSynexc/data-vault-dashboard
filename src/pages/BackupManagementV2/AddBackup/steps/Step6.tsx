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
};

type FrequencyType = 'One Time' | 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
type RunMode = 'runNow' | 'scheduleRun';

export default function Step6({ onNext, onBack }: Step6Props) {
  const navigate = useNavigate();
  const [frequency, setFrequency] = useState<FrequencyType>('Daily');
  const [runMode, setRunMode] = useState<RunMode>('runNow');
  const [selectedDays, setSelectedDays] = useState<string[]>(['MON']);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['JAN']);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [startTime, setStartTime] = useState('12:00');
  const [timeZone, setTimeZone] = useState(getDefaultTimezone().value);
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().add(7, 'days').format('YYYY-MM-DD'));
  const [interval, setInterval] = useState('1');

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayLabels: Record<string, string> = {
    'MON': 'Mon',
    'TUE': 'Tue',
    'WED': 'Wed',
    'THU': 'Thu',
    'FRI': 'Fri',
    'SAT': 'Sat',
    'SUN': 'Sun',
  };
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthLabels: Record<string, string> = {
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

  const handleNext = () => {
    // If Run Now is selected and frequency is One Time, just proceed
    if (runMode === 'runNow') {
      onNext({
        timeZone,
        type: 'ONE_TIME',
        scheduling: {
          frequency: 'ONCE',
          interval: 1,
        },
      });
      return;
    }

    // Build scheduling config for scheduled runs
    const frequencyMap: Record<FrequencyType, string> = {
      'One Time': 'ONCE',
      'Hourly': 'HOUR',
      'Daily': 'DAY',
      'Weekly': 'WEEK',
      'Monthly': 'MONTH',
      'Custom': 'CUSTOM',
    };

    const scheduleConfig: ScheduleConfig = {
      timeZone,
      type: 'INCREMENTAL',
      scheduling: {
        frequency: frequencyMap[frequency],
        interval: parseInt(interval) || 1,
        startTime: startTime === '' ? undefined : startTime,
        startDate: startDate === '' ? undefined : startDate,
        endDate: endDate === '' ? undefined : endDate,
      },
    };

    if (frequency === 'Weekly' && selectedDays.length > 0) {
      scheduleConfig.scheduling.weekDays = selectedDays;
    }

    if (frequency === 'Monthly') {
      scheduleConfig.scheduling.monthDate = parseInt(dayOfMonth) || 1;
      if (selectedMonths.length > 0) {
        scheduleConfig.scheduling.selectedMonths = selectedMonths;
      }
    }

    if (frequency === 'Custom' && endDate) {
      scheduleConfig.scheduling.endDate = endDate;
    }

    onNext(scheduleConfig);
  };

  return (
    <div className='h-screen bg-gray-50 p-8 flex flex-col overflow-hidden'>
      {/* Header */}
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
      <div className='flex-grow overflow-y-auto min-h-0'>
        <div className='bg-white rounded-lg border border-gray-200 p-6 space-y-8'>
          {/* Frequency Selection */}
          <div>
            <label className='block text-sm font-semibold text-gray-900 mb-4'>Backup Frequency</label>
            <div className='flex gap-2 flex-wrap'>
              {(['One Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'] as FrequencyType[]).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    frequency === freq
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Run Mode Selection */}
          <div>
            <label className='block text-sm font-semibold text-gray-900 mb-4'>Backup Execution</label>
            <div className='space-y-3'>
              <label className='flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50' style={{borderColor: runMode === 'runNow' ? '#3b82f6' : '#d1d5db', backgroundColor: runMode === 'runNow' ? '#eff6ff' : 'transparent'}}>
                <input
                  type='radio'
                  name='runMode'
                  value='runNow'
                  checked={runMode === 'runNow'}
                  onChange={(e) => setRunMode(e.target.value as RunMode)}
                  className='mt-1'
                />
                <div>
                  <p className='font-medium text-gray-900'>Run Now</p>
                  <p className='text-sm text-gray-600'>Backup will run once hit Run Backup</p>
                </div>
              </label>

              <label className='flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50' style={{borderColor: runMode === 'scheduleRun' ? '#3b82f6' : '#d1d5db', backgroundColor: runMode === 'scheduleRun' ? '#eff6ff' : 'transparent'}}>
                <input
                  type='radio'
                  name='runMode'
                  value='scheduleRun'
                  checked={runMode === 'scheduleRun'}
                  onChange={(e) => setRunMode(e.target.value as RunMode)}
                  className='mt-1'
                />
                <div>
                  <p className='font-medium text-gray-900'>Schedule Backup Run</p>
                  <p className='text-sm text-gray-600'>Backup will run at scheduled time</p>
                </div>
              </label>
            </div>
          </div>

          {/* Info Message for One Time */}
          {frequency === 'One Time' && (
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3'>
              <svg className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
              </svg>
              <p className='text-sm text-blue-700'>If you choose this option, you may not be able to automate this backup in future, this option is best suitable for one time backup.</p>
            </div>
          )}

          {/* Scheduling Options - Only show when Schedule Run is selected */}
          {runMode === 'scheduleRun' && frequency !== 'One Time' && (
            <div className='space-y-6 pt-4 border-t border-gray-200'>
              {/* Hourly */}
              {frequency === 'Hourly' && (
                <div className='grid grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-2'>Every (hours)</label>
                    <input
                      type='number'
                      min='1'
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
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
              )}

              {/* Daily */}
              {frequency === 'Daily' && (
                <div className='grid grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-2'>Start From</label>
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
              )}

              {/* Weekly */}
              {frequency === 'Weekly' && (
                <div className='space-y-6'>
                  <div className='grid grid-cols-2 gap-6'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-2'>Start From</label>
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
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-3'>Days of Week</label>
                    <div className='flex gap-2 flex-wrap'>
                      {days.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                            selectedDays.includes(day)
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:border-blue-300'
                          }`}
                        >
                          {dayLabels[day]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly */}
              {frequency === 'Monthly' && (
                <div className='space-y-6'>
                  <div className='grid grid-cols-2 gap-6'>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-2'>Start From</label>
                      <input
                        type='date'
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-semibold text-gray-900 mb-2'>Day of Month</label>
                      <input
                        type='number'
                        min='1'
                        max='31'
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
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
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-3'>Months</label>
                    <div className='flex gap-2 flex-wrap'>
                      {months.map((month) => (
                        <button
                          key={month}
                          onClick={() => toggleMonth(month)}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                            selectedMonths.includes(month)
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:border-blue-300'
                          }`}
                        >
                          {monthLabels[month]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom */}
              {frequency === 'Custom' && (
                <div className='grid grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-2'>Start Date</label>
                    <input
                      type='date'
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-semibold text-gray-900 mb-2'>End Date</label>
                    <input
                      type='date'
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                </div>
              )}

              {/* Time Zone (for all scheduled runs) */}
              {frequency !== 'Hourly' && (
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex justify-between gap-4 mt-8 flex-shrink-0'>
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
            onClick={handleNext}
            className='px-6 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700'
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
