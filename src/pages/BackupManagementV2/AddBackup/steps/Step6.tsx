import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ScheduleConfig = {
  timeZone: string;
  type: string;
  scheduling: {
    frequency: string;
    interval: number;
  };
};

type Step6Props = {
  onNext: (scheduleConfig: ScheduleConfig) => void;
  onBack: () => void;
};

type FrequencyType = 'OFF' | 'Hourly' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

export default function Step6({ onNext, onBack }: Step6Props) {
  const navigate = useNavigate();
  const [frequency, setFrequency] = useState<FrequencyType>('Daily');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon']);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['Jan']);
  const [dayOfMonth, setDayOfMonth] = useState('01');
  const [time, setTime] = useState('12:00 AM');
  const [timeZone, setTimeZone] = useState('(GMT-04:00) Eastern Time(US & Canada)');
  const [startDate, setStartDate] = useState('March 26, 2026');
  const [endDate, setEndDate] = useState('March 30, 2026');
  const [backupFrequency, setBackupFrequency] = useState('Daily');
  const [backupIn, setBackupIn] = useState('1 Hour');

  const days = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    <div className='h-screen bg-gray-50 p-8 flex flex-col overflow-hidden'>
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
            {(['OFF', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Custom'] as FrequencyType[]).map((freq) => (
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
        {frequency === 'OFF' && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3'>
            <svg className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z' clipRule='evenodd' />
            </svg>
            <p className='text-sm text-blue-700'>If you choose this option, you may not be able to automate this backup in future, this option is best suitable for one time backup.</p>
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
                  <option>{timeZone}</option>
                </select>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starting At</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>{time}</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
                <input
                  type='text'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder='March 26, 2026'
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
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>{time}</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>{timeZone}</option>
                </select>
              </div>
            </div>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
              <input
                type='text'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder='March 26, 2026'
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
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>{time}</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>{timeZone}</option>
                </select>
              </div>
            </div>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts From</label>
              <input
                type='text'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder='March 26, 2026'
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
                <input
                  type='text'
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>{time}</option>
                </select>
              </div>
            </div>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option>{timeZone}</option>
              </select>
            </div>
          </div>
        )}

        {frequency === 'Custom' && (
          <div className='space-y-6'>
            <div className='grid grid-cols-2 gap-6'>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Starts On Date</label>
                <input
                  type='text'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Ends On Date</label>
                <input
                  type='text'
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
                <label className='block text-sm font-semibold text-gray-900 mb-2'>Time</label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option>{time}</option>
                </select>
              </div>
            </div>
            <div>
              <label className='block text-sm font-semibold text-gray-900 mb-2'>Time Zone</label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option>{timeZone}</option>
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
              // Build scheduling based on frequency
              const scheduling: any = {
                frequency: frequency === 'OFF' ? 'ONCE' : frequency.toUpperCase(),
                interval: 1,
              };

              // Add frequency-specific fields
              if (frequency === 'Hourly') {
                scheduling.interval = parseInt(backupIn.split(' ')[0]) || 1;
              } else if (frequency === 'Weekly') {
                scheduling.weekDays = selectedDays.length > 0 ? selectedDays : ['MON'];
              } else if (frequency === 'Monthly') {
                scheduling.monthDate = parseInt(dayOfMonth) || 1;
              } else if (frequency === 'Custom') {
                // For custom, use the selected backup frequency
                scheduling.frequency = backupFrequency.toUpperCase();
                scheduling.interval = 1;
              }

              const scheduleConfig: ScheduleConfig = {
                timeZone,
                type: 'INCREMENTAL',
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
