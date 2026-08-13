import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Typography from '../../../../components/Typography';
import { useRestoreService } from '../../../../services/restore/restore.service';
import type { RestoreScope, RestoreScopeFilter } from '../../../../services/restore/restore.service';
import type { SourceSelection } from '../SelectSourceType';
import { SCOPE_MODES } from './types';
import type { ScopeMode } from './types';
import FullRestoreScope from './FullRestoreScope';
import ByObjectScope from './ByObjectScope';
import ByRecordScope from './ByRecordScope';
import ByFieldScope from './ByFieldScope';
import CustomFilterScope from './CustomFilterScope';
import DeletedOnlyScope from './DeletedOnlyScope';
import ChangedSinceScope from './ChangedSinceScope';
import BulkCsvScope from './BulkCsvScope';

// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['Source', 'Source Type', 'Scope', 'Destination', 'Policy', 'Conflict', 'Preview', 'Review'];

function ProgressBar({ active }: { active: number }) {
  return (
    <div className='w-full'>
      <div className='flex items-center'>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone   = num < active;
          const isActive = num === active;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold border-2 ${
                isDone   ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'bg-blue-600 border-blue-600 text-white' :
                           'bg-white border-gray-300 text-gray-400'
              }`}>
                {isDone ? (
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' className='w-3.5 h-3.5'>
                    <polyline points='20 6 9 17 4 12' />
                  </svg>
                ) : num}
              </div>
              {!isLast && <div className='flex-1 h-0.5' style={{ background: isDone ? '#22C55E' : '#E5E7EB' }} />}
            </div>
          );
        })}
      </div>
      <div className='flex items-start mt-2'>
        {STEPS.map((label, i) => {
          const num = i + 1;
          const isDone   = num < active;
          const isActive = num === active;
          const isLast   = i === STEPS.length - 1;
          return (
            <div key={label} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
              <span className={`text-[10px] font-semibold whitespace-nowrap ${
                isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'
              }`}>
                {label}
              </span>
              {!isLast && <div className='flex-1' />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onNext: (scope: RestoreScope, scopeMode: string) => void;
  onBack: () => void;
  sourceSelection: SourceSelection;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SelectScope({ onNext, onBack, sourceSelection }: Props) {
  const restoreService = useRestoreService();

  const { data: sourceObjectsData, isLoading: sourceObjectsLoading } = useQuery({
    queryKey: ['source-objects', sourceSelection.backupConfigId, sourceSelection.configType],
    queryFn: () => restoreService.getObjectListByConfigId(sourceSelection.backupConfigId, sourceSelection.configType),
    enabled: !!sourceSelection.backupConfigId,
    staleTime: 60_000,
    retry: 1,
  });

  const sourceObjectNames: string[] = [
    ...new Set(Object.values((sourceObjectsData as any)?.data ?? {}).flat() as string[]),
  ];

  const [scopeMode, setScopeMode] = useState<ScopeMode>('full');

  // Each scope component reports its latest value here via onChange
  const [selectedObjects, setSelectedObjects]   = useState<string[]>([]);
  const [recordScope,     setRecordScope]       = useState<{ objectName: string; recordIds: string[] }[]>([]);
  const [fieldScope,      setFieldScope]        = useState<{ objectName: string; fieldNames: string[] }[]>([]);
  const [filterScope,     setFilterScope]       = useState<RestoreScopeFilter[]>([]);
  const [changedDate,     setChangedDate]       = useState('2026-05-01');
  const [csvScope,        setCsvScope]          = useState<{ objectName: string; ids: string[] }[]>([]);

  const buildScope = (): RestoreScope => {
    switch (scopeMode) {
      case 'object':  return { type: 'OBJECT', objects: selectedObjects };
      case 'record':  return { type: 'RECORD', records: recordScope };
      case 'field':   return { type: 'FIELD',  fields:  fieldScope };
      case 'filter':  return { type: 'FILTER', filters: filterScope };
      case 'changed': return { type: 'CHANGE_SINCE', changeSince: { date: changedDate } };
      case 'csv':     return { type: 'BULK_CSV', bulkCsvIds: csvScope };
      case 'deleted': return { type: 'DELETED_ONLY', deletedOnly: true };
      case 'full':
      default:        return { type: 'ALL' };
    }
  };

  return (
    <div className='flex flex-col h-full min-h-0 bg-gray-50'>

      {/* Scrollable body */}
      <div className='flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-4'>

        {/* Job badge */}
        <div className='flex-shrink-0 rounded-xl border border-blue-200 bg-white shadow-sm overflow-hidden'>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm'>
            <span className='flex items-center gap-1.5 text-gray-500'>
              <span className='font-semibold text-gray-700'>Restore:</span>
              <span>Untitled — May 27, 10:30 AM</span>
              <button className='text-blue-500 hover:text-blue-700 text-xs ml-0.5'>✎</button>
            </span>
            <span className='w-px h-4 bg-gray-200 hidden sm:block' />
            <span className='flex items-center gap-1.5 text-gray-500'>
              <span className='font-semibold text-gray-700'>Tags:</span> INC-4711
            </span>
            <span className='w-px h-4 bg-gray-200 hidden sm:block' />
            <span className='flex items-center gap-1.5 text-gray-500'>
              <span className='font-semibold text-gray-700'>Source:</span> Backup · May 27, 06:00 AM
              <button className='text-blue-500 hover:text-blue-700 text-xs ml-0.5'>✎</button>
            </span>
          </div>
        </div>

        {/* Wizard header */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
          <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2'>
            <div>
              <p className='text-xs font-semibold text-blue-600 mb-1'>Step 3 of 8</p>
              <Typography as='h1' variant='pageTitle' color='primary'>Choose Selection Scope</Typography>
              <Typography variant='bodySm' color='muted' className='mt-0.5'>
                Pick a mode below. Only the relevant sub-UI appears — no clutter.
              </Typography>
            </div>
          </div>
          <div className='mt-4'>
            <ProgressBar active={3} />
          </div>
        </div>

        {/* Scope mode grid */}
        <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='px-5 py-3 border-b border-gray-100 flex items-center gap-2'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Restore Scope</Typography>
            <span className='group relative flex-shrink-0 cursor-default'>
              <span className='inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold leading-none select-none'>i</span>
              <div className='pointer-events-none absolute left-0 bottom-full mb-2 z-50 hidden group-hover:block w-64 rounded-lg bg-gray-900 px-3 py-2 text-[11px] text-gray-200 leading-relaxed shadow-xl'>
                Choose how to scope the data being restored. Select a mode to reveal its configuration below.
                <div className='absolute left-3 top-full w-2 h-2 bg-gray-900 rotate-45 -mt-1' />
              </div>
            </span>
          </div>
          <div className='p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
            {SCOPE_MODES.map((m) => {
              const active = scopeMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setScopeMode(m.id)}
                  className={`text-left rounded-xl border-2 px-4 py-3 transition-all flex items-start gap-3 ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                  }`}
                >
                  <span className={`text-lg leading-none flex-shrink-0 mt-0.5 ${active ? 'text-blue-600' : 'text-gray-500'}`}>
                    {m.icon}
                  </span>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5'>
                      <p className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-800'}`}>{m.title}</p>
                      <span className='group/tip relative flex-shrink-0 cursor-default' onClick={(e) => e.stopPropagation()}>
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none select-none ${active ? 'bg-blue-200 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>i</span>
                        <div className='pointer-events-none absolute left-0 bottom-full mb-2 z-50 hidden group-hover/tip:block w-52 rounded-lg bg-gray-900 px-3 py-2 text-[11px] text-gray-200 leading-relaxed shadow-xl'>
                          {m.tooltip}
                          <div className='absolute left-3 top-full w-2 h-2 bg-gray-900 rotate-45 -mt-1' />
                        </div>
                      </span>
                    </div>
                    <p className='text-xs text-gray-500 mt-0.5 leading-snug'>{m.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                    active ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                  }`}>
                    {active && <div className='w-1.5 h-1.5 rounded-full bg-white' />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope sub-UI */}
        {scopeMode === 'full'    && <FullRestoreScope />}
        {scopeMode === 'object'  && (
          <ByObjectScope
            sourceObjectNames={sourceObjectNames}
            sourceObjectsLoading={sourceObjectsLoading}
            onChange={setSelectedObjects}
          />
        )}
        {scopeMode === 'record'  && (
          <ByRecordScope
            sourceObjectNames={sourceObjectNames}
            sourceObjectsLoading={sourceObjectsLoading}
            sourceSelection={sourceSelection}
            onChange={setRecordScope}
          />
        )}
        {scopeMode === 'field'   && (
          <ByFieldScope
            sourceObjectNames={sourceObjectNames}
            sourceObjectsLoading={sourceObjectsLoading}
            sourceSelection={sourceSelection}
            onChange={setFieldScope}
          />
        )}
        {scopeMode === 'filter'  && (
          <CustomFilterScope
            sourceObjectNames={sourceObjectNames}
            sourceObjectsLoading={sourceObjectsLoading}
            sourceSelection={sourceSelection}
            onChange={setFilterScope}
          />
        )}
        {scopeMode === 'deleted' && <DeletedOnlyScope />}
        {scopeMode === 'changed' && <ChangedSinceScope onChange={setChangedDate} />}
        {scopeMode === 'csv'     && (
          <BulkCsvScope
            sourceObjectNames={sourceObjectNames}
            sourceObjectsLoading={sourceObjectsLoading}
            sourceSelection={sourceSelection}
            onChange={setCsvScope}
          />
        )}

      </div>

      {/* Sticky footer */}
      <div className='flex-shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 py-4'>
        <div className='flex items-center justify-between gap-3'>
          <button
            onClick={onBack}
            className='flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors'
          >
            ← Back
          </button>
          <div className='flex items-center gap-2'>
            <button className='text-sm font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5'>
              💾 Save as Draft
            </button>
            <button
              onClick={() => onNext(buildScope(), scopeMode)}
              className='flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors'
            >
              Next: Set Destination →
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
