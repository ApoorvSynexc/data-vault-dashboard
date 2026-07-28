import { useState } from 'react';
import { Link } from 'react-router-dom';
import Typography from '../../../../components/Typography';
import type { Destination } from '../../../../services/destination/destination.service';
import BackupPicker from './Backup';
import type { BackupSelection } from './Backup';
import ArchivalPicker from './Archival';
import type { ArchivalSelection } from './Archival';

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'backup' | 'archive';

export interface SourceSelection {
  configType: 'BACKUP' | 'ARCHIVAL';
  backupConfigId: string;
  backupJobIds: string[];
  crmId?: string;
}


interface Props {
  onNext: (selection: SourceSelection) => void;
  onBack: () => void;
  selectedConnection: Destination | null;
  initialBackupJobsPhase?: boolean;
  initialArchivalJobsPhase?: boolean;
  onBackupJobsPhaseChange?: (v: boolean) => void;
  onArchivalJobsPhaseChange?: (v: boolean) => void;
}

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

// ── Source type cards ─────────────────────────────────────────────────────────

const SOURCE_TYPES: { id: SourceType; icon: React.ReactNode; title: string; desc: string }[] = [
  {
    id: 'backup',
    icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><polyline points='23 4 23 10 17 10'/><path d='M20.49 15a9 9 0 1 1-.29-4.36'/></svg>,
    title: 'Backup Snapshot',
    desc: 'Point-in-time backup with change history',
  },
  {
    id: 'archive',
    icon: <svg width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M5 8l4 4 4-4'/><rect x='3' y='3' width='18' height='18' rx='2'/></svg>,
    title: 'Archive Vault Entry',
    desc: 'Cold/warm archived records',
  },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function SelectSourceType({ onNext, onBack, initialBackupJobsPhase = false, initialArchivalJobsPhase = false, onBackupJobsPhaseChange, onArchivalJobsPhaseChange }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>(initialArchivalJobsPhase ? 'archive' : 'backup');
  const [showJobsPhase, setShowJobsPhase] = useState(initialBackupJobsPhase);

  // Backup phase states
  // configSelected starts true if we're restoring to jobs phase (a config was already chosen)
  const [configSelected, setConfigSelected] = useState(initialBackupJobsPhase);
  const [backupSelection, setBackupSelection] = useState<BackupSelection | null>(null);
  const [backupSelectedRow, setBackupSelectedRow] = useState<any>(null);
  const [backupSelectedConfigId, setBackupSelectedConfigId] = useState<string>('');
  const [backupSelectedJobIds, setBackupSelectedJobIds] = useState<string[]>([]);

  // Archival phase states
  const [showArchivalJobsPhase, setShowArchivalJobsPhase] = useState(initialArchivalJobsPhase);
  const [archivalConfigSelected, setArchivalConfigSelected] = useState(initialArchivalJobsPhase);
  const [archivalSelection, setArchivalSelection] = useState<ArchivalSelection | null>(null);
  const [archivalSelectedRow, setArchivalSelectedRow] = useState<any>(null);
  const [archivalSelectedConfigId, setArchivalSelectedConfigId] = useState<string>('');
  const [archivalSelectedJobIds, setArchivalSelectedJobIds] = useState<string[]>([]);

  const setBackupJobsPhase = (v: boolean) => {
    setShowJobsPhase(v);
    onBackupJobsPhaseChange?.(v);
  };

  const setArchivalJobsPhase = (v: boolean) => {
    setShowArchivalJobsPhase(v);
    onArchivalJobsPhaseChange?.(v);
  };

  const clearBackup = () => {
    setConfigSelected(false);
    setBackupSelection(null);
    setBackupJobsPhase(false);
    setBackupSelectedRow(null);
    setBackupSelectedConfigId('');
    setBackupSelectedJobIds([]);
  };

  const clearArchival = () => {
    setArchivalConfigSelected(false);
    setArchivalSelection(null);
    setArchivalJobsPhase(false);
    setArchivalSelectedRow(null);
    setArchivalSelectedConfigId('');
    setArchivalSelectedJobIds([]);
  };

  const canProceed =
    sourceType === 'backup'
      ? (showJobsPhase ? !!backupSelection : configSelected)
      : sourceType === 'archive'
      ? (showArchivalJobsPhase ? !!archivalSelection : archivalConfigSelected)
      : false;

  const handleNext = () => {
    if (sourceType === 'archive') {
      if (showArchivalJobsPhase && archivalSelection) {
        onNext({ configType: 'ARCHIVAL', backupConfigId: archivalSelection.backupConfigId, backupJobIds: archivalSelection.backupJobIds });
      } else {
        setArchivalJobsPhase(true);
      }
      return;
    }
    if (sourceType === 'backup') {
      if (showJobsPhase && backupSelection) {
        onNext({ configType: 'BACKUP', backupConfigId: backupSelection.backupConfigId, backupJobIds: backupSelection.backupJobIds });
      } else {
        setBackupJobsPhase(true);
      }
    }
  };

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0 h-full'>

        {/* Breadcrumb */}
        <div className='flex items-center gap-2 flex-shrink-0'>
          <Link to='/restore-center' className='text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors'>
            Restore Center
          </Link>
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#94a3b8' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
          <span className='text-sm font-normal' style={{ color: '#155DFC' }}>New Restore</span>
        </div>

        {/* Step header + progress */}
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4'>
          <p className='text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1'>Step 2 of 8</p>
          <Typography as='h1' variant='pageTitle' color='primary'>Select Source Type</Typography>
          <Typography variant='bodySm' color='muted' className='mt-1'>
            Choose the type of source to restore from, then select the exact snapshot or archive entry.
          </Typography>
          <div className='mt-4'>
            <ProgressBar active={2} />
          </div>
        </div>

        {/* Source type cards — hidden for demo; backup is selected by default */}
        {/* DEMO_HIDDEN: uncomment below to restore source type selection UI
        <div className='flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
          <div className='border-b border-gray-100 px-5 py-3'>
            <Typography as='h3' variant='sectionTitle' color='secondary'>Source Type</Typography>
          </div>
          <div className='p-4 grid grid-cols-1 sm:grid-cols-2 gap-3'>
            {SOURCE_TYPES.map((s) => {
              const active = sourceType === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSourceType(s.id);
                    if (s.id === 'backup') { clearArchival(); }
                    else { clearBackup(); }
                  }}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                    active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <span className={active ? 'text-blue-600' : 'text-gray-500'}>{s.icon}</span>
                    <span className={`text-sm font-semibold ${active ? 'text-blue-600' : 'text-gray-800'}`}>{s.title}</span>
                  </div>
                  <p className='mt-1 text-xs text-gray-500'>{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
        END DEMO_HIDDEN */}

        {/* Sub-pickers */}
        {sourceType === 'backup' && (
          <BackupPicker
            showJobsPhase={showJobsPhase}
            onConfigSelected={setConfigSelected}
            onSelectionChange={setBackupSelection}
            initialSelectedRow={backupSelectedRow}
            initialSelectedConfigId={backupSelectedConfigId}
            initialSelectedJobIds={backupSelectedJobIds}
            onSelectedRowChange={setBackupSelectedRow}
            onSelectedConfigIdChange={setBackupSelectedConfigId}
            onSelectedJobIdsChange={setBackupSelectedJobIds}
          />
        )}

        {sourceType === 'archive' && (
          <ArchivalPicker
            showJobsPhase={showArchivalJobsPhase}
            onConfigSelected={setArchivalConfigSelected}
            onSelectionChange={setArchivalSelection}
            initialSelectedRow={archivalSelectedRow}
            initialSelectedConfigId={archivalSelectedConfigId}
            initialSelectedJobIds={archivalSelectedJobIds}
            onSelectedRowChange={setArchivalSelectedRow}
            onSelectedConfigIdChange={setArchivalSelectedConfigId}
            onSelectedJobIdsChange={setArchivalSelectedJobIds}
          />
        )}

      </div>

      {/* Footer */}
      <div className='flex-shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white'>
        <button
          onClick={() => {
            if (sourceType === 'backup' && showJobsPhase) { setBackupJobsPhase(false); }
            else if (sourceType === 'archive' && showArchivalJobsPhase) { setArchivalJobsPhase(false); }
            else { onBack(); }
          }}
          className='inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
        >
          ← Back
        </button>
        <div className='flex items-center gap-2'>
          <button className='inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'>
            💾 Save as Draft
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className='inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            style={{ background: '#155DFC' }}
          >
            {(sourceType === 'backup' && !showJobsPhase) || (sourceType === 'archive' && !showArchivalJobsPhase)
              ? (sourceType === 'backup' ? 'Select Backup Jobs To Restore →' : 'Select Archive Jobs To Restore →')
              : 'Next: Choose Selection Scope →'}
          </button>
        </div>
      </div>
    </div>
  );
}
