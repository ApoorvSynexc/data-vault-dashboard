import { useState } from 'react';
import Typography from '../../../../components/Typography';

interface Props {
  sourceObjectNames: string[];
  sourceObjectsLoading: boolean;
  onChange: (objects: string[]) => void;
}

export default function ByObjectScope({ sourceObjectNames, sourceObjectsLoading, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      onChange([...next]);
      return next;
    });
  };

  const toggleAll = () => {
    const next = selected.size === sourceObjectNames.length && sourceObjectNames.length > 0
      ? new Set<string>()
      : new Set(sourceObjectNames);
    setSelected(next);
    onChange([...next]);
  };

  const filtered = sourceObjectNames.filter((n) => n.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden'>
      {/* Header */}
      <div className='px-5 py-3 border-b border-gray-100 flex items-center justify-between'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>◫ Select Objects</Typography>
        {selected.size > 0 && (
          <span className='text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700'>
            {selected.size} selected
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className='px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3'>
        <div className='relative max-w-xs flex-1'>
          <svg className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
            <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
          </svg>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder='Search objects…'
            className='h-8 w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-700 outline-none focus:border-blue-400 transition'
          />
        </div>
        <button onClick={toggleAll} className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap'>
          {selected.size === sourceObjectNames.length && sourceObjectNames.length > 0 ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {sourceObjectsLoading ? (
        <div className='flex items-center justify-center py-10 gap-2 text-xs text-gray-400'>
          <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />
          Loading objects…
        </div>
      ) : filtered.length === 0 ? (
        <p className='text-xs text-gray-400 py-8 text-center'>No objects found.</p>
      ) : (
        <div className='divide-y divide-gray-50' style={{ maxHeight: 600, overflowY: 'auto' }}>
          {filtered.map((name) => (
            <div
              key={name}
              onClick={() => toggle(name)}
              className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${selected.has(name) ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
            >
              <input type='checkbox' checked={selected.has(name)} onChange={() => toggle(name)}
                className='w-4 h-4 accent-blue-600 cursor-pointer rounded flex-shrink-0' onClick={(e) => e.stopPropagation()} />
              <span className={`text-sm font-mono ${selected.has(name) ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{name}</span>
            </div>
          ))}
        </div>
      )}

      <div className='px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400'>
        Showing {filtered.length} of {sourceObjectNames.length} objects
      </div>
    </div>
  );
}
