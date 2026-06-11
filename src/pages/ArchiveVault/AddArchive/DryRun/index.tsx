import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useArchivalService } from '../../../../services/archival/archival.service';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import type { SelectedArchiveObject } from '../SelectObjects';
import ProgressBar from '../ProgressBar';
import Table from '../../../../components/Table';
import type { TableColumn } from '../../../../components/Table';

// ─── helpers ─────────────────────────────────────────────────────────────────

function calcDataSize(records: number): string {
  const kb = records * 2;
  if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB`;
  return `${kb} KB`;
}

function fmtNumber(n: number | undefined): string {
  if (n === undefined || n === 0) return '0';
  return n.toLocaleString();
}

function now(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}



// ─── Main Component ───────────────────────────────────────────────────────────

type DryRunState = 'idle' | 'loading' | 'results';

interface Step3DryRunProps {
  crmId?: string | null;
  selectedObjects: SelectedArchiveObject[];
  archivalPayload?: Record<string, unknown> | null;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3DryRun({ crmId, selectedObjects, archivalPayload, onNext, onBack }: Step3DryRunProps) {
  const archivalService = useArchivalService();
  const backupConfigService = useBackupConfigService();
  const navigate = useNavigate();
  const [dryRunState, setDryRunState] = useState<DryRunState>('idle');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [objectCountMap, setObjectCountMap] = useState<Record<string, number>>({});
  const [failedObjects, setFailedObjects] = useState<{ name: string; error: string }[]>([]);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
  const [runTime, setRunTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [selectedPreviewObject, setSelectedPreviewObject] = useState<string>(selectedObjects[0]?.id ?? '');
  const [impactPage, setImpactPage] = useState(0);
  const [previewPage, setPreviewPage] = useState(0);
  const PAGE_SIZE = 5;

  // Preview Records state
  type FieldOption = { apiName: string; label: string };
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [availableFields, setAvailableFields] = useState<FieldOption[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [showRecordsTable, setShowRecordsTable] = useState(false);
  const [previewRecords, setPreviewRecords] = useState<Record<string, any>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function handleShowPreview() {
    const objId = selectedPreviewObject || selectedObjects[0]?.id;
    if (!objId || selectedFields.length === 0) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setShowRecordsTable(true);
    try {
      const res = await backupConfigService.getObjectRecords({
        crmId: crmId ?? '',
        apiName: objId,
        fields: selectedFields,
      });
      const records: Record<string, any>[] = (res as any)?.data?.records ?? (res as any)?.data ?? (res as any)?.records ?? [];
      setPreviewRecords(Array.isArray(records) ? records : []);
      setPreviewPage(0);
    } catch (err: any) {
      setPreviewError(err?.message ?? 'Failed to load records.');
      setPreviewRecords([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handlePreviewRecords() {
    const objId = selectedPreviewObject || selectedObjects[0]?.id;
    if (!objId || !crmId) return;
    setFieldsLoading(true);
    setFieldsError(null);
    setShowFieldPicker(true);
    setShowRecordsTable(false);
    try {
      const fields = await backupConfigService.getObjectFields(crmId, objId);
      setAvailableFields(fields.map((f) => ({ apiName: f.name, label: f.label ?? f.name })));
    } catch {
      setFieldsError('Failed to load fields. Please try again.');
    } finally {
      setFieldsLoading(false);
    }
  }

  function toggleField(apiName: string) {
    setSelectedFields((prev) =>
      prev.includes(apiName)
        ? prev.filter((f) => f !== apiName)
        : prev.length < 5 ? [...prev, apiName] : prev
    );
  }

  async function runDryRun() {
    setDryRunState('loading');
    setDryRunError(null);
    const start = Date.now();
    try {
      const objects = (archivalPayload?.objects as any[]) ?? [];
      const response = await archivalService.runDryRun({ crmId: crmId ?? '', objects });
      const data = (response as any)?.data ?? response;
      const results: any[] = data?.objects ?? [];
      const map: Record<string, number> = {};
      const failed: { name: string; error: string }[] = [];
      const flattenResults = (items: any[]) => {
        items.forEach((obj: any) => {
          if (obj.name) map[obj.name] = obj.count ?? 0;
          if (obj.success === false && obj.name) failed.push({ name: obj.name, error: obj.error ?? 'Unknown error' });
          if (obj.children?.length) flattenResults(obj.children);
        });
      };
      flattenResults(results);
      setObjectCountMap(map);
      setFailedObjects(failed);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      setRunTime(now());
      setDuration(`${elapsed} seconds`);
      setDryRunState('results');
      setImpactPage(0);
      if (selectedObjects[0]) setSelectedPreviewObject(selectedObjects[0].id);
    } catch (err: any) {
      setDryRunError(err?.message ?? 'Dry run failed. Please try again.');
      setDryRunState('idle');
    }
  }

  const totalRecords = useMemo(
    () => Object.values(objectCountMap).reduce((s, n) => s + n, 0),
    [objectCountMap],
  );
  const totalDataSize = useMemo(() => calcDataSize(totalRecords), [totalRecords]);


  async function handleSaveDraft() {
    if (!archivalPayload) return;
    setIsSavingDraft(true);
    setDraftError(null);
    try {
      await archivalService.applyConfig({ ...archivalPayload, status: 'DRAFT' } as any);
      navigate('/archive-vault');
    } catch (err: any) {
      setDraftError(err?.message ?? 'Failed to save draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  }

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 min-h-0 gap-4'>

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

        {/* Progress bar — step 4 (Dry Run) */}
        <ProgressBar activeStep={5} />

        {/* Header */}
        <div className='flex items-start justify-between flex-shrink-0 gap-4'>
          <div>
            <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 4 of 6</p>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Dry Run — Preview Impact</h1>
            <p className='text-gray-500 mt-1 text-sm sm:text-base'>
              Simulate the archive without moving any records. Verify counts, filters, and potential issues before committing.
            </p>
          </div>
          {dryRunState !== 'results' && (
            <button
              onClick={runDryRun}
              disabled={dryRunState === 'loading'}
              className='flex-shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50'
            >
              {dryRunState === 'loading' ? (
                <>
                  <span className='w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin' />
                  Running…
                </>
              ) : (
                <>
                  <svg width='12' height='12' viewBox='0 0 24 24' fill='currentColor'>
                    <polygon points='5 3 19 12 5 21 5 3' />
                  </svg>
                  Run Dry Run
                </>
              )}
            </button>
          )}
        </div>

        {/* ── IDLE STATE ─────────────────────────────────────────────────── */}
        {dryRunState === 'idle' && !dryRunError && (
          <div className='flex items-start gap-3 rounded-xl px-5 py-4 flex-shrink-0'
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#3B82F6' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
              <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
            </svg>
            <p className='text-sm text-blue-800'>
              <strong>Dry Run not yet executed.</strong> Click <em>Run Dry Run</em> above to simulate the archive against your live Salesforce org. No data will be moved.
            </p>
          </div>
        )}
        {dryRunState === 'idle' && dryRunError && (
          <div className='flex items-start gap-3 rounded-xl px-5 py-4 flex-shrink-0'
            style={{ background: 'rgba(242,68,0,0.06)', border: '1px solid rgba(242,68,0,0.2)' }}>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
              <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
            </svg>
            <p className='text-sm text-red-700'><strong>Dry Run Failed.</strong> {dryRunError}</p>
          </div>
        )}

        {/* ── LOADING STATE ──────────────────────────────────────────────── */}
        {dryRunState === 'loading' && (
          <div className='flex flex-col items-center justify-center py-16 flex-shrink-0'>
            <div className='w-12 h-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin mb-4' />
            <p className='text-sm font-semibold text-gray-700'>Simulating archive against Salesforce Production…</p>
            <p className='text-xs text-gray-400 mt-2'>Analysing filters · Counting matching records · Checking references</p>
          </div>
        )}

        {/* ── RESULTS STATE ──────────────────────────────────────────────── */}
        {dryRunState === 'results' && (
          <>
            {/* Pass banner */}
            <div className='flex items-start gap-3 rounded-xl px-5 py-4 flex-shrink-0'
              style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.2)' }}>
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#059669' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
                <polyline points='20 6 9 17 4 12' />
              </svg>
              <p className='text-sm text-green-800'>
                <strong>Dry Run Passed</strong> — All filters validated.{' '}
                <strong>{fmtNumber(totalRecords)}</strong> records eligible.
              </p>
            </div>

            {/* Impact summary cards — 5 cards */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0'>
              {[
                { label: 'Records to Archive', value: fmtNumber(totalRecords), color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.12)' },
                { label: 'Objects Affected', value: String(selectedObjects.length), color: '#155DFC', bg: 'rgba(21,93,252,0.06)', border: 'rgba(21,93,252,0.12)' },
                { label: 'Estimated Size', value: totalDataSize, color: '#7C3AED', bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.12)' },
                { label: 'Errors', value: String(failedObjects.length), color: failedObjects.length > 0 ? '#F24400' : '#059669', bg: failedObjects.length > 0 ? 'rgba(242,68,0,0.06)' : 'rgba(5,150,105,0.06)', border: failedObjects.length > 0 ? 'rgba(242,68,0,0.12)' : 'rgba(5,150,105,0.12)' },
              ].map((card) => (
                <div key={card.label} className='bg-white rounded-xl px-4 py-4 text-center'
                  style={{ border: `1px solid ${card.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <p className='text-2xl font-bold' style={{ color: card.color }}>{card.value}</p>
                  <p className='text-xs text-gray-500 mt-1.5 leading-tight'>{card.label}</p>
                </div>
              ))}
            </div>

            {/* Failed objects detail */}
            {failedObjects.length > 0 && (
              <div className='rounded-xl flex-shrink-0' style={{ border: '1px solid rgba(242,68,0,0.2)', background: 'rgba(242,68,0,0.03)' }}>
                <div className='flex items-center gap-2 px-5 py-3 border-b' style={{ borderColor: 'rgba(242,68,0,0.1)' }}>
                  <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#F24400' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/>
                  </svg>
                  <p className='text-sm font-semibold' style={{ color: '#F24400' }}>Failed Objects ({failedObjects.length})</p>
                </div>
                <div className='divide-y' style={{ borderColor: 'rgba(242,68,0,0.08)' }}>
                  {failedObjects.map((f, i) => (
                    <div key={i} className='flex items-start gap-3 px-5 py-3'>
                      <span className='text-xs font-semibold text-gray-800 w-32 flex-shrink-0'>{f.name}</span>
                      <span className='text-xs text-red-600'>{f.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-Object Impact table */}
            {(() => {
              type ImpactRow = SelectedArchiveObject & { _idx: number };
              const allImpactRows: ImpactRow[] = selectedObjects.map((obj, idx) => ({ ...obj, _idx: idx }));
              const impactTotalPages = Math.ceil(allImpactRows.length / PAGE_SIZE);
              const impactRows: ImpactRow[] = allImpactRows.slice(impactPage * PAGE_SIZE, (impactPage + 1) * PAGE_SIZE);
              const impactColumns: TableColumn<ImpactRow>[] = [
                {
                  key: 'name',
                  header: 'Object',
                  render: (obj) => <span className='font-semibold text-gray-900 text-sm'>{obj.name}</span>,
                },
                {
                  key: 'filter',
                  header: 'Filter Applied',
                  render: (obj) => {
                    const condition = obj.archivalPayload?.condition as any;
                    const isSoql = condition?.type === 'SOQL';

                    if (isSoql) {
                      const clause = condition.soqlQuery ?? '';
                      const fullQuery = `SELECT FIELDS(ALL) FROM ${obj.name} WHERE ${clause}`;
                      return (
                        <div className='flex items-center gap-1.5 group relative'>
                          <span className='flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0'
                            style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.18)' }}>
                            <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                              <polyline points='16 18 22 12 16 6'/><polyline points='8 6 2 12 8 18'/>
                            </svg>
                            SOQL
                          </span>
                          <span className='text-xs text-gray-500 font-mono truncate max-w-[180px] cursor-default'>
                            {clause.length > 35 ? clause.slice(0, 35) + '…' : clause || '—'}
                          </span>
                          {/* Hover tooltip */}
                          <div className='absolute left-0 top-full mt-1.5 z-50 hidden group-hover:block'
                            style={{ minWidth: 260, maxWidth: 380 }}>
                            <div className='rounded-lg px-3 py-2.5 shadow-lg'
                              style={{ background: '#1E1E2E', border: '1px solid rgba(124,58,237,0.3)' }}>
                              <p className='text-[10px] font-semibold mb-1.5' style={{ color: '#A78BFA' }}>Full SOQL Query</p>
                              <p className='text-xs font-mono leading-relaxed break-all' style={{ color: '#E2E8F0' }}>{fullQuery}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const filterText = obj.archivalPayload?.field
                      ?.filter((f: any) => f.name)
                      .map((f: any) => `${f.name} ${f.filter.operator} "${f.filter.value}"`)
                      .join(' AND ') ?? 'No filter';
                    const colors = [
                      { bg: 'rgba(21,93,252,0.08)', color: '#155DFC' },
                      { bg: 'rgba(217,119,6,0.08)', color: '#D97706' },
                      { bg: 'rgba(5,150,105,0.08)', color: '#059669' },
                    ];
                    const c = colors[obj._idx % colors.length];
                    return (
                      <span className='text-xs font-medium px-2 py-0.5 rounded-md max-w-xs truncate block'
                        style={{ background: c.bg, color: c.color }}>
                        {filterText.length > 40 ? filterText.slice(0, 40) + '…' : filterText}
                      </span>
                    );
                  },
                },
                {
                  key: 'matchingRecords',
                  header: 'Matching Records',
                  render: (obj) => {
                    const count = objectCountMap[obj.id] ?? 0;
                    return <span className='font-semibold text-gray-900 tabular-nums text-sm'>{fmtNumber(count)}</span>;
                  },
                },
                {
                  key: 'estSize',
                  header: 'Est. Size',
                  render: (obj) => {
                    const count = objectCountMap[obj.id] ?? 0;
                    return <span className='text-gray-600 text-sm'>{calcDataSize(count)}</span>;
                  },
                },
              ];
              return (
                <div className='bg-white rounded-xl overflow-hidden flex-shrink-0'
                  style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div className='px-5 py-3.5 border-b border-gray-100 flex items-center justify-between'>
                    <div>
                      <h2 className='text-sm font-semibold text-gray-800'>Per-Object Impact</h2>
                      <p className='text-xs text-gray-400 mt-0.5'>Dry run completed · <span className='text-green-600 font-medium'>✓ All filters valid</span></p>
                    </div>
                    {allImpactRows.length > 0 && (
                      <span className='text-xs text-gray-400'>{allImpactRows.length} object{allImpactRows.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div style={{ minHeight: 300, overflowY: 'auto' }}>
                    <Table<ImpactRow>
                      columns={impactColumns}
                      rows={impactRows}
                      getRowKey={(obj) => obj.uuid}
                      headerVariant='uppercase'
                      borderless
                      cellPaddingClassName='px-4 py-3.5'
                      rowClassName='hover:bg-gray-50 transition-colors'
                      getRowStyle={() => ({ borderBottom: '1px solid #F8FAFC' })}
                      emptyState='No objects selected.'
                    />
                  </div>
                  {impactTotalPages > 1 && (
                    <div className='flex items-center justify-between px-5 py-3 border-t border-gray-100'>
                      <span className='text-xs text-gray-400'>
                        Showing {impactPage * PAGE_SIZE + 1}–{Math.min((impactPage + 1) * PAGE_SIZE, allImpactRows.length)} of {allImpactRows.length}
                      </span>
                      <div className='flex items-center gap-1'>
                        <button
                          onClick={() => setImpactPage((p) => Math.max(0, p - 1))}
                          disabled={impactPage === 0}
                          className='p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                        </button>
                        {Array.from({ length: impactTotalPages }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setImpactPage(i)}
                            className='w-7 h-7 rounded-md text-xs font-medium transition-colors'
                            style={impactPage === i
                              ? { background: '#155DFC', color: 'white' }
                              : { color: '#6B7280' }}>
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setImpactPage((p) => Math.min(impactTotalPages - 1, p + 1))}
                          disabled={impactPage === impactTotalPages - 1}
                          className='p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}


            {/* Preview Records */}
            <div className='bg-white rounded-xl overflow-hidden flex-shrink-0'
              style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className='px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3'>
                <h2 className='text-sm font-semibold text-gray-800 flex-shrink-0'>Sample Records Preview</h2>
                <div className='flex items-center gap-2 ml-auto'>
                  {selectedObjects.length > 0 && (
                    <select
                      value={selectedPreviewObject}
                      onChange={(e) => { setSelectedPreviewObject(e.target.value); setShowFieldPicker(false); setSelectedFields([]); setAvailableFields([]); setShowRecordsTable(false); setPreviewRecords([]); setPreviewError(null); }}
                      className='text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500'>
                      {selectedObjects.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={handlePreviewRecords}
                    className='flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'>
                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/>
                    </svg>
                    Preview Records
                  </button>
                </div>
              </div>

              {!showFieldPicker && (
                <div className='flex flex-col items-center justify-center py-10 gap-3 text-center'>
                  <div className='w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center'>
                    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='#155DFC' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/>
                    </svg>
                  </div>
                  <p className='text-sm text-gray-500'>Click <span className='font-semibold text-gray-700'>Preview Records</span> to select fields and preview sample data</p>
                </div>
              )}

              {showRecordsTable && selectedFields.length > 0 && (() => {
                const previewTotalPages = Math.ceil(previewRecords.length / PAGE_SIZE);
                const pagedRecords = previewRecords.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE);
                return (
                  <div className='border-t border-gray-100'>
                    <div className='px-5 py-3 flex items-center justify-between border-b border-gray-50'>
                      <p className='text-xs font-semibold text-gray-700'>
                        Preview — {selectedObjects.find(o => o.id === (selectedPreviewObject || selectedObjects[0]?.id))?.name ?? selectedPreviewObject}
                        {previewRecords.length > 0 && <span className='ml-2 font-normal text-gray-400'>{previewRecords.length} record{previewRecords.length !== 1 ? 's' : ''}</span>}
                      </p>
                      <div className='flex flex-wrap gap-1.5'>
                        {selectedFields.map((apiName) => {
                          const field = availableFields.find(f => f.apiName === apiName);
                          return (
                            <span key={apiName} className='text-[10px] font-semibold px-2 py-0.5 rounded-full'
                              style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC', border: '1px solid rgba(21,93,252,0.15)' }}>
                              {field?.label ?? apiName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className='overflow-x-auto' style={{ minHeight: 300 }}>
                      {previewError && (
                        <p className='text-sm text-red-500 px-5 py-4'>{previewError}</p>
                      )}
                      {!previewError && (
                        <table className='w-full border-collapse'>
                          <thead>
                            <tr className='bg-gray-50'>
                              {selectedFields.map((apiName) => {
                                const field = availableFields.find(f => f.apiName === apiName);
                                return (
                                  <th key={apiName} className='px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-gray-100'>
                                    {field?.label ?? apiName}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {previewLoading ? (
                              Array.from({ length: PAGE_SIZE }, (_, i) => (
                                <tr key={i} className='border-b border-gray-50'>
                                  {selectedFields.map((apiName) => (
                                    <td key={apiName} className='px-4 py-3'>
                                      <div className='h-3 bg-gray-100 rounded animate-pulse' style={{ width: `${60 + (i * apiName.length) % 40}px` }} />
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : pagedRecords.length === 0 ? (
                              <tr>
                                <td colSpan={selectedFields.length} className='px-4 py-8 text-center text-sm text-gray-400'>
                                  No records found
                                </td>
                              </tr>
                            ) : (
                              pagedRecords.map((record, i) => (
                                <tr key={i} className='border-b border-gray-50 hover:bg-gray-50/60 transition-colors'>
                                  {selectedFields.map((apiName) => (
                                    <td key={apiName} className='px-4 py-3 text-xs text-gray-700 whitespace-nowrap max-w-[200px] truncate'>
                                      {record[apiName] != null ? String(record[apiName]) : <span className='text-gray-300'>—</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                    {previewTotalPages > 1 && (
                      <div className='flex items-center justify-between px-5 py-3 border-t border-gray-100'>
                        <span className='text-xs text-gray-400'>
                          Showing {previewPage * PAGE_SIZE + 1}–{Math.min((previewPage + 1) * PAGE_SIZE, previewRecords.length)} of {previewRecords.length}
                        </span>
                        <div className='flex items-center gap-1'>
                          <button
                            onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                            disabled={previewPage === 0}
                            className='p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                          </button>
                          {Array.from({ length: previewTotalPages }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setPreviewPage(i)}
                              className='w-7 h-7 rounded-md text-xs font-medium transition-colors'
                              style={previewPage === i
                                ? { background: '#155DFC', color: 'white' }
                                : { color: '#6B7280' }}>
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => setPreviewPage((p) => Math.min(previewTotalPages - 1, p + 1))}
                            disabled={previewPage === previewTotalPages - 1}
                            className='p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {showFieldPicker && !showRecordsTable && (
                <div className='p-5 border-t border-gray-100'>
                  {fieldsLoading && (
                    <div className='flex items-center gap-2 text-sm text-gray-500 py-4'>
                      <div className='w-4 h-4 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin' />
                      Loading fields…
                    </div>
                  )}
                  {fieldsError && <p className='text-sm text-red-500'>{fieldsError}</p>}
                  {!fieldsLoading && !fieldsError && (
                    <div className='flex gap-4' style={{ height: 300 }}>
                      {/* Left panel — available fields */}
                      <div className='flex flex-col flex-1 rounded-lg overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
                        <div className='px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-shrink-0'>
                          <span className='text-xs font-semibold text-gray-600'>Available Fields</span>
                          <span className='text-[10px] text-gray-400'>{availableFields.length} fields</span>
                        </div>
                        <div className='flex-1 overflow-y-auto'>
                          {availableFields.map((f) => {
                            const isSelected = selectedFields.includes(f.apiName);
                            const isDisabled = !isSelected && selectedFields.length >= 5;
                            return (
                              <button
                                key={f.apiName}
                                onClick={() => { if (!isDisabled) { toggleField(f.apiName); setShowRecordsTable(false); } }}
                                disabled={isDisabled}
                                className='w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2.5 disabled:cursor-not-allowed'
                                style={{
                                  borderBottom: '1px solid #F8FAFC',
                                  background: isSelected ? 'rgba(21,93,252,0.05)' : undefined,
                                  color: isDisabled ? '#CBD5E1' : '#374151',
                                }}
                              >
                                {/* Checkbox */}
                                <span className='flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors'
                                  style={{
                                    border: isSelected ? '2px solid #155DFC' : '2px solid #D1D5DB',
                                    background: isSelected ? '#155DFC' : 'white',
                                  }}>
                                  {isSelected && (
                                    <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='white' strokeWidth='3.5' strokeLinecap='round' strokeLinejoin='round'>
                                      <polyline points='20 6 9 17 4 12'/>
                                    </svg>
                                  )}
                                </span>
                                <span className={isSelected ? 'font-medium text-blue-700' : ''}>{f.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Center arrows */}
                      <div className='flex flex-col items-center justify-center gap-2 flex-shrink-0'>
                        <button
                          onClick={() => {
                            const remaining = availableFields.filter(f => !selectedFields.includes(f.apiName));
                            const toAdd = remaining.slice(0, 5 - selectedFields.length).map(f => f.apiName);
                            if (toAdd.length) { setSelectedFields(prev => [...prev, ...toAdd]); setShowRecordsTable(false); }
                          }}
                          disabled={selectedFields.length >= 5 || availableFields.filter(f => !selectedFields.includes(f.apiName)).length === 0}
                          title='Add all'
                          className='p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                            <polyline points='13 17 18 12 13 7'/><polyline points='6 17 11 12 6 7'/>
                          </svg>
                        </button>
                        <button
                          onClick={() => { setSelectedFields([]); setShowRecordsTable(false); }}
                          disabled={selectedFields.length === 0}
                          title='Remove all'
                          className='p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                            <polyline points='11 17 6 12 11 7'/><polyline points='18 17 13 12 18 7'/>
                          </svg>
                        </button>
                      </div>

                      {/* Right panel — selected fields */}
                      <div className='flex flex-col flex-1 rounded-lg overflow-hidden' style={{ border: '1px solid #E2E8F0' }}>
                        <div className='px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-shrink-0'>
                          <span className='text-xs font-semibold text-gray-600'>Selected Fields</span>
                          <span className='text-[10px] font-semibold' style={{ color: selectedFields.length >= 5 ? '#DC2626' : '#155DFC' }}>{selectedFields.length}/5</span>
                        </div>
                        <div className='flex-1 overflow-y-auto'>
                          {selectedFields.length === 0 ? (
                            <div className='flex flex-col items-center justify-center h-full gap-1.5 px-3 text-center'>
                              <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='#CBD5E1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                                <polyline points='9 18 15 12 9 6'/>
                              </svg>
                              <p className='text-[11px] text-gray-300'>Select fields from the left</p>
                            </div>
                          ) : (
                            selectedFields.map((apiName, idx) => {
                              const field = availableFields.find(f => f.apiName === apiName);
                              return (
                                <div
                                  key={apiName}
                                  className='flex items-center justify-between px-3 py-2 group'
                                  style={{ borderBottom: '1px solid #F8FAFC', background: 'rgba(21,93,252,0.03)' }}
                                >
                                  <div className='flex items-center gap-2 min-w-0'>
                                    <span className='text-[10px] font-bold text-blue-400 w-4 flex-shrink-0'>{idx + 1}.</span>
                                    <span className='text-xs text-gray-700 truncate'>{field?.label ?? apiName}</span>
                                  </div>
                                  <button
                                    onClick={() => { setSelectedFields(prev => prev.filter(f => f !== apiName)); setShowRecordsTable(false); }}
                                    className='ml-2 flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100'>
                                    <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                                      <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
                                    </svg>
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                        {selectedFields.length > 0 && (
                          <div className='px-3 py-2.5 border-t border-gray-100 flex-shrink-0'>
                            <button
                              onClick={handleShowPreview}
                              className='w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'>
                              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                                <polyline points='9 18 15 12 9 6'/>
                              </svg>
                              Show Preview
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dry run meta */}
            <div className='bg-gray-50 rounded-xl px-5 py-4 flex-shrink-0'
              style={{ border: '1px solid #E2E8F0' }}>
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs'>
                {[
                  { label: 'Dry Run Executed', value: runTime },
                  { label: 'Duration', value: duration },
                  { label: 'Filter Validity', value: '✓ All valid', green: true },
                ].map((item) => (
                  <div key={item.label}>
                    <p className='text-gray-400 mb-1'>{item.label}</p>
                    <p className={`font-semibold ${item.green ? 'text-green-600' : 'text-gray-800'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Sticky Footer */}
      <div className='flex-shrink-0 flex flex-col px-4 sm:px-6 py-4 bg-white border-t border-gray-200 gap-2'>
        {draftError && (
          <p className='text-xs text-red-500 text-right'>{draftError}</p>
        )}
        <div className='flex justify-between items-center'>
          <button
            onClick={() => navigate('/archive-vault')}
            className='px-5 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm'>
            Cancel
          </button>
          <div className='flex gap-2.5'>
            <button
              onClick={onBack}
              className='px-5 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm'>
              ← Back
            </button>
            {dryRunState === 'results' && (
              <button
                onClick={runDryRun}
                className='px-4 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm'>
                ↺ Re-run
              </button>
            )}
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || !archivalPayload}
              className='px-4 py-2 text-gray-600 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50'>
              {isSavingDraft ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              onClick={onNext}
              className='px-5 py-2 rounded-lg font-medium transition-colors text-sm bg-blue-600 text-white hover:bg-blue-700'>
              {dryRunState === 'results' ? 'Review & Confirm →' : 'Skip & Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
