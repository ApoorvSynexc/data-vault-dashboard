import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../../../services/archival/archival.service';

type FieldDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'id';

export type FilterCondition = { id: string; field: string; dataType: FieldDataType | null; operator: string; value: string };

export interface FilterPopupProps {
  objectId: string;
  objectName: string;
  recordCount?: number;
  crmId?: string | null;
  initialConditions?: FilterCondition[];
  onApply: (objectId: string, conditions: FilterCondition[], matchMode: 'ALL conditions' | 'ANY condition' | 'Custom', customLogic: string) => void;
  onClose: () => void;
}

type FilterOperator = '>' | '<' | '>=' | '<=' | '=' | '!=' | 'IN' | 'LIKE';

const OP_LABELS: Record<FilterOperator, string> = {
  '=': 'equals', '!=': 'not equals', '>': 'greater than', '<': 'less than',
  '>=': 'greater than or equal', '<=': 'less than or equal', 'IN': 'in', 'LIKE': 'contains',
};

const OPERATORS_BY_TYPE: Record<FieldDataType, FilterOperator[]> = {
  string:   ['=', '!=', 'LIKE', 'IN'],
  number:   ['=', '!=', '>', '<', '>=', '<='],
  boolean:  ['=', '!='],
  date:     ['=', '!=', '>', '<', '>=', '<='],
  datetime: ['=', '!=', '>', '<', '>=', '<='],
  id:       ['=', '!=', 'IN'],
};

