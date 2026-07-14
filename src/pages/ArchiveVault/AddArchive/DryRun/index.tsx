// DryRun — Step 5 of the Add Archive wizard.
// Simulates the archive against live Salesforce data without moving any records.
//
// Flow:
//   idle    → user clicks "Run Dry Run"
//   loading → POST /v1/archival-config/dry-run — API counts matching records per object
//   results → shows Per-Object Impact table with inline "Preview Records" action per row
//
// Per-Object Impact tree: built from archivalPayload.objects (the fully built payload
// from Step 4). Rendered as a collapsible tree grid — collapsed by default.
// Each row (parent and child) has a "Preview Records" button in the Actions column.
// Clicking it opens a modal: user picks up to 5 fields, then POST /v1/archival-config/object-records
// fetches actual Salesforce records matching the archive filter for that object.
//
// Save as Draft: calls POST /v1/archival-config with status "DRAFT" — saves without scheduling.
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useArchivalService } from '../../../../services/archival/archival.service';
import { useBackupConfigService } from '../../../../services/backup-config/backup-config.service';
import type { SelectedArchiveObject } from '../SelectObjects';
import ProgressBar from '../ProgressBar';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Walks the archival payload object tree and returns the path of ancestor nodes
 * from the root down to (but not including) the target node.
 * Returns null if the target is not found.
 */
function findAncestorPath(nodes: any[], targetName: string, path: any[] = []): any[] | null {
  for (const node of nodes) {
    if (node.name === targetName) return path;
    if (node.children?.length) {
      const result = findAncestorPath(node.children, targetName, [...path, node]);
      if (result !== null) return result;
    }
  }
  return null;
}

/**
 * Builds the nested parent chain for getObjectRecords.
 * Given a path [1ob, 2ob, 3ob] for target 4ob, produces:
 * { referenceName: 3ob.fieldApiName, filters: 3ob filters, parent: { referenceName: 2ob.fieldApiName, ... } }
 * The chain runs from immediate parent inward to root.
 */
function buildParentChain(
  nodes: any[],
  targetName: string,
): Record<string, unknown> | undefined {
  const ancestorPath = findAncestorPath(nodes, targetName);
  if (!ancestorPath || ancestorPath.length === 0) return undefined;

  // Each ancestor carries its OWN fieldApiName as referenceName (the lookup on itself to its parent).
  // Root (i=0) has no parent → no referenceName.
  // Target is NOT emitted. Target's fieldApiName goes at top-level in the API call (handled by caller).

  let chain: Record<string, unknown> | undefined = undefined;
  for (let i = 0; i < ancestorPath.length; i++) {
    const node = ancestorPath[i];
    const isRoot = i === 0;
    const entry: Record<string, unknown> = { apiName: node.name };
    if (!isRoot) entry.referenceName = node.fieldApiName ?? null;
    entry.filters = buildFilters(node) ?? null;
    if (chain) entry.parent = chain;
    chain = entry;
  }
  return chain;
}

/** Extracts filters from an object node's condition/field into a simple shape. */
function buildFilters(node: any): Record<string, unknown> | null {
  const condition = node.condition;
  const fields: any[] = node.field ?? [];
  if (!condition && fields.length === 0) return null;
  return {
    condition: condition ?? null,
    fields: fields.length > 0 ? fields : null,
  };
}

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

// ─── Preview Modal ────────────────────────────────────────────────────────────

type FieldOption = { apiName: string; label: string };

interface PreviewModalProps {
  objectName: string;
  crmId: string;
  archivalPayload?: Record<string, unknown> | null;
  onClose: () => void;
}

