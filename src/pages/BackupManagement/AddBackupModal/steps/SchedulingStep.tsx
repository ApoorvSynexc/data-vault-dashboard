import Typography from '../../../../components/Typography';
import { SelectChevron } from '../components';
import type {
  ConditionType,
  DataScopeRow,
  DurationType,
  FieldDataType,
  FieldFilter,
  FilterOperator,
  ObjectField,
  ObjectFilterConfig,
  ScheduleMode,
  ScheduleType,
  WeekDay,
} from '../types';

type SchedulingStepProps = {
  scheduleMode: ScheduleMode;
  scheduleType: ScheduleType;
  duration: DurationType;
  interval: number;
  weekDays: WeekDay[];
  monthDate: number;
  timeZone: string;
  selectedFilterRows: DataScopeRow[];
  expandedFilterObjects: string[];
  objectFilters: Record<string, ObjectFilterConfig>;
  objectFields: Record<string, ObjectField[]>;
  objectFieldsLoading: Record<string, boolean>;
  operatorsByType: Record<FieldDataType, FilterOperator[]>;
  onScheduleTypeChange: (value: ScheduleType) => void;
  onDurationChange: (value: DurationType) => void;
  onIntervalChange: (value: number) => void;
  onWeekDaysChange: (value: WeekDay[]) => void;
  onMonthDateChange: (value: number) => void;
  onTimeZoneChange: (value: string) => void;
  onToggleFilterCard: (row: DataScopeRow, isOpen: boolean) => void;
  onUpdateObjectFilter: (rowId: string, patch: Partial<ObjectFilterConfig>) => void;
};

