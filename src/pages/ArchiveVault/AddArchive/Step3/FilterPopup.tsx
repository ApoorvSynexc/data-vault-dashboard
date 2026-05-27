import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../../../services/archival/archival.service';

// ── Dummy preview data ─────────────────────────────────────────────────────────
function generateDummyRows(objectName: string, count: number) {
  const statuses = ['Active', 'Inactive', 'Pending', 'Closed', 'New'];
  const owners = ['Alice Johnson', 'Bob Smith', 'Carol White', 'David Lee', 'Eva Brown'];
  return Array.from({ length: count }, (_, i) => ({
    id: `00${String(i + 1).padStart(15, '0')}`,
    name: `${objectName} Record ${i + 1}`,
    createdDate: new Date(Date.now() - (i + 1) * 86400000 * 7).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    owner: owners[i % owners.length],
    status: statuses[i % statuses.length],
  }));
}

export type FilterCondition = { id: string; field: string; operator: string; value: string };

export interface FilterPopupProps {
  objectId: string;
  objectName: string;
  recordCount?: number;
  crmId?: string | null;
  initialConditions?: FilterCondition[];
  onApply: (objectId: string, conditions: FilterCondition[]) => void;
  onClose: () => void;
}

const OPERATORS = [
  { label: 'equals', value: '=' },
  { label: 'not equals', value: '!=' },
  { label: 'contains', value: 'LIKE' },
  { label: 'starts with', value: 'LIKE' },
  { label: 'greater than', value: '>' },
  { label: 'less than', value: '<' },
  { label: 'greater than or equal', value: '>=' },
  { label: 'less than or equal', value: '<=' },
  { label: 'in', value: 'IN' },
];

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
    initialConditions.length > 0 ? initialConditions : [{ id: crypto.randomUUID(), field: '', operator: '=', value: '' }]
  );
  const [soqlQuery, setSoqlQuery] = useState('');
  const [customLogic, setCustomLogic] = useState('1 AND 2');

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewLimit, setPreviewLimit] = useState(5);
  const allDummyRows = useMemo(() => generateDummyRows(objectName, 50), [objectName]);
  const totalPreviewPages = Math.ceil(allDummyRows.length / previewLimit);
  const previewRows = allDummyRows.slice(previewPage * previewLimit, (previewPage + 1) * previewLimit);

  const { data: fieldsData, isLoading: isLoadingFields } = useQuery({
    queryKey: ['archival-fields', crmId, objectName],
    queryFn: async () => {
      const result = await archivalService.getFields(crmId ?? '', objectName);
      // response shape: { data: { fields: [...] } } or { fields: [...] } or plain array
      const payload = (result as any)?.data ?? result;
      const arr = (payload as any)?.fields ?? payload;
      return Array.isArray(arr) ? arr : [];
    },
    enabled: !!crmId && !!objectName,
    staleTime: 5 * 60 * 1000,
  });

  const fields = Array.isArray(fieldsData) ? fieldsData : [];

  const addCondition = () => {
    setConditions((prev) => [...prev, { id: crypto.randomUUID(), field: '', operator: '=', value: '' }]);
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    setConditions((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  };

  const clearAll = () => setConditions([]);

  const getConditionLabel = (idx: number) => {
    if (idx === 0) return 'WHERE';
    if (matchMode === 'ALL conditions') return 'AND';
    if (matchMode === 'ANY condition') return 'OR';
    // Custom: parse "1 AND 2 OR 3" to find the connector before this condition number
    const num = idx + 1;
    const before = new RegExp(`(?:^|\\s)(AND|OR)\\s+${num}(?:\\s|$)`, 'i');
    const match = before.exec(customLogic);
    if (match) return match[1].toUpperCase();
    return 'AND';
  };

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

        {/* Filter By tabs + est. records */}
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
          {recordCount !== undefined && (
            <span className='text-sm text-gray-400'>
              Est. <span className='font-semibold text-blue-600'>{recordCount.toLocaleString()}</span> records of {recordCount.toLocaleString()}
            </span>
          )}
        </div>

        {filterTab === 'SOQL' ? (
          <>
            {/* SOQL editor */}
            <div className='flex-1 min-h-0 px-6 py-4 flex flex-col gap-3 overflow-y-auto'>
              <textarea
                value={soqlQuery}
                onChange={(e) => setSoqlQuery(e.target.value)}
                placeholder='Insert SOQL here ......'
                className='w-full flex-1 resize-none px-4 py-3 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700'
                style={{ border: '1px solid #E2E8F0', minHeight: 140, background: '#FAFBFC' }}
              />
            </div>
            {/* SOQL footer */}
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
              <button key={tab} onClick={() => setMatchMode(tab)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${matchMode === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {tab}
              </button>
            ))}
          </div>
          {matchMode === 'Custom' && (
            <input
              type='text'
              value={customLogic}
              onChange={(e) => setCustomLogic(e.target.value)}
              placeholder='e.g. 1 AND 2'
              className='flex-1 px-3 py-1.5 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20'
              style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
            />
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
                {/* Row number */}
                <span className='text-xs font-medium text-gray-500 w-5 flex-shrink-0 text-right'>{idx + 1}.</span>
                {/* WHERE / AND / OR label */}
                <span className='text-xs font-semibold w-12 flex-shrink-0' style={{ color: '#155DFC' }}>
                  {getConditionLabel(idx)}
                </span>

                {/* Field Name dropdown — from API */}
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
                        onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
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
                    {OPERATORS.map((op) => (
                      <option key={op.label} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9' /></svg>
                  </span>
                </div>

                {/* Value input */}
                <input
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                  placeholder='Value'
                  className='flex-1 px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20'
                  style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                />

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

        {/* Bottom bar: Add condition + Clear All | Preview Records */}
        <div className='flex items-center justify-between px-6 py-3 border-t border-gray-100 flex-shrink-0'>
          <div className='flex items-center gap-4'>
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
          <button
            onClick={() => { setShowPreview((v) => !v); setPreviewPage(0); }}
            className='text-sm font-medium text-blue-600 hover:underline transition-colors'>
            {showPreview ? 'Hide Preview' : 'Preview Records'}
          </button>
        </div>

        {/* Preview table */}
        {showPreview && (
          <div className='border-t border-gray-100 flex-shrink-0'>
            {/* Preview toolbar: rows label + limit dropdown */}
            <div className='flex items-center justify-between px-6 py-2 bg-gray-50 border-b border-gray-100'>
              <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>
                Preview — {allDummyRows.length} matching records
              </span>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-gray-400'>Rows per page</span>
                <div className='relative'>
                  <select
                    value={previewLimit}
                    onChange={(e) => { setPreviewLimit(Number(e.target.value)); setPreviewPage(0); }}
                    className='appearance-none pl-3 pr-7 py-1 text-xs rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20'
                    style={{ border: '1px solid #E2E8F0', color: '#33363F' }}
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400'>
                    <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='6 9 12 15 18 9' /></svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className='overflow-x-auto' style={{ maxHeight: 220 }}>
              <table className='w-full border-collapse text-xs'>
                <thead className='sticky top-0 bg-white z-10'>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {['#', 'ID', 'Name', 'Created Date', 'Owner', 'Status'].map((col) => (
                      <th key={col} className='px-4 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap'>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F8FAFC' }}
                      className='hover:bg-gray-50 transition-colors'>
                      <td className='px-4 py-2 text-gray-400 tabular-nums'>{previewPage * previewLimit + idx + 1}</td>
                      <td className='px-4 py-2 text-gray-500 font-mono'>{row.id}</td>
                      <td className='px-4 py-2 text-gray-800 font-medium whitespace-nowrap'>{row.name}</td>
                      <td className='px-4 py-2 text-gray-500 whitespace-nowrap'>{row.createdDate}</td>
                      <td className='px-4 py-2 text-gray-600 whitespace-nowrap'>{row.owner}</td>
                      <td className='px-4 py-2'>
                        <span className='px-2 py-0.5 rounded-full text-xs font-medium'
                          style={{
                            background: row.status === 'Active' ? 'rgba(22,163,74,0.1)' : row.status === 'Closed' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                            color: row.status === 'Active' ? '#16a34a' : row.status === 'Closed' ? '#ef4444' : '#ca8a04',
                          }}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Preview pagination */}
            <div className='flex items-center justify-between px-6 py-2 border-t border-gray-100'>
              <span className='text-xs text-gray-400'>
                Showing {previewPage * previewLimit + 1}–{Math.min((previewPage + 1) * previewLimit, allDummyRows.length)} of {allDummyRows.length}
              </span>
              <div className='flex items-center gap-1'>
                <button
                  onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                  disabled={previewPage === 0}
                  className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>
                  ‹ Prev
                </button>
                {Array.from({ length: Math.min(totalPreviewPages, 5) }, (_, i) => i).map((i) => (
                  <button key={i} onClick={() => setPreviewPage(i)}
                    className='w-6 h-6 rounded-full text-xs font-medium transition-colors'
                    style={{
                      background: previewPage === i ? '#155DFC' : 'transparent',
                      color: previewPage === i ? 'white' : '#64748B',
                    }}>
                    {i + 1}
                  </button>
                ))}
                {totalPreviewPages > 5 && <span className='text-gray-400 text-xs'>...</span>}
                <button
                  onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages - 1, p + 1))}
                  disabled={previewPage >= totalPreviewPages - 1}
                  className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>
                  Next ›
                </button>
              </div>
            </div>
          </div>
        )}

          </>
        )}

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0'>
          <button onClick={onClose}
            className='px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>
            Cancel
          </button>
          <button
            onClick={() => onApply(objectId, conditions)}
            className='px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors'
            style={{ background: '#155DFC' }}>
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
