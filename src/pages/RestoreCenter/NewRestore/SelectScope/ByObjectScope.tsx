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
      <div className='px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <Typography as='h3' variant='sectionTitle' color='secondary'>◫ Select Objects</Typography>
        <div className='flex items-center gap-2 flex-wrap'>
          <div className='relative'>
            <svg className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400' width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
              <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
            </svg>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder='Search object…'
              className='pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44'
            />
          </div>
          <button onClick={toggleAll} className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap'>
            {selected.size === sourceObjectNames.length && sourceObjectNames.length > 0 ? 'Deselect all' : 'Select all'}
          </button>
          <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700'>
            {selected.size} Selected
          </span>
        </div>
      </div>
      {sourceObjectsLoading ? (
        <div className='flex items-center justify-center py-10 gap-2 text-xs text-gray-400'>
          <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin' />
          Loading objects…
        </div>
      ) : filtered.length === 0 ? (
        <p className='text-xs text-gray-400 py-8 text-center'>No objects found.</p>
      ) : (
        <div className='divide-y divide-gray-50'>
          {filtered.map((name) => (
            <div
              key={name}
              onClick={() => toggle(name)}
              className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${selected.has(name) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <input type='checkbox' checked={selected.has(name)} onChange={() => toggle(name)}
                className='w-4 h-4 accent-blue-600 cursor-pointer rounded' onClick={(e) => e.stopPropagation()} />
              <span className='text-sm font-semibold text-gray-900 font-mono'>{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