export default function FilterPopup({
  objectId,
  objectName,
  recordCount,
  crmId,
  initialConditions = [],
  onApply,
  onClose,
}: FilterPopupProps) {
  const archivalService = useArchivalService();

  const [filterTab, setFilterTab] = useState<'Field Level' | 'SOQL'>('Field Level');
  const [matchMode, setMatchMode] = useState<'ALL conditions' | 'ANY condition' | 'Custom'>('ALL conditions');
  const [conditions, setConditions] = useState<FilterCondition[]>(
    initialConditions.length > 0 ? initialConditions : [{ id: crypto.randomUUID(), field: '', dataType: null, operator: '=', value: '' }]
  );
  const [soqlQuery, setSoqlQuery] = useState('');
  const [customLogic, setCustomLogic] = useState('1 AND 2');
  const [customLogicTouched, setCustomLogicTouched] = useState(false);

  const { data: fieldsData, isLoading: isLoadingFields } = useQuery({
    queryKey: ['archival-fields', crmId, objectName],
    queryFn: async () => {
      const result = await archivalService.getFields(crmId ?? '', objectName);
      const payload = (result as any)?.data ?? result;
      const arr = (payload as any)?.fields ?? payload;
      return Array.isArray(arr) ? arr : [];
    },
    enabled: !!crmId && !!objectName,
    staleTime: 5 * 60 * 1000,
  });

  const fields = Array.isArray(fieldsData) ? fieldsData : [];

  const addCondition = () => {
    setConditions((prev) => [...prev, { id: crypto.randomUUID(), field: '', dataType: null, operator: '=', value: '' }]);
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    setConditions((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  };

  const handleFieldChange = (id: string, apiName: string) => {
    const matched = fields.find((f: any) => f.apiName === apiName);
    const rawType = (matched?.dataType as string | undefined)?.toLowerCase();
    const dataType: FieldDataType | null = rawType && rawType in OPERATORS_BY_TYPE ? (rawType as FieldDataType) : 'string';
    const operator = OPERATORS_BY_TYPE[dataType ?? 'string'][0];
    updateCondition(id, { field: apiName, dataType, operator, value: '' });
  };

  const clearAll = () => setConditions([]);

  const getConditionLabel = (idx: number) => {
    if (idx === 0) return 'WHERE';
    if (matchMode === 'ALL conditions') return 'AND';
    if (matchMode === 'ANY condition') return 'OR';
    const num = idx + 1;
    const before = new RegExp(`(?:^|[\\s(])(AND|OR)\\s+${num}(?:[\\s)]|$)`, 'i');
    const match = before.exec(customLogic);
    if (match) return match[1].toUpperCase();
    return 'AND';
  };

  const validateCustomLogic = (expr: string, count: number): string | null => {
    const trimmed = expr.trim();
    if (!trimmed) return 'Expression cannot be empty.';

    // Check for invalid characters — only digits, spaces, AND, OR, NOT, parentheses allowed
    if (/[^0-9\sAaNnDdOoRr()]/i.test(trimmed))
      return 'Only numbers, AND, OR, NOT and parentheses are allowed.';

    // Extract all numbers referenced
    const nums = trimmed.match(/\d+/g)?.map(Number) ?? [];
    if (nums.length === 0) return 'Expression must reference at least one condition number.';

    // All referenced numbers must be valid condition indices
    const outOfRange = nums.find((n) => n < 1 || n > count);
    if (outOfRange) return `Condition ${outOfRange} doesn't exist (you have ${count} condition${count !== 1 ? 's' : ''}).`;

    // Check balanced parentheses
    let depth = 0;
    for (const ch of trimmed) {
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth < 0) return 'Unmatched closing parenthesis ).'; }
    }
    if (depth !== 0) return 'Unmatched opening parenthesis (.';

    // Must not start or end with AND / OR
    if (/^(AND|OR)\b/i.test(trimmed)) return 'Expression cannot start with AND or OR.';
    if (/\b(AND|OR)$/i.test(trimmed)) return 'Expression cannot end with AND or OR.';

    // No double operators like AND AND or OR OR
    if (/\b(AND|OR)\s+(AND|OR)\b/i.test(trimmed)) return 'Two consecutive operators (AND/OR) are not allowed.';

    return null;
  };

  const customLogicError = matchMode === 'Custom' ? validateCustomLogic(customLogic, conditions.length) : null;
  const canApply = matchMode !== 'Custom' || customLogicError === null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30' onClick={onClose}>
      <div
        className='bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden'
        style={{ width: 680, maxHeight: '82vh', border: '1px solid #E2E8F0' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0'>
          <div>
            <h2 className='text-base font-bold text-gray-900'>{objectName}</h2>
            <p className='text-xs text-gray-400 mt-0.5'>Define filter conditions for this object</p>
          </div>
          <button onClick={onClose}
            className='p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {/* Filter By tabs */}
        <div className='flex items-center justify-between px-6 py-3 border-b border-gray-100 flex-shrink-0'>
          <div className='flex items-center gap-3'>
            <span className='text-sm text-gray-500'>Filter By</span>
            <div className='flex rounded-lg overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
              {(['Field Level', 'SOQL'] as const).map((tab) => (
                <button key={tab} onClick={() => setFilterTab(tab)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${filterTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filterTab === 'SOQL' ? (
          <>
            <div className='flex-1 min-h-0 px-6 py-4 flex flex-col gap-3 overflow-y-auto'>
              <textarea
                value={soqlQuery}
                onChange={(e) => setSoqlQuery(e.target.value)}
                placeholder='Insert SOQL here ......'
                className='w-full flex-1 resize-none px-4 py-3 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700'
                style={{ border: '1px solid #E2E8F0', minHeight: 140, background: '#FAFBFC' }}
              />
            </div>
            <div className='flex items-center px-6 py-4 border-t border-gray-100 flex-shrink-0'>
              <button
                className='flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors'
                onClick={() => {}}
              >
                Execute Query →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Match tabs */}
            <div className='flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0'>
              <span className='text-sm text-gray-500'>Match</span>
              <div className='flex rounded-lg overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
                {(['ALL conditions', 'ANY condition', 'Custom'] as const).map((tab) => (
                  <button key={tab} onClick={() => { setMatchMode(tab); setCustomLogicTouched(false); }}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${matchMode === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              {matchMode === 'Custom' && (
                <div className='flex-1 flex flex-col gap-1'>
                  <div className='relative'>
                    <input
                      type='text'
                      value={customLogic}
                      onChange={(e) => { setCustomLogic(e.target.value); setCustomLogicTouched(true); }}
                      onBlur={() => setCustomLogicTouched(true)}
                      placeholder='e.g. 1 AND ((2 AND 3) OR 4) OR 5'
                      className='w-full px-3 py-1.5 text-sm rounded-lg outline-none focus:ring-2 font-mono'
                      style={{
                        border: `1px solid ${customLogicTouched && customLogicError ? '#EF4444' : '#E2E8F0'}`,
                        color: '#33363F',
                        boxShadow: customLogicTouched && customLogicError ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                      }}
                    />
                    {/* Valid / invalid icon */}
                    {customLogicTouched && (
                      <span className='absolute right-2.5 top-1/2 -translate-y-1/2'>
                        {customLogicError
                          ? <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#EF4444' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg>
                          : <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#22C55E' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='20 6 9 17 4 12'/></svg>
                        }
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Conditions list */}
            <div className='flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 min-h-0'>
              {conditions.length === 0 ? (
                <div className='flex items-center gap-2 py-4 text-sm text-gray-400'>
                  <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                    <polygon points='22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' />
                  </svg>
                  No filter conditions — all{' '}
                  <span className='font-bold text-gray-800'>
                    {recordCount !== undefined ? recordCount.toLocaleString() : '—'}
                  </span>{' '}
                  {objectName} records will be archived.
                </div>
              ) : (
                conditions.map((cond, idx) => (
                  <div key={cond.id} className='flex items-center gap-2'>
                    <span className='text-xs font-medium text-gray-500 w-5 flex-shrink-0 text-right'>{idx + 1}.</span>
                    <span className='text-xs font-semibold w-12 flex-shrink-0' style={{ color: '#155DFC' }}>
                      {getConditionLabel(idx)}
                    </span>

                    {/* Field Name dropdown */}
                    <div className='flex-1 relative'>
                      {isLoadingFields ? (
                        <div className='w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2 text-gray-400'
                          style={{ border: '1px solid #E2E8F0' }}>
                          <div className='animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full' />
                          Loading fields...
                        </div>
                      ) : (
                        <>
                          <select
                            value={cond.field}
                            onChange={(e) => handleFieldChange(cond.id, e.target.value)}
                            className='w-full appearance-none px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white pr-8'
                            style={{ border: '1px solid #E2E8F0', color: cond.field ? '#33363F' : '#94a3b8' }}
                          >
                            <option value=''>Field Name</option>
                            {fields.filter((f: any) => f.dataType !== 'REFERENCE').map((f: any) => (
                              <option key={f.apiName} value={f.apiName}>{f.label || f.apiName}</option>
                            ))}
                          </select>
                          <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                            <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9' /></svg>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Operator dropdown */}
                    <div className='relative' style={{ width: 140 }}>
                      <select
                        value={cond.operator}
                        onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}
                        className='w-full appearance-none px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white pr-8'
                        style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                      >
                        {(OPERATORS_BY_TYPE[(cond.dataType?.toLowerCase() as FieldDataType) ?? 'string']).map((op) => (
                          <option key={op} value={op}>{OP_LABELS[op]}</option>
                        ))}
                      </select>
                      <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9' /></svg>
                      </span>
                    </div>

                    {/* Value input */}
                    {cond.dataType?.toLowerCase() === 'boolean' ? (
                      <div className='relative flex-1'>
                        <select
                          value={cond.value}
                          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                          className='w-full appearance-none px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white pr-8'
                          style={{ border: '1px solid #E2E8F0', color: cond.value ? '#33363F' : '#94a3b8' }}
                        >
                          <option value=''>Select</option>
                          <option value='true'>True</option>
                          <option value='false'>False</option>
                        </select>
                        <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9' /></svg>
                        </span>
                      </div>
                    ) : (
                      <input
                        type={cond.dataType?.toLowerCase() === 'integer' ? 'number' : cond.dataType?.toLowerCase() === 'date' ? 'date' : cond.dataType?.toLowerCase() === 'datetime' ? 'datetime-local' : 'text'}
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                        placeholder='Value'
                        className='flex-1 px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20'
                        style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                      />
                    )}

                    {/* Remove */}
                    <button onClick={() => removeCondition(cond.id)}
                      className='p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0'>
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bottom bar: Add condition + Clear All */}
            <div className='flex items-center px-6 py-3 border-t border-gray-100 flex-shrink-0 gap-4'>
              <button onClick={addCondition}
                className='flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors'>
                <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                  <line x1='12' y1='5' x2='12' y2='19' /><line x1='5' y1='12' x2='19' y2='12' />
                </svg>
                Add condition
              </button>
              {conditions.length > 0 && (
                <button onClick={clearAll}
                  className='flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors'>
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                  </svg>
                  Clear All
                </button>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0'>
          <button onClick={onClose}
            className='px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
            Cancel
          </button>
          <button
            onClick={() => { if (!canApply) { setCustomLogicTouched(true); return; } onApply(objectId, conditions, matchMode, customLogic); }}
            disabled={!canApply}
            className='px-5 py-2 text-sm font-medium rounded-lg transition-colors'
            style={{ background: canApply ? '#155DFC' : '#CBD5E1', color: canApply ? 'white' : '#94A3B8', cursor: canApply ? 'pointer' : 'not-allowed' }}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
