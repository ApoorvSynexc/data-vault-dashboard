import { useState } from 'react';
import Typography from '../../../components/Typography';

type Template = {
  id: string;
  name: string;
  subtitle: string;
  source: 'Backup' | 'Archive';
  objects: string;
  lastUsed: string;
  version: string;
  pinned: boolean;
};

const TEMPLATES: Template[] = [
  { id: '1', name: 'INC Emergency – Accounts',         subtitle: 'Overwrite · Production', source: 'Backup',  objects: 'Account, Contact',   lastUsed: 'Today',   version: 'v3', pinned: true  },
  { id: '2', name: 'Weekly Sandbox Refresh',            subtitle: 'Masked · Sandbox',       source: 'Backup',  objects: 'All Objects',        lastUsed: 'May 20',  version: 'v1', pinned: false },
  { id: '3', name: "Restore Yesterday's Deleted Leads", subtitle: 'Deleted-only · Same Org',source: 'Backup',  objects: 'Lead',               lastUsed: 'May 18',  version: 'v2', pinned: false },
  { id: '4', name: 'Roll Back Bulk Opportunity Update', subtitle: 'Overwrite · Same Org',   source: 'Backup',  objects: 'Opportunity',        lastUsed: 'May 15',  version: 'v1', pinned: false },
  { id: '5', name: 'Closed Cases Archive Pull',         subtitle: 'Archive · Production',   source: 'Archive', objects: 'Case',               lastUsed: 'May 10',  version: 'v1', pinned: false },
];

interface Props {
  onBack?: () => void;
  onNewTemplate?: () => void;
  onRun?: () => void;
}

export default function RestoreTemplates({ onBack, onNewTemplate, onRun }: Props) {
  const [templates, setTemplates] = useState(TEMPLATES);
  const [search, setSearch] = useState('');

  const togglePin = (id: string) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, pinned: !t.pinned } : t));
  };

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className='flex-1 min-h-0 bg-gray-50 flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 gap-4 min-h-0'>

        {/* Header */}
        <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm flex-shrink-0'>
          <div className='flex items-center gap-3'>
            {onBack && (
              <button
                onClick={onBack}
                className='rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition'
              >
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-5 w-5'>
                  <path d='M19 12H5M12 19l-7-7 7-7' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </button>
            )}
            <div>
              <div className='flex items-center gap-2'>
                <Typography as='h2' variant='pageTitle'>Restore Templates</Typography>
                <span className='flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[10px] font-semibold text-gray-400 cursor-default' title='Saved restore configurations'>i</span>
              </div>
              <Typography variant='bodySm' color='muted' className='mt-0.5'>Saved restore configurations</Typography>
            </div>
          </div>
          <button
            onClick={onNewTemplate}
            className='inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition whitespace-nowrap'
          >
            + New Template
          </button>
        </div>

        {/* Table Card */}
        <div className='flex-1 min-h-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>

          {/* Search bar */}
          <div className='flex-shrink-0 px-5 py-3 border-b border-gray-100'>
            <div className='relative w-64'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400'>
                <circle cx='11' cy='11' r='8' /><path d='M21 21l-4.35-4.35' strokeLinecap='round' />
              </svg>
              <input
                type='text'
                placeholder='Search templates...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-full'
              />
            </div>
          </div>

          {/* Table */}
          <div className='flex-1 overflow-y-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100'>
                  {[{ label: 'Template Name', wide: true }, { label: 'Source' }, { label: 'Objects' }, { label: 'Last Used' }, { label: 'Version' }, { label: 'Actions' }].map(({ label, wide }) => (
                    <th key={label} className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap ${wide ? 'w-72' : ''}`}>
                      <span className='flex items-center gap-1'>
                        {label}
                        {label !== 'Actions' && (
                          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='h-3 w-3 text-gray-300'>
                            <path d='M7 15l5 5 5-5M7 9l5-5 5 5' strokeLinecap='round' strokeLinejoin='round' />
                          </svg>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='px-5 py-12 text-center text-sm text-gray-400'>No templates found.</td>
                  </tr>
                ) : filtered.map((t) => (
                  <tr key={t.id} className='border-b border-gray-50 hover:bg-gray-50 transition-colors'>
                    {/* Template Name */}
                    <td className='px-5 py-4'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => togglePin(t.id)}
                          className='shrink-0 transition'
                          title={t.pinned ? 'Unpin' : 'Pin'}
                        >
                          <svg viewBox='0 0 24 24' fill={t.pinned ? '#F59E0B' : 'none'} stroke={t.pinned ? '#F59E0B' : '#D1D5DB'} strokeWidth='2' className='h-4 w-4'>
                            <polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' strokeLinecap='round' strokeLinejoin='round' />
                          </svg>
                        </button>
                        <div>
                          <p className='font-semibold text-gray-900'>{t.name}</p>
                          <p className='text-xs text-gray-400 mt-0.5'>{t.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    {/* Source */}
                    <td className='px-5 py-4'>
                      {t.source === 'Backup'
                        ? <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700'>Backup</span>
                        : <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700'>Archive</span>
                      }
                    </td>
                    {/* Objects */}
                    <td className='px-5 py-4 text-gray-600'>{t.objects}</td>
                    {/* Last Used */}
                    <td className='px-5 py-4 text-gray-600 whitespace-nowrap'>{t.lastUsed}</td>
                    {/* Version */}
                    <td className='px-5 py-4'>
                      <span className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600'>{t.version}</span>
                    </td>
                    {/* Actions */}
                    <td className='px-5 py-4'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={onRun}
                          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition'
                        >
                          <svg viewBox='0 0 24 24' fill='currentColor' className='h-3 w-3'><polygon points='5 3 19 12 5 21 5 3' /></svg>
                          Run
                        </button>
                        <button className='px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition'>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className='flex-shrink-0 border-t border-gray-100 px-5 py-3'>
            <p className='text-xs text-gray-400'>Showing {filtered.length} of {templates.length} templates</p>
          </div>
        </div>

      </div>
    </div>
  );
}
