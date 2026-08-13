import { useState, useRef } from 'react';
import Papa from 'papaparse';
import Joi from 'joi';
import Typography from '../../../../components/Typography';
import type { SourceSelection } from '../SelectSourceType';

type CsvConfig = { text: string; parsedIds: string[]; fileName: string | null; errors: { row: number; message: string }[] };

interface Props {
  sourceObjectNames: string[];
  sourceObjectsLoading: boolean;
  sourceSelection: SourceSelection;
  onChange: (bulkCsvIds: { objectName: string; ids: string[] }[]) => void;
}

const idSchema = Joi.string().min(1).required().messages({
  'string.empty': 'ID cannot be empty',
  'any.required': 'ID is required',
});

const blank = (): CsvConfig => ({ text: '', parsedIds: [], fileName: null, errors: [] });

export default function BulkCsvScope({ sourceObjectNames, sourceObjectsLoading, onChange }: Props) {
  const [objSearch,   setObjSearch]   = useState('');
  const [addedObjs,   setAddedObjs]   = useState<string[]>([]);
  const [configByObj, setConfigByObj] = useState<Record<string, CsvConfig>>({});
  const [modalObj,    setModalObj]    = useState<string | null>(null);
  const [errorOpen,   setErrorOpen]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modalCfg: CsvConfig = configByObj[modalObj ?? ''] ?? blank();

  const setCfg = (obj: string, patch: Partial<CsvConfig>) =>
    setConfigByObj((p) => ({ ...p, [obj]: { ...(p[obj] ?? blank()), ...patch } }));

  const notifyChange = (nextConfig: Record<string, CsvConfig>, nextAdded: string[]) =>
    onChange(nextAdded
      .filter((obj) => (nextConfig[obj]?.parsedIds?.length ?? 0) > 0)
      .map((obj) => ({ objectName: obj, ids: nextConfig[obj].parsedIds })));

  const parseCsvFile = (file: File, targetObj: string) => {
    setCfg(targetObj, { errors: [], parsedIds: [], fileName: file.name });
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: { row: number; message: string }[] = [];
        const ids: string[] = [];
        const firstCol = results.meta.fields?.[0];
        if (!firstCol || firstCol.trim().toLowerCase() !== 'id') {
          errors.push({ row: 0, message: `First column must be "Id" but found "${firstCol ?? 'nothing'}"` });
          setCfg(targetObj, { errors, fileName: file.name });
          setErrorOpen(true);
          return;
        }
        results.data.forEach((row, i) => {
          const id = row[firstCol]?.trim();
          const { error } = idSchema.validate(id);
          if (error) errors.push({ row: i + 2, message: error.message });
          else ids.push(id);
        });
        if (errors.length > 0) setErrorOpen(true);
        setConfigByObj((prev) => {
          const next = { ...prev, [targetObj]: { ...(prev[targetObj] ?? blank()), parsedIds: ids, errors, fileName: file.name } };
          notifyChange(next, addedObjs);
          return next;
        });
      },
      error: (err) => {
        setCfg(targetObj, { errors: [{ row: 0, message: `Failed to parse CSV: ${err.message}` }], fileName: file.name });
        setErrorOpen(true);
      },
    });
  };

  const toggleObj = (name: string) => {
    if (addedObjs.includes(name)) {
      const next = addedObjs.filter((o) => o !== name);
      setAddedObjs(next);
      setConfigByObj((prev) => { const n = { ...prev }; delete n[name]; notifyChange(n, next); return n; });
    } else {
      setAddedObjs((prev) => [...prev, name]);
    }
  };

  const openModal = (name: string) => {
    setModalObj(name);
    setErrorOpen(false);
  };

  const closeModal = () => setModalObj(null);

  const clearObj = (name: string) => {
    setConfigByObj((prev) => {
      const next = { ...prev, [name]: blank() };
      notifyChange(next, addedObjs);
      return next;
    });
  };

  const idCount  = (name: string) => configByObj[name]?.parsedIds.length ?? 0;
  const hasData  = (name: string) => idCount(name) > 0 || !!(configByObj[name]?.fileName);
  const totalIds = addedObjs.reduce((s, o) => s + idCount(o), 0);
  const filteredObjs = sourceObjectNames.filter((n) => n.toLowerCase().includes(objSearch.toLowerCase()));

  return (
    <>
      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
        <div className='px-5 py-3 border-b border-gray-100 flex items-center justify-between'>
          <Typography as='h3' variant='sectionTitle' color='secondary'>📋 Bulk Match via CSV</Typography>
          {totalIds > 0 && (
            <span className='text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700'>
              {addedObjs.filter((o) => idCount(o) > 0).length} object{addedObjs.filter((o) => idCount(o) > 0).length !== 1 ? 's' : ''} · {totalIds} IDs
            </span>
          )}
        </div>

        {/* Search */}
        <div className='px-4 py-2.5 border-b border-gray-100 bg-gray-50'>
          <div className='relative max-w-xs'>
            <svg className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
              <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
            </svg>
            <input value={objSearch} onChange={(e) => setObjSearch(e.target.value)} placeholder='Search objects…'
              className='h-8 w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-700 outline-none focus:border-blue-400 transition' />
          </div>
        </div>

        {/* Object list */}
        {sourceObjectsLoading ? (
          <div className='flex items-center justify-center py-10 gap-2 text-xs text-gray-400'>
            <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />Loading objects…
          </div>
        ) : sourceObjectNames.length === 0 ? (
          <p className='text-xs text-gray-400 py-8 text-center'>No objects found.</p>
        ) : (
          <div className='divide-y divide-gray-50' style={{ maxHeight: 600, overflowY: 'auto' }}>
            {filteredObjs.map((name) => {
              const isTicked = addedObjs.includes(name);
              const count    = idCount(name);
              const loaded   = hasData(name);
              return (
                <div key={name} className={`flex items-center gap-3 px-5 py-3 transition-colors ${isTicked ? 'bg-blue-50/40' : 'bg-white hover:bg-gray-50'}`}>
                  <input type='checkbox' checked={isTicked} onChange={() => toggleObj(name)}
                    className='w-4 h-4 accent-blue-600 cursor-pointer rounded flex-shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <span className={`text-sm font-mono truncate block ${isTicked ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{name}</span>
                    {isTicked && count > 0 && (
                      <span className='text-[11px] text-blue-600 font-medium'>{count} ID{count !== 1 ? 's' : ''} loaded</span>
                    )}
                  </div>
                  {isTicked && (
                    <button onClick={() => openModal(name)}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${loaded ? 'border-blue-400 bg-blue-600 text-white hover:bg-blue-700' : 'border-blue-300 text-blue-600 hover:bg-blue-50'}`}>
                      {loaded ? (
                        <>
                          <svg width='11' height='11' fill='none' stroke='currentColor' strokeWidth='2.5' viewBox='0 0 24 24'><polyline points='20 6 9 17 4 12'/></svg>
                          Edit CSV
                        </>
                      ) : 'Upload CSV →'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className='px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400'>
          Showing {filteredObjs.length} of {sourceObjectNames.length} objects · {addedObjs.length} selected
        </div>
      </div>

      {/* Upload Modal */}
      {modalObj && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={closeModal}>
          <div className='bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden'
            style={{ width: 620, maxHeight: '90vh', border: '1px solid #E2E8F0' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0'>
              <div>
                <h2 className='text-base font-bold text-gray-900 font-mono'>{modalObj}</h2>
                <p className='text-xs text-gray-400 mt-0.5'>Upload a CSV or paste record IDs for this object</p>
              </div>
              <button onClick={closeModal} className='p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className='flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5'>
              <input ref={fileInputRef} type='file' accept='.csv' className='hidden'
                onChange={(e) => { const f = e.target.files?.[0]; if (f) parseCsvFile(f, modalObj); e.target.value = ''; }} />

              {/* Drop zone */}
              <div className='border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer'
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) parseCsvFile(f, modalObj); }}>
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' className='w-10 h-10 mx-auto mb-3 text-gray-300'>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M12 16V4m0 0L8 8m4-4l4 4M4 20h16' />
                </svg>
                {modalCfg.fileName
                  ? <p className='text-sm font-semibold text-blue-600'>{modalCfg.fileName}</p>
                  : <p className='text-sm font-semibold text-gray-700'>Drop a CSV here or <span className='text-blue-600'>click to browse</span></p>}
                <p className='text-xs text-gray-400 mt-1'>First column must be <code className='bg-gray-100 px-1 rounded'>Id</code>. UTF-8 encoded.</p>
              </div>

              {/* Divider */}
              <div className='flex items-center gap-3'>
                <div className='flex-1 h-px bg-gray-200' />
                <span className='text-xs text-gray-400 font-medium'>or paste IDs</span>
                <div className='flex-1 h-px bg-gray-200' />
              </div>

              {/* Paste area */}
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-gray-700'>Paste record IDs <span className='font-normal text-gray-400'>(one per line)</span></label>
                <textarea value={modalCfg.text}
                  onChange={(e) => {
                    const text = e.target.value;
                    const ids = text.split('\n').map((l) => l.trim()).filter(Boolean);
                    const errors: { row: number; message: string }[] = [];
                    const valid: string[] = [];
                    ids.forEach((id, i) => { const { error } = idSchema.validate(id); if (error) errors.push({ row: i + 1, message: error.message }); else valid.push(id); });
                    setConfigByObj((prev) => { const next = { ...prev, [modalObj]: { ...(prev[modalObj] ?? blank()), text, parsedIds: valid, errors, fileName: null } }; notifyChange(next, addedObjs); return next; });
                  }}
                  rows={5}
                  placeholder={'001dN00000xECllQAG\n001dN00000xEClmQAG\n001dN00000xEClnQAG'}
                  className='w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-gray-50' />
              </div>

              {/* Status banners */}
              {modalCfg.parsedIds.length > 0 && (
                <div className='flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='w-4 h-4 flex-shrink-0'><path strokeLinecap='round' strokeLinejoin='round' d='M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V7l-5-5H5a2 2 0 00-2 2v14a2 2 0 002 2z'/></svg>
                  <span>
                    <strong>{modalCfg.parsedIds.length} valid ID{modalCfg.parsedIds.length !== 1 ? 's' : ''}</strong> loaded
                    {modalCfg.errors.length > 0 && <> · <span className='text-red-600 font-semibold cursor-pointer underline' onClick={() => setErrorOpen(true)}>{modalCfg.errors.length} error{modalCfg.errors.length !== 1 ? 's' : ''}</span></>}
                  </span>
                </div>
              )}
              {modalCfg.errors.length > 0 && modalCfg.parsedIds.length === 0 && (
                <div className='flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 cursor-pointer' onClick={() => setErrorOpen(true)}>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='w-4 h-4 flex-shrink-0'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
                  <span><strong>{modalCfg.errors.length} error{modalCfg.errors.length !== 1 ? 's' : ''}</strong> found — <span className='underline'>click to view</span></span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className='flex-shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between'>
              <button onClick={() => clearObj(modalObj)} className='text-xs font-medium text-gray-500 hover:text-red-500 transition-colors'>
                Clear
              </button>
              <div className='flex items-center gap-3'>
                <button onClick={closeModal} className='px-5 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'>Cancel</button>
                <button onClick={closeModal} className='px-6 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error modal */}
      {errorOpen && modalObj && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden' style={{ maxHeight: '80vh' }}>
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
              <div className='flex items-center gap-2'>
                <svg viewBox='0 0 24 24' fill='none' stroke='#DC2626' strokeWidth='2' className='w-5 h-5'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
                <h3 className='text-sm font-bold text-gray-900'>CSV Validation Errors</h3>
              </div>
              <button onClick={() => setErrorOpen(false)} className='text-gray-400 hover:text-gray-600 transition-colors'>
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='w-5 h-5'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>
              </button>
            </div>
            <div className='overflow-y-auto flex-1 px-5 py-4 space-y-2'>
              {modalCfg.errors.map((err, i) => (
                <div key={i} className='flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5'>
                  <span className='text-xs font-bold text-red-400 w-14 shrink-0'>{err.row === 0 ? 'Header' : `Row ${err.row}`}</span>
                  <span className='text-xs text-red-700'>{err.message}</span>
                </div>
              ))}
            </div>
            <div className='px-5 py-3 border-t border-gray-100 flex justify-end'>
              <button onClick={() => setErrorOpen(false)} className='px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors'>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
