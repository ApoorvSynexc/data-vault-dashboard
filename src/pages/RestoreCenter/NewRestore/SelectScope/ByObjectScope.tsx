import { useState } from 'react';
import Typography from '../../../../components/Typography';
import type { RestoreSourceObject } from '../../../../services/restore/restore.service';
import { useCrmMetadataService } from '../../../../services/crm-metadata/crm-metadata.service';
import type { DepthChildNode } from '../../../../services/crm-metadata/crm-metadata.service';

function depthNodesToSourceObjects(nodes: DepthChildNode[], allObjects: RestoreSourceObject[]): RestoreSourceObject[] {
  const flatLookup = new Map<string, RestoreSourceObject>();
  const walk = (list: RestoreSourceObject[]) => {
    for (const o of list) { flatLookup.set(o.name, o); if (o.children?.length) walk(o.children); }
  };
  walk(allObjects);
  const convert = (list: DepthChildNode[]): RestoreSourceObject[] =>
    list.map((n) => {
      const known = flatLookup.get(n.name);
      return {
        id:       known?.id,
        name:     n.name,
        type:     known?.type ?? 'STANDARD',
        children: n.children?.length ? convert(n.children) : [],
      };
    });
  return convert(nodes);
}

interface Props {
  sourceObjects: RestoreSourceObject[];
  sourceObjectsLoading: boolean;
  onChange: (objects: { id?: string; name: string; type: string }[]) => void;
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

// Recursively collect all descendant names.
function collectDescendantNames(node: RestoreSourceObject): string[] {
  const result: string[] = [];
  for (const child of node.children ?? []) {
    result.push(child.name);
    result.push(...collectDescendantNames(child));
  }
  return result;
}

const LEVEL_COLORS = ['#7C3AED', '#A16207', '#008020', '#0891B2', '#E11D48'];

// ── Recursive child rows ──────────────────────────────────────────────────────

interface ChildTreeProps {
  nodes: RestoreSourceObject[];
  depth: number;
  pathPrefix: string;       // unique path prefix to namespace expand keys
  selected: Set<string>;
  expanded: Set<string>;
  onToggle: (name: string, allDescendants: string[]) => void;
  onExpand: (expandKey: string) => void;
}

function ChildTree({ nodes, depth, pathPrefix, selected, expanded, onToggle, onExpand }: ChildTreeProps) {
  if (nodes.length === 0) return null;

  const accentColor = LEVEL_COLORS[(depth - 1) % LEVEL_COLORS.length];

  return (
    <>
      {nodes.map((node) => {
        const expandKey  = `${pathPrefix}/${node.name}`;
        const isSelected  = selected.has(node.name);
        const isExpanded  = expanded.has(expandKey);
        const hasChildren = (node.children ?? []).length > 0;
        const descendants = collectDescendantNames(node);

        const rowBg = isSelected ? `${accentColor}08` : depth % 2 === 1 ? '#FAFBFC' : '#F4F6F8';

        return (
          <div key={expandKey}>
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

              <span className='flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full'
                style={{ background: `${accentColor}15`, color: accentColor }}>
                L{depth + 1}
              </span>

              {hasChildren && (
                <button
                  onClick={(e) => { e.stopPropagation(); onExpand(expandKey); }}
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

            {isExpanded && hasChildren && (
              <ChildTree
                nodes={node.children ?? []}
                depth={depth + 1}
                pathPrefix={expandKey}
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
  const crmMetadataService = useCrmMetadataService();

  const [search,      setSearch]      = useState('');
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set());
  // childrenMap: objectName → children fetched from API (overrides static children)
  const [childrenMap, setChildrenMap] = useState<Map<string, RestoreSourceObject[]>>(new Map());
  const [fetchedSet,  setFetchedSet]  = useState<Set<string>>(new Set());
  const [fetchingObj, setFetchingObj] = useState<string | null>(null);

  const eligibleObjects = sourceObjects.filter((o) =>
    o.completedRecordCount === undefined || o.completedRecordCount > 0,
  );
  const eligibleNames = eligibleObjects.map((o) => o.name);

  // Build a flat name → {id, type} lookup from all source objects + fetched children
  const buildObjectMeta = (): Map<string, { id?: string; type: string }> => {
    const map = new Map<string, { id?: string; type: string }>();
    const walk = (nodes: RestoreSourceObject[]) => {
      for (const n of nodes) {
        map.set(n.name, { id: n.id, type: n.type ?? 'STANDARD' });
        if (n.children?.length) walk(n.children);
      }
    };
    walk(sourceObjects);
    childrenMap.forEach((children) => walk(children));
    return map;
  };

  const notify = (next: Set<string>) => {
    const meta = buildObjectMeta();
    onChange([...next].map((name) => ({ name, id: meta.get(name)?.id, type: meta.get(name)?.type ?? 'STANDARD' })));
  };

  const toggle = (name: string, allDescendants: string[], parentName?: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        allDescendants.forEach((d) => next.delete(d));
      } else {
        next.add(name);
        if (parentName) next.add(parentName);
      }
      notify(next);
      return next;
    });
  };

  // Top-level toggle — hit API on first select to populate children, then expand
  const toggleTop = (obj: RestoreSourceObject) => {
    const expandKey = `root/${obj.name}`;
    const getChildren = () => childrenMap.get(obj.name) ?? obj.children ?? [];

    if (selected.has(obj.name)) {
      const descendants = collectDescendantNames({ ...obj, children: getChildren() });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(obj.name);
        descendants.forEach((d) => next.delete(d));
        notify(next);
        return next;
      });
      setExpanded((e) => { const ne = new Set(e); ne.delete(expandKey); return ne; });
    } else {
      setSelected((prev) => { const next = new Set(prev); next.add(obj.name); notify(next); return next; });

      if (!fetchedSet.has(obj.name)) {
        setFetchedSet((prev) => new Set([...prev, obj.name]));
        setFetchingObj(obj.name);
        crmMetadataService.getObjectDepthChildren(obj.name, 'normal', undefined, 1)
          .then((res: any) => {
            const raw: DepthChildNode[] = res?.data?.children ?? res?.children ?? [];
            const children = depthNodesToSourceObjects(raw, sourceObjects);
            if (children.length > 0) {
              setChildrenMap((prev) => new Map(prev).set(obj.name, children));
            }
          })
          .catch(() => {})
          .finally(() => setFetchingObj(null));
      }
    }
  };

  const toggleChild = (name: string, descendants: string[], parentName: string) =>
    toggle(name, descendants, parentName);

  const expandToggle = (expandKey: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(expandKey) ? next.delete(expandKey) : next.add(expandKey);
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
              const expandKey      = `root/${obj.name}`;
              const isSelected     = selected.has(obj.name);
              const isExpanded     = expanded.has(expandKey);
              const mergedChildren = childrenMap.get(obj.name) ?? obj.children ?? [];
              const hasChildren    = mergedChildren.length > 0;
              const isThisFetching = fetchingObj === obj.name;
              const isBlocked      = fetchingObj !== null && !isThisFetching;

              return (
                <div key={obj.name} className='border-b border-gray-100 last:border-b-0'>
                  {/* Top-level row */}
                  <div
                    onClick={() => !isBlocked && toggleTop(obj)}
                    className={`grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-3 px-5 py-3 transition-colors ${
                      isBlocked ? 'opacity-40 cursor-not-allowed' :
                      isSelected ? 'bg-blue-50/40 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    {isThisFetching ? (
                      <div className='w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin flex-shrink-0' />
                    ) : (
                      <input
                        type='checkbox'
                        checked={isSelected}
                        disabled={isBlocked}
                        onChange={() => !isBlocked && toggleTop(obj)}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-4 h-4 accent-blue-600 rounded ${isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      />
                    )}
                    <span className={`text-sm font-mono truncate ${isSelected ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                      {obj.name}
                    </span>
                    <TypeBadge type={obj.type} />

                    {hasChildren ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); expandToggle(expandKey); }}
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

                  {/* Child tree */}
                  {isExpanded && hasChildren && (
                    <ChildTree
                      nodes={mergedChildren}
                      depth={1}
                      pathPrefix={expandKey}
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