export function SchedulingStep({
  scheduleMode,
  scheduleType,
  duration,
  interval,
  weekDays,
  monthDate,
  timeZone,
  selectedFilterRows,
  expandedFilterObjects,
  objectFilters,
  objectFields,
  objectFieldsLoading,
  operatorsByType,
  onScheduleTypeChange,
  onDurationChange,
  onIntervalChange,
  onWeekDaysChange,
  onMonthDateChange,
  onTimeZoneChange,
  onToggleFilterCard,
  onUpdateObjectFilter,
}: SchedulingStepProps) {
  return (
    <>
      <Typography as='h2' variant='pageTitle' className='font-semibold'>
        Set Backup Schedule
      </Typography>
      <Typography className='mt-1' variant='bodySm' color='muted'>
        Define how frequently your backup should be performed.
      </Typography>

      <div className='mt-6 space-y-6'>
        {scheduleMode === 'schedule' && (
          <>
            <div>
              <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                Schedule Type
              </Typography>
              <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
                {(['one_time', 'incremental'] as ScheduleType[]).map((option) => (
                  <button
                    key={option}
                    type='button'
                    onClick={() => onScheduleTypeChange(option)}
                    className={[
                      'min-w-[110px] border-r border-blue-600 px-5 py-2 text-xs font-medium transition last:border-r-0',
                      scheduleType === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                    ].join(' ')}
                  >
                    {option === 'one_time' ? 'One-time' : 'Incremental'}
                  </button>
                ))}
              </div>
            </div>

            {scheduleType === 'incremental' && (
              <>
                <div>
                  <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                    Frequency
                  </Typography>
                  <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
                    {(['hour', 'day', 'week', 'month'] as DurationType[]).map((option) => (
                      <button
                        key={option}
                        type='button'
                        onClick={() => onDurationChange(option)}
                        className={[
                          'min-w-[72px] border-r border-blue-600 px-4 py-2 text-xs font-medium capitalize transition last:border-r-0',
                          duration === option ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50',
                        ].join(' ')}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {duration === 'hour' && (
                  <label className='block max-w-xs'>
                    <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                      Every (hours)
                    </Typography>
                    <div className='relative'>
                      <select
                        value={interval}
                        onChange={(e) => onIntervalChange(Number(e.target.value))}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      >
                        {[6, 12].map((h) => (
                          <option key={h} value={h}>Every {h} hours</option>
                        ))}
                      </select>
                      <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
                    </div>
                  </label>
                )}

                {duration === 'day' && (
                  <label className='block max-w-xs'>
                    <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                      Every (days)
                    </Typography>
                    <div className='relative'>
                      <select
                        value={interval}
                        onChange={(e) => onIntervalChange(Number(e.target.value))}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      >
                        {Array.from({ length: 15 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>Every {d} {d === 1 ? 'day' : 'days'}</option>
                        ))}
                      </select>
                      <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
                    </div>
                  </label>
                )}

                {duration === 'week' && (
                  <div>
                    <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                      On days
                    </Typography>
                    <div className='flex flex-wrap gap-2'>
                      {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as WeekDay[]).map((day) => {
                        const active = weekDays.includes(day);
                        return (
                          <button
                            key={day}
                            type='button'
                            onClick={() => onWeekDaysChange(active ? weekDays.filter((d) => d !== day) : [...weekDays, day])}
                            className={[
                              'h-9 w-12 rounded-lg border text-xs font-medium capitalize transition',
                              active ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400',
                            ].join(' ')}
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {duration === 'month' && (
                  <label className='block max-w-xs'>
                    <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                      On date
                    </Typography>
                    <div className='relative'>
                      <select
                        value={monthDate}
                        onChange={(e) => onMonthDateChange(Number(e.target.value))}
                        className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
                    </div>
                  </label>
                )}
              </>
            )}

            <label className='block max-w-xs'>
              <Typography as='span' className='mb-2 block' variant='label' color='secondary'>
                Time Zone
              </Typography>
              <div className='relative'>
                <select
                  value={timeZone}
                  onChange={(e) => onTimeZoneChange(e.target.value)}
                  className='h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                >
                  <option value='UTC'>UTC</option>
                  <option value='America/New_York'>America/New_York (EST/EDT)</option>
                  <option value='America/Los_Angeles'>America/Los_Angeles (PST/PDT)</option>
                  <option value='Europe/London'>Europe/London (GMT/BST)</option>
                  <option value='Asia/Kolkata'>Asia/Kolkata (IST)</option>
                  <option value='Asia/Tokyo'>Asia/Tokyo (JST)</option>
                </select>
                <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'><SelectChevron /></div>
              </div>
            </label>

            <div>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <div>
                  <Typography as='span' variant='label' color='secondary'>
                    Filters
                  </Typography>
                  <Typography variant='bodySm' color='muted' className='mt-1'>
                    Choose only the objects you want to filter. Fields load when you open a filter editor.
                  </Typography>
                </div>
                <Typography variant='bodySm' color='muted'>
                  {selectedFilterRows.length} selected {selectedFilterRows.length === 1 ? 'object' : 'objects'}
                </Typography>
              </div>
              <div className='space-y-3'>
                {selectedFilterRows.map((row) => {
                  const cfg = objectFilters[row.id] ?? { conditionType: 'AND', expression: '', fields: [] };
                  const isOpen = expandedFilterObjects.includes(row.id);
                  const fields = Array.isArray(objectFields[row.id]) ? objectFields[row.id] : [];
                  const isLoadingFields = objectFieldsLoading[row.id] ?? false;
                  const hasFilters = cfg.fields.length > 0 || (cfg.conditionType === 'CUSTOM' && cfg.expression.trim().length > 0);
                  const summaryText = cfg.fields.length > 0
                    ? `${cfg.fields.length} ${cfg.fields.length === 1 ? 'rule' : 'rules'}`
                    : 'No filters yet';

                  return (
                    <ScheduleFilterCard
                      key={row.id}
                      row={row}
                      cfg={cfg}
                      fields={fields}
                      isLoadingFields={isLoadingFields}
                      isOpen={isOpen}
                      hasFilters={hasFilters}
                      summaryText={summaryText}
                      operatorsByType={operatorsByType}
                      onToggleOpen={() => onToggleFilterCard(row, isOpen)}
                      onUpdateCfg={(patch) => onUpdateObjectFilter(row.id, patch)}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

type ScheduleFilterCardProps = {
  row: DataScopeRow;
  cfg: ObjectFilterConfig;
  fields: ObjectField[];
  isLoadingFields: boolean;
  isOpen: boolean;
  hasFilters: boolean;
  summaryText: string;
  operatorsByType: Record<FieldDataType, FilterOperator[]>;
  onToggleOpen: () => void;
  onUpdateCfg: (patch: Partial<ObjectFilterConfig>) => void;
};

function ScheduleFilterCard({
  row,
  cfg,
  fields,
  isLoadingFields,
  isOpen,
  hasFilters,
  summaryText,
  operatorsByType,
  onToggleOpen,
  onUpdateCfg,
}: ScheduleFilterCardProps) {
  function addField() {
    onUpdateCfg({ fields: [...cfg.fields, { name: '', dataType: null, operator: '=', value: '' }] });
  }

  function removeField(idx: number) {
    onUpdateCfg({ fields: cfg.fields.filter((_, i) => i !== idx) });
  }

  function updateField(idx: number, patch: Partial<FieldFilter>) {
    onUpdateCfg({ fields: cfg.fields.map((f, i) => i === idx ? { ...f, ...patch } : f) });
  }

  function handleFieldNameChange(idx: number, name: string) {
    const matched = fields.find((f) => f.name === name);
    const dataType = matched?.dataType ?? null;
    const operators = dataType ? operatorsByType[dataType] : operatorsByType.string;
    updateField(idx, { name, dataType, operator: operators[0], value: '' });
  }

  return (
    <div className={['overflow-hidden rounded-2xl border bg-white shadow-sm transition', hasFilters ? 'border-blue-200 shadow-blue-100/40' : 'border-gray-200'].join(' ')}>
      <button type='button' onClick={onToggleOpen} className='flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Typography variant='sectionTitle' color='secondary'>{row.name}</Typography>
            <span className={['rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]', hasFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'].join(' ')}>
              {hasFilters ? 'Configured' : 'Not set'}
            </span>
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <span className='rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600'>{summaryText}</span>
            <span className='rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600'>Condition: {cfg.conditionType}</span>
            {cfg.conditionType === 'CUSTOM' && cfg.expression.trim() && (
              <span className='rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700'>Custom expression</span>
            )}
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-[11px] font-medium text-gray-500'>{isOpen ? 'Hide editor' : hasFilters ? 'Edit filters' : 'Set filters'}</span>
          <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className={['h-4 w-4 text-gray-400 transition-transform', isOpen ? 'rotate-180' : ''].join(' ')}>
            <path d='M5 7.5L10 12.5L15 7.5' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className='space-y-4 border-t border-gray-100 bg-slate-50/40 px-5 py-5'>
          {isLoadingFields ? (
            <div className='flex items-center gap-2 text-xs text-gray-400'>
              <span className='h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent' />
              Loading fields...
            </div>
          ) : (
            <>
              <div>
                <Typography as='span' className='mb-2 block' variant='label' color='secondary'>Condition</Typography>
                <div className='inline-flex overflow-hidden rounded-lg border border-blue-600'>
                  {(['AND', 'OR', 'CUSTOM'] as ConditionType[]).map((ct) => (
                    <button key={ct} type='button' onClick={() => onUpdateCfg({ conditionType: ct })} className={['min-w-[64px] border-r border-blue-600 px-4 py-1.5 text-xs font-medium transition last:border-r-0', cfg.conditionType === ct ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'].join(' ')}>
                      {ct}
                    </button>
                  ))}
                </div>
              </div>

              {cfg.fields.length > 0 && (
                <div className='space-y-2'>
                  {cfg.fields.map((field, idx) => {
                    const availableOps = field.dataType ? operatorsByType[field.dataType] : operatorsByType.string;
                    return (
                      <div key={idx} className='flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3'>
                        <span className='flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-600'>{idx + 1}</span>
                        <div className='relative min-w-0 flex-1'>
                          <select value={field.name} onChange={(e) => handleFieldNameChange(idx, e.target.value)} className='h-9 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'>
                            <option value=''>Select field</option>
                            {fields.map((option) => (
                              <option key={option.name} value={option.name}>{option.label ?? option.name}</option>
                            ))}
                          </select>
                          <div className='pointer-events-none absolute inset-y-0 right-1.5 flex items-center'><SelectChevron /></div>
                        </div>
                        {field.dataType && <span className='flex-shrink-0 rounded-md bg-gray-100 px-2 py-1 font-mono text-[10px] text-gray-500'>{field.dataType}</span>}
                        <div className='relative flex-shrink-0'>
                          <select value={field.operator} onChange={(e) => updateField(idx, { operator: e.target.value as FilterOperator })} className='h-9 appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'>
                            {availableOps.map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                          <div className='pointer-events-none absolute inset-y-0 right-1.5 flex items-center'><SelectChevron /></div>
                        </div>
                        {field.dataType === 'boolean' ? (
                          <div className='relative min-w-0 flex-1'>
                            <select value={field.value} onChange={(e) => updateField(idx, { value: e.target.value })} className='h-9 w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-7 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'>
                              <option value=''>Select</option>
                              <option value='true'>true</option>
                              <option value='false'>false</option>
                            </select>
                            <div className='pointer-events-none absolute inset-y-0 right-1.5 flex items-center'><SelectChevron /></div>
                          </div>
                        ) : (
                          <input type={field.dataType === 'number' ? 'number' : field.dataType === 'date' ? 'date' : field.dataType === 'datetime' ? 'datetime-local' : 'text'} value={field.value} onChange={(e) => updateField(idx, { value: e.target.value })} placeholder='Value' className='h-9 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                        )}
                        <button type='button' onClick={() => removeField(idx)} className='flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition'>
                          <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='1.8' className='h-4 w-4'>
                            <path d='M5 5l10 10M15 5L5 15' strokeLinecap='round' />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {cfg.conditionType === 'CUSTOM' && (
                <label className='block'>
                  <Typography as='span' className='mb-1 block' variant='label' color='secondary'>Expression</Typography>
                  <Typography className='mb-2' variant='bodySm' color='muted'>
                    Reference fields by their number above, e.g. <span className='font-mono'>1 AND 2 OR 3</span>
                  </Typography>
                  <input type='text' value={cfg.expression} onChange={(e) => onUpdateCfg({ expression: e.target.value })} placeholder='e.g. 1 AND 2 OR 3' className='h-10 w-full rounded-lg border border-gray-300 px-4 font-mono text-xs text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                </label>
              )}

              <div className='flex items-center justify-between gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3'>
                <div>
                  <Typography variant='bodySm' color='secondary'>Add another rule for {row.name}</Typography>
                  <Typography variant='bodySm' color='muted' className='mt-1'>Combine multiple fields with {cfg.conditionType}.</Typography>
                </div>
                <button type='button' onClick={addField} className='inline-flex items-center gap-1.5 rounded-lg border border-blue-500 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition'>
                  <svg viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' className='h-3.5 w-3.5'>
                    <path d='M10 4v12M4 10h12' strokeLinecap='round' />
                  </svg>
                  Add Field
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
