import { useState } from 'react';
import Typography from '../../../../components/Typography';
import type { RestoreSourceObject } from '../../../../services/restore/restore.service';

interface Props {
  sourceObjects: RestoreSourceObject[];
  sourceObjectsLoading: boolean;
  onChange: (objects: string[]) => void;
}

function TypeBadge({ type }: { type: string }) {
  const isCustom = type === 'CUSTOM';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
      isCustom ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
    }`}>
      {isCustom ? 'Custom' : 'Standard'}
    </span>
  );
}

// Recursively collect all eligible descendant names from a node
function collectDescendantNames(node: RestoreSourceObject): string[] {
  const result: string[] = [];
  for (const child of node.children ?? []) {
    if ((child.completedRecordCount ?? 0) > 0) {
      result.push(child.name);
      result.push(...collectDescendantNames(child));
    }
  }
  return result;
}

const LEVEL_COLORS = ['#7C3AED', '#A16207', '#008020', '#0891B2', '#E11D48'];

// ── Recursive child rows ──────────────────────────────────────────────────────

interface ChildTreeProps {
  nodes: RestoreSourceObject[];
  depth: number;
  selected: Set<string>;
  expanded: Set<string>;
  onToggle: (name: string, allDescendants: string[]) => void;
  onExpand: (name: string) => void;
}

function ChildTree({ nodes, depth, selected, expanded, onToggle, onExpand }: ChildTreeProps) {
  const eligible = nodes.filter((n) => (n.completedRecordCount ?? 0) > 0);
  if (eligible.length === 0) return null;

  const accentColor = LEVEL_COLORS[(depth - 1) % LEVEL_COLORS.length];

  return (
    <>
      {eligible.map((node) => {
        const isSelected  = selected.has(node.name);
        const isExpanded  = expanded.has(node.name);
        const hasChildren = (node.children ?? []).some((c) => (c.completedRecordCount ?? 0) > 0);
        const descendants = collectDescendantNames(node);

        const rowBg = isSelected ? `${accentColor}08` : depth % 2 === 1 ? '#FAFBFC' : '#F4F6F8';

        return (
          <div key={node.name}>
            {/* Child row */}
            <div
              onClick={() => onToggle(node.name, descendants)}
              className='flex items-center gap-3 py-2.5 pr-5 cursor-pointer transition-colors group'
              style={{
                paddingLeft: depth * 28 + 20,
                background: rowBg,
                borderBottom: '1px solid #E8EDF2',
                borderLeft: `${isSelected ? 4 : 3}px solid ${isSelected ? accentColor : accentColor + '50'}`,
              }}
            >
              {/* Tree connector */}
              <span className='flex-shrink-0 font-mono text-sm select-none' style={{ color: accentColor + '80' }}>└──</span>

              <input
                type='checkbox'
                checked={isSelected}
                onChange={() => onToggle(node.name, descendants)}
                onClick={(e) => e.stopPropagation()}
                className='w-4 h-4 accent-blue-600 cursor-pointer rounded flex-shrink-0'
              />

              <span className={`flex-1 text-sm font-mono truncate ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                {node.name}
              </span>

              <TypeBadge type={node.type} />

              {/* Level badge */}
              <span className='flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full'
                style={{ background: `${accentColor}15`, color: accentColor }}>
                L{depth + 1}
              </span>

              {/* Expand/collapse toggle — only if has eligible children */}
              {hasChildren && (
                <button
                  onClick={(e) => { e.stopPropagation(); onExpand(node.name); }}
                  className='flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-all hover:scale-110'
                  style={{ background: `${accentColor}18`, color: accentColor }}
                >
                  <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'
                    style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <polyline points='6 9 12 15 18 9' />
                  </svg>
                </button>
              )}
            </div>

            {/* Recurse into children when expanded */}
            {isExpanded && hasChildren && (
              <ChildTree
                nodes={node.children ?? []}
                depth={depth + 1}
                selected={selected}
                expanded={expanded}
                onToggle={onToggle}
                onExpand={onExpand}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ByObjectScope({ sourceObjects, sourceObjectsLoading, onChange }: Props) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Only top-level objects with records
  const eligibleObjects = sourceObjects.filter((o) => (o.completedRecordCount ?? 0) > 0);
  const eligibleNames   = eligibleObjects.map((o) => o.name);

  const notify = (next: Set<string>) => onChange([...next]);

  // Toggle a node (parent or child): selecting a child auto-selects its parent
  const toggle = (name: string, allDescendants: string[], parentName?: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        // Uncheck: also remove all descendants
        next.delete(name);
        allDescendants.forEach((d) => next.delete(d));
      } else {
        // Check: add this node + auto-select parent if given
        next.add(name);
        if (parentName) next.add(parentName);
      }
      notify(next);
      return next;
    });
  };

  // Top-level toggle — also collapses when deselecting
  const toggleTop = (obj: RestoreSourceObject) => {
    const descendants = collectDescendantNames(obj);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(obj.name)) {
        next.delete(obj.name);
        descendants.forEach((d) => next.delete(d));
        // Collapse when deselecting
        setExpanded((e) => { const ne = new Set(e); ne.delete(obj.name); return ne; });
      } else {
        next.add(obj.name);
        // Auto-expand if has eligible children
        if ((obj.children ?? []).some((c) => (c.completedRecordCount ?? 0) > 0)) {
          setExpanded((e) => new Set([...e, obj.name]));
        }
      }
      notify(next);
      return next;
    });
  };

  // Child toggle — auto-selects parent
  const toggleChild = (name: string, descendants: string[], parentName: string) =>
    toggle(name, descendants, parentName);

  const expandToggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === eligibleNames.length && eligibleNames.length > 0) {
      setSelected(new Set());
      notify(new Set());
    } else {
      const all = new Set(eligibleNames);
      setSelected(all);
      notify(all);
    }
  };

  const filtered = eligibleObjects.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));

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
          <svg className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400'
            width='13' height='13' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
            <circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>
          </svg>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder='Search objects…'
            className='h-8 w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 text-xs text-gray-700 outline-none focus:border-blue-400 transition'
          />
        </div>
        <button
          onClick={toggleAll}
          className='text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors whitespace-nowrap'
        >
          {selected.size === eligibleNames.length && eligibleNames.length > 0 ? 'Deselect all' : 'Select all'}
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
        <>
          {/* Column headers */}
          <div className='grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-3 px-5 py-1.5 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-400'>
            <span />
            <span>Name</span>
            <span>Type</span>
            <span />
          </div>

          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {filtered.map((obj) => {
              const isSelected  = selected.has(obj.name);
              const isExpanded  = expanded.has(obj.name);
              const hasChildren = (obj.children ?? []).some((c) => (c.completedRecordCount ?? 0) > 0);

              return (
                <div key={obj.name} className='border-b border-gray-100 last:border-b-0'>
                  {/* Top-level row */}
                  <div
                    onClick={() => toggleTop(obj)}
                    className={`grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type='checkbox'
                      checked={isSelected}
                      onChange={() => toggleTop(obj)}
                      onClick={(e) => e.stopPropagation()}
                      className='w-4 h-4 accent-blue-600 cursor-pointer rounded'
                    />
                    <span className={`text-sm font-mono truncate ${isSelected ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                      {obj.name}
                    </span>
                    <TypeBadge type={obj.type} />

                    {/* Expand button — only shown when has eligible children */}
                    {hasChildren ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); expandToggle(obj.name); }}
                        className='flex items-center justify-center w-6 h-6 rounded-md transition-all hover:scale-110'
                        style={{
                          background: isExpanded ? '#155DFC18' : '#F1F5F9',
                          color: isExpanded ? '#155DFC' : '#64748B',
                        }}
                      >
                        <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'
                          style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <polyline points='6 9 12 15 18 9' />
                        </svg>
                      </button>
                    ) : (
                      <span className='w-6' />
                    )}
                  </div>

                  {/* Child tree — shown when expanded */}
                  {isExpanded && hasChildren && (
                    <ChildTree
                      nodes={obj.children ?? []}
                      depth={1}
                      selected={selected}
                      expanded={expanded}
                      onToggle={(name, descendants) => toggleChild(name, descendants, obj.name)}
                      onExpand={expandToggle}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className='px-5 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400'>
        Showing {filtered.length} of {eligibleObjects.length} objects
      </div>
    </div>
  );
}