function PreviewModal({ objectName, crmId, archivalPayload, onClose }: PreviewModalProps) {
  const backupConfigService = useBackupConfigService();
  const PAGE_SIZE = 5;

  const [showFieldPicker, setShowFieldPicker] = useState(true);
  const [availableFields, setAvailableFields] = useState<FieldOption[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [showRecordsTable, setShowRecordsTable] = useState(false);
  const [previewRecords, setPreviewRecords] = useState<Record<string, any>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(0);

  // Load fields on mount
  useMemo(() => {
    if (!crmId || !objectName) return;
    setFieldsLoading(true);
    setFieldsError(null);
    backupConfigService.getObjectFields(crmId, objectName)
      .then((fields) => {
        setAvailableFields(fields.map((f) => ({ apiName: f.name, label: f.label ?? f.name })));
      })
      .catch(() => {
        setFieldsError('Failed to load fields. Please try again.');
      })
      .finally(() => setFieldsLoading(false));
  }, [objectName, crmId]);

  function toggleField(apiName: string) {
    setSelectedFields((prev) =>
      prev.includes(apiName)
        ? prev.filter((f) => f !== apiName)
        : prev.length < 5 ? [...prev, apiName] : prev
    );
  }

  async function handleShowPreview() {
    if (selectedFields.length === 0) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setShowRecordsTable(true);
    setShowFieldPicker(false);

    const objects = (archivalPayload?.objects as any[]) ?? [];
    const findNodeDeep = (ns: any[], name: string): any | undefined => {
      for (const n of ns) {
        if (n.name === name) return n;
        if (n.children?.length) { const r = findNodeDeep(n.children, name); if (r) return r; }
      }
      return undefined;
    };
    const objectConfig = findNodeDeep(objects, objectName);
    const parent = buildParentChain(objects, objectName);
    const referenceName = objectConfig?.fieldApiName ?? undefined;

    try {
      const res = await backupConfigService.getObjectRecords({
        crmId,
        apiName: objectName,
        fields: selectedFields,
        objectConfig,
        ...(referenceName ? { referenceName } : {}),
        ...(parent ? { parent } : {}),
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

  const previewTotalPages = Math.ceil(previewRecords.length / PAGE_SIZE);
  const pagedRecords = previewRecords.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden' style={{ maxHeight: '90vh' }}>
        {/* Modal header */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0'>
          <div>
            <h2 className='text-sm font-semibold text-gray-800'>Preview Records</h2>
            <p className='text-xs text-gray-400 mt-0.5'>{objectName}</p>
          </div>
          <button
            onClick={onClose}
            className='flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors'>
            <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div className='flex-1 overflow-y-auto p-5'>

          {/* Field picker */}
          {showFieldPicker && (
            <>
              {fieldsLoading && (
                <div className='flex items-center gap-2 text-sm text-gray-500 py-8 justify-center'>
                  <div className='w-4 h-4 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin' />
                  Loading fields…
                </div>
              )}
              {fieldsError && <p className='text-sm text-red-500 py-4'>{fieldsError}</p>}
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
                            onClick={() => { if (!isDisabled) toggleField(f.apiName); }}
                            disabled={isDisabled}
                            className='w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2.5 disabled:cursor-not-allowed'
                            style={{
                              borderBottom: '1px solid #F8FAFC',
                              background: isSelected ? 'rgba(21,93,252,0.05)' : undefined,
                              color: isDisabled ? '#CBD5E1' : '#374151',
                            }}
                          >
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
                        if (toAdd.length) setSelectedFields(prev => [...prev, ...toAdd]);
                      }}
                      disabled={selectedFields.length >= 5 || availableFields.filter(f => !selectedFields.includes(f.apiName)).length === 0}
                      title='Add all'
                      className='p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                      <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                        <polyline points='13 17 18 12 13 7'/><polyline points='6 17 11 12 6 7'/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setSelectedFields([])}
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
                                onClick={() => setSelectedFields(prev => prev.filter(f => f !== apiName))}
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
                  </div>
                </div>
              )}
              {selectedFields.length > 0 && (
                <button
                  onClick={handleShowPreview}
                  className='mt-4 w-full flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'>
                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/>
                  </svg>
                  Show Preview
                </button>
              )}
            </>
          )}

          {/* Records table */}
          {showRecordsTable && (
            <div>
              <div className='flex items-center justify-between mb-3'>
                <p className='text-xs font-semibold text-gray-700'>
                  {objectName}
                  {previewRecords.length > 0 && <span className='ml-2 font-normal text-gray-400'>{previewRecords.length} record{previewRecords.length !== 1 ? 's' : ''}</span>}
                </p>
                <div className='flex items-center gap-2'>
                  <div className='flex flex-wrap gap-1'>
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
                  <button
                    onClick={() => { setShowFieldPicker(true); setShowRecordsTable(false); }}
                    className='text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap'>
                    ← Change Fields
                  </button>
                </div>
              </div>
              <div className='overflow-x-auto rounded-lg' style={{ border: '1px solid #E2E8F0', minHeight: 200 }}>
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
                        Array.from({ length: 5 }, (_, i) => (
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
              <div className='flex items-center justify-between pt-3 px-1'>
                <button
                  onClick={() => { setShowFieldPicker(true); setShowRecordsTable(false); }}
                  className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
                  <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                  Back to Fields
                </button>
                {previewTotalPages > 1 && (
                  <div className='flex items-center gap-1'>
                    <button onClick={() => setPreviewPage((p) => Math.max(0, p - 1))} disabled={previewPage === 0}
                      className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                      Prev
                    </button>
                    {Array.from({ length: previewTotalPages }, (_, i) => (
                      <button key={i} onClick={() => setPreviewPage(i)}
                        className='w-7 h-7 rounded-md text-xs font-medium transition-colors'
                        style={previewPage === i ? { background: '#155DFC', color: 'white' } : { color: '#6B7280' }}>
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setPreviewPage((p) => Math.min(previewTotalPages - 1, p + 1))} disabled={previewPage >= previewTotalPages - 1}
                      className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'>
                      Next
                      <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type DryRunState = 'idle' | 'loading' | 'results';

export type DryRunSummary = { totalRecords: number; totalDataSize: string };

export type DryRunCache = {
  objectCountMap: Record<string, number>;
  failedObjects: { name: string; error: string }[];
  runTime: string;
  duration: string;
};

interface Step3DryRunProps {
  crmId?: string | null;
  selectedObjects: SelectedArchiveObject[];
  archivalPayload?: Record<string, unknown> | null;
  initialCache?: DryRunCache | null;
  onNext: (summary?: DryRunSummary, cache?: DryRunCache) => void;
  onBack: () => void;
}

export default function Step3DryRun({ crmId, selectedObjects, archivalPayload, initialCache, onNext, onBack }: Step3DryRunProps) {
  const archivalService = useArchivalService();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dryRunState, setDryRunState] = useState<DryRunState>(initialCache ? 'results' : 'idle');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [objectCountMap, setObjectCountMap] = useState<Record<string, number>>(initialCache?.objectCountMap ?? {});
  const [failedObjects, setFailedObjects] = useState<{ name: string; error: string }[]>(initialCache?.failedObjects ?? []);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
  const [runTime, setRunTime] = useState<string>(initialCache?.runTime ?? '');
  const [duration, setDuration] = useState<string>(initialCache?.duration ?? '');
  const [impactPage, setImpactPage] = useState(0);
  const PAGE_SIZE = 5;

  // Which object's preview modal is open (null = closed)
  const [previewObject, setPreviewObject] = useState<string | null>(null);

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
          if (obj.id) map[obj.id] = obj.count ?? 0;
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

  const hasMultipleObjects = selectedObjects.length > 1;

  // Tree grid state for Per-Object Impact — empty set means all collapsed by default
  const [expandedImpactIds, setExpandedImpactIds] = useState<Set<string>>(new Set());
  const toggleImpactCollapse = (id: string) =>
    setExpandedImpactIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  type ImpactTreeRow = { name: string; rowKey: string; id: string; depth: number; hasChildren: boolean; condition?: any; fields?: any[] };

  const impactTreeRows = useMemo((): ImpactTreeRow[] => {
    const rows: ImpactTreeRow[] = [];
    const rawObjects: any[] = (archivalPayload?.objects as any[]) ?? [];
    const walk = (items: any[], depth: number, parentKey: string) => {
      items.forEach((obj, idx) => {
        const id = obj.id ?? obj.name;
        const rowKey = `${parentKey}-${idx}-${id}`;
        const children: any[] = obj.children ?? [];
        const hasChildren = children.length > 0;
        rows.push({ name: obj.name, rowKey, id, depth, hasChildren, condition: obj.condition, fields: obj.field ?? [] });
        if (hasChildren && expandedImpactIds.has(rowKey)) {
          walk(children, depth + 1, rowKey);
        }
      });
    };
    walk(rawObjects, 0, 'root');
    return rows;
  }, [archivalPayload, expandedImpactIds]);


  async function handleSaveDraft() {
    if (!archivalPayload) return;
    setIsSavingDraft(true);
    setDraftError(null);
    try {
      await archivalService.applyConfig({ ...archivalPayload, status: 'DRAFT' } as any);
      queryClient.invalidateQueries({ queryKey: ['archival-config-list'] });
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
                <strong>{fmtNumber(totalRecords)}</strong> estimated records eligible.
              </p>
            </div>

            {/* Impact summary cards — 4 cards */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0'>
              {[
                { label: 'Estimated Records to Archive', value: fmtNumber(totalRecords), color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.12)' },
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
            {hasMultipleObjects && (
              <div className='flex items-start gap-2.5 rounded-lg px-4 py-3 flex-shrink-0'
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='#B45309' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 mt-0.5'>
                  <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>
                </svg>
                <p className='text-xs' style={{ color: '#92400E' }}>
                  <strong>Note:</strong> The Total Estimated Record Count above may be higher than the actual number of unique records archived. Records related to multiple selected objects may be counted more than once across parent and child relationships.
                </p>
              </div>
            )}

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

            {/* Per-Object Impact — tree grid with Actions column */}
            {(() => {
              const allObjects: any[] = (archivalPayload?.objects as any[]) ?? [];
              const totalObjectCount = (() => { let n = 0; const count = (items: any[]) => items.forEach((o) => { n++; if (o.children?.length) count(o.children); }); count(allObjects); return n; })();
              const pagedRows = impactTreeRows.slice(impactPage * PAGE_SIZE, (impactPage + 1) * PAGE_SIZE);
              const impactTotalPages = Math.ceil(impactTreeRows.length / PAGE_SIZE);
              return (
                <div className='bg-white rounded-xl flex-shrink-0 overflow-hidden'
                  style={{ border: '0.8px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {/* Header — stays full width, never scrolls */}
                  <div className='px-5 py-3.5 border-b border-gray-100 flex items-center justify-between'>
                    <div>
                      <h2 className='text-sm font-semibold text-gray-800'>Per-Object Impact</h2>
                      <p className='text-xs text-gray-400 mt-0.5'>Dry run completed · <span className='text-green-600 font-medium'>✓ All filters valid</span></p>
                    </div>
                    <span className='text-xs text-gray-400'>{totalObjectCount} object{totalObjectCount !== 1 ? 's' : ''}</span>
                  </div>
                  {/* Scrollable grid — horizontal scroll only when narrower than 640px */}
                  <div style={{ overflowX: 'auto' }}>
                  {/* Column headers */}
                  <div className='grid px-4 py-2.5 bg-gray-50 border-b border-gray-100'
                    style={{ gridTemplateColumns: '25% 1fr 16% 12% 16%', minWidth: 560 }}>
                    {['OBJECT', 'FILTER APPLIED', 'MATCHING RECORDS', 'EST. SIZE', 'ACTIONS'].map((h, i) => (
                      <span key={h} className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wide ${i >= 2 && i < 4 ? 'text-right' : i === 4 ? 'text-center' : ''}`}>{h}</span>
                    ))}
                  </div>
                  {/* Rows */}
                  <div style={{ minHeight: 260 }}>
                    {pagedRows.length === 0 ? (
                      <div className='flex items-center justify-center py-12 text-sm text-gray-400'>No objects selected.</div>
                    ) : pagedRows.map((row) => {
                      const isParent = row.depth === 0;
                      const count = objectCountMap[row.id] ?? 0;
                      const isSoql = row.condition?.type === 'SOQL';
                      const clause = row.condition?.soqlQuery ?? '';
                      const fields: any[] = row.fields ?? [];
                      return (
                        <div key={row.rowKey}
                          className='grid border-b border-gray-50 hover:bg-gray-50/60 transition-colors items-center'
                          style={{ gridTemplateColumns: '25% 1fr 16% 12% 16%', background: isParent ? 'white' : 'rgba(99,102,241,0.02)', minWidth: 560 }}>
                          {/* Object column */}
                          <div className='flex items-center gap-1 py-3 pr-3' style={{ paddingLeft: 16 + row.depth * 20 }}>
                            {row.hasChildren ? (
                              <button
                                onClick={() => toggleImpactCollapse(row.rowKey)}
                                className='flex-shrink-0 w-5 h-5 rounded flex items-center justify-center mr-1 hover:bg-gray-100 transition-colors'
                                style={{ border: '1px solid #E2E8F0' }}>
                                <svg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'
                                  style={{ transform: expandedImpactIds.has(row.rowKey) ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}>
                                  <polyline points='6 9 12 15 18 9' />
                                </svg>
                              </button>
                            ) : (
                              <span className='flex-shrink-0 w-5 mr-1' />
                            )}
                            <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md mr-2'
                              style={{ background: isParent ? 'rgba(21,93,252,0.08)' : 'rgba(99,102,241,0.08)' }}>
                              <svg viewBox='0 0 24 24' fill='none' stroke={isParent ? '#155DFC' : '#6366f1'} strokeWidth='2' className='h-3 w-3'>
                                <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/>
                              </svg>
                            </div>
                            <span className='text-xs font-semibold text-gray-800 truncate'>{row.name}</span>
                          </div>
                          {/* Filter Applied column */}
                          <div className='py-3 px-3'>
                            {isSoql ? (
                              <div className='flex items-center gap-1.5 group relative'>
                                <span className='flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0'
                                  style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.18)' }}>
                                  <svg width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                                    <polyline points='16 18 22 12 16 6'/><polyline points='8 6 2 12 8 18'/>
                                  </svg>
                                  SOQL
                                </span>
                                <span className='text-xs text-gray-500 font-mono truncate max-w-[180px]'>
                                  {clause.length > 35 ? clause.slice(0, 35) + '…' : clause || '—'}
                                </span>
                                <div className='absolute left-0 top-full mt-1.5 z-50 hidden group-hover:block' style={{ minWidth: 260, maxWidth: 380 }}>
                                  <div className='rounded-lg px-3 py-2.5 shadow-lg' style={{ background: '#1E1E2E', border: '1px solid rgba(124,58,237,0.3)' }}>
                                    <p className='text-[10px] font-semibold mb-1.5' style={{ color: '#A78BFA' }}>Full SOQL Query</p>
                                    <p className='text-xs font-mono leading-relaxed break-all' style={{ color: '#E2E8F0' }}>{`SELECT FIELDS(ALL) FROM ${row.name} WHERE ${clause}`}</p>
                                  </div>
                                </div>
                              </div>
                            ) : fields.length > 0 ? (
                              <span className='text-xs text-gray-600 truncate block max-w-xs'>
                                {fields.map((f: any) => `${f.name} ${f.filter?.operator} "${f.filter?.value}"`).join(' AND ').slice(0, 50) + (fields.map((f: any) => `${f.name} ${f.filter?.operator} "${f.filter?.value}"`).join(' AND ').length > 50 ? '…' : '')}
                              </span>
                            ) : (
                              <span className='text-xs text-gray-300 italic'>—</span>
                            )}
                          </div>
                          {/* Matching Records */}
                          <div className='py-3 px-3 text-right'>
                            <span className='font-semibold text-gray-900 tabular-nums text-sm'>{fmtNumber(count)}</span>
                          </div>
                          {/* Est. Size */}
                          <div className='py-3 px-3 text-right'>
                            <span className='text-gray-600 text-sm'>{calcDataSize(count)}</span>
                          </div>
                          {/* Actions */}
                          <div className='py-3 px-3 flex items-center justify-center'>
                            <button
                              onClick={() => setPreviewObject(row.name)}
                              className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap'
                              style={{ background: 'rgba(21,93,252,0.08)', color: '#155DFC', border: '1px solid rgba(21,93,252,0.18)' }}
                            >
                              <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                                <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'/><circle cx='12' cy='12' r='3'/>
                              </svg>
                              Preview Records
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>{/* end scrollable grid area */}
                  {impactTotalPages > 1 && (
                    <div className='flex items-center justify-between px-5 py-3 border-t border-gray-100'>
                      <span className='text-xs text-gray-400'>
                        Showing {impactPage * PAGE_SIZE + 1}–{Math.min((impactPage + 1) * PAGE_SIZE, impactTreeRows.length)} of {impactTreeRows.length}
                      </span>
                      <div className='flex items-center gap-1'>
                        <button onClick={() => setImpactPage((p) => Math.max(0, p - 1))} disabled={impactPage === 0}
                          className='p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors'>
                          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='15 18 9 12 15 6'/></svg>
                        </button>
                        {Array.from({ length: impactTotalPages }, (_, i) => (
                          <button key={i} onClick={() => setImpactPage(i)}
                            className='w-7 h-7 rounded-md text-xs font-medium transition-colors'
                            style={impactPage === i ? { background: '#155DFC', color: 'white' } : { color: '#6B7280' }}>
                            {i + 1}
                          </button>
                        ))}
                        <button onClick={() => setImpactPage((p) => Math.min(impactTotalPages - 1, p + 1))} disabled={impactPage >= impactTotalPages - 1}
                          className='p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-colors'>
                          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><polyline points='9 18 15 12 9 6'/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
              onClick={() => onNext(
                dryRunState === 'results' ? { totalRecords, totalDataSize } : undefined,
                dryRunState === 'results' ? { objectCountMap, failedObjects, runTime, duration } : undefined,
              )}
              className='px-5 py-2 rounded-lg font-medium transition-colors text-sm bg-blue-600 text-white hover:bg-blue-700'>
              {dryRunState === 'results' ? 'Review & Confirm →' : 'Skip & Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Records Modal */}
      {previewObject && (
        <PreviewModal
          objectName={previewObject}
          crmId={crmId ?? ''}
          archivalPayload={archivalPayload}
          onClose={() => setPreviewObject(null)}
        />
      )}
    </div>
  );
}
