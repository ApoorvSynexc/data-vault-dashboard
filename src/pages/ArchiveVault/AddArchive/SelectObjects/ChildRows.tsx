// ChildRows — recursive component that renders child relationship objects
// under a parent Salesforce object in the Add Archive "Add Children" step.
//
// Recursion: when a child row is expanded, a new <ChildRows> instance renders
// beneath it with depth+1, fetching that child's own children from the API.
//
// Depth control: maxDepth = MAX_CHILD_DEPTH - relationshipDepth (from SOQL validation).
// At the depth limit, the "include child" toggle is disabled and expansion is blocked.
//
// Auto-selection: MasterDetail children are automatically checked on load because
// Salesforce cascades deletes through MasterDetail relationships, so they must be included.
//
// State registration: each child calls registerChildApiName/registerChildParent so
// the parent wizard can build the correct nested payload tree via buildChildTree().
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useArchivalService } from '../../../../services/archival/archival.service';

// Maximum nesting depth for child objects (reduced by SOQL relationshipDepth)
export const MAX_CHILD_DEPTH = 5;
// Number of child rows shown per page within this component
export const CHILD_PAGE_SIZE = 5;

export function ToggleSwitch({ on, disabled, onChange }: { on: boolean; disabled: boolean; onChange: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className='relative inline-flex items-center flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none'
      style={{ width: 36, height: 20, background: on ? '#155DFC' : '#CBD5E1', opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span
        className='inline-block rounded-full bg-white shadow transition-transform duration-200'
        style={{ width: 14, height: 14, transform: on ? 'translateX(18px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

export interface ChildRowsProps {
  crmId: string;
  objectName: string;
  parentUuid: string;
  depth: number;
  selectedChildObjects: Set<string>;
  toggleChildObject: (key: string) => void;
  registerChildApiName: (uuid: string, apiName: string) => void;
  registerChildFieldApiName: (uuid: string, fieldApiName: string) => void;
  registerChildParent: (childUuid: string, parentUuid: string) => void;
  includeChild: Record<string, boolean>;
  setIncludeChild: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  maxDepth?: number;
  resetTick?: number;
}

export function ChildRows({
  crmId, objectName, parentUuid, depth,
  selectedChildObjects, toggleChildObject,
  registerChildApiName, registerChildFieldApiName, registerChildParent,
  includeChild, setIncludeChild, maxDepth, resetTick = 0,
}: ChildRowsProps) {
  const effectiveMax = maxDepth ?? MAX_CHILD_DEPTH;
  const archivalService = useArchivalService();
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // GET /v1/archival-config/object-childs — fetch children of this parent object.
  // Keyed on parentUuid so different expanded parents don't share the same cache entry.
  const { data, isLoading } = useQuery({
    queryKey: ['archival-object-childs', crmId, parentUuid, objectName],
    queryFn: () => archivalService.getObjectChilds(crmId, objectName),
    enabled: !!crmId && !!objectName,
    staleTime: 5 * 60 * 1000,
  });

  const rawRows: any[] = data ?? [];

  // autoSelectedRef prevents double-toggling MasterDetail rows on re-renders.
  // Without it, strict-mode double-invocation would check then immediately uncheck them.
  // prevResetTickRef lets us detect when resetTick changed so we clear the guard
  // and force re-auto-selection in the same effect, guaranteeing correct order.
  const autoSelectedRef = useRef<Set<string>>(new Set());
  const prevResetTickRef = useRef(resetTick);

  useEffect(() => {
    if (!data || rawRows.length === 0) return;

    // If resetTick changed, clear the guard so MasterDetail rows are re-selected
    if (prevResetTickRef.current !== resetTick) {
      prevResetTickRef.current = resetTick;
      autoSelectedRef.current.clear();
    }

    // Register metadata for every row so buildChildTree() in AddDetailsWizard
    // can reconstruct the correct nested payload when the user hits Save
    rawRows.forEach((r: any) => {
      registerChildApiName(r.uuid as string, r.apiName as string);
      registerChildFieldApiName(r.uuid as string, r.fieldApiName as string);
      registerChildParent(r.uuid as string, parentUuid);
    });
    // Auto-select MasterDetail children — Salesforce enforces cascade delete on them.
    // Skip polymorphic ones at depth >= 1 since they are hidden from the list.
    const toSelect = rawRows
      .filter((r: any) => r.relationshipType === 'MasterDetail' && !(depth >= 2 && r.isPolymorphic))
      .map((r: any) => r.uuid as string)
      .filter((k: string) => k && !autoSelectedRef.current.has(k));
    if (toSelect.length === 0) return;
    toSelect.forEach((k: string) => { autoSelectedRef.current.add(k); });
    toSelect.forEach((key) => toggleChildObject(key));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, parentUuid, registerChildApiName, registerChildParent, resetTick]);

  // At depth >= 2 (tier 2+), hide polymorphic children — they reference multiple
  // object types via a single lookup field and cannot be reliably scoped to one parent.
  // At depth 1 (tier 1, direct children of the root object), all children are shown.
  const visibleRawRows = depth >= 2
    ? rawRows.filter((r: any) => !r.isPolymorphic)
    : rawRows;

  const rows = [...visibleRawRows].sort((a, b) => {
    const amd = a.relationshipType === 'MasterDetail' ? 0 : 1;
    const bmd = b.relationshipType === 'MasterDetail' ? 0 : 1;
    return amd - bmd;
  });

  useEffect(() => { setPage(0); }, [objectName]);

  if (isLoading) return (
    <tr>
      <td colSpan={7} style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', paddingLeft: depth * 20 + 16, paddingTop: 8, paddingBottom: 8 }}>
        <div className='flex items-center gap-2 text-xs text-gray-400'>
          <div className='animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full' />
          Loading...
        </div>
      </td>
    </tr>
  );

  if (rows.length === 0) return null;

  const totalPages = Math.ceil(rows.length / CHILD_PAGE_SIZE);
  const pagedRows = rows.slice(page * CHILD_PAGE_SIZE, (page + 1) * CHILD_PAGE_SIZE);

  return (
    <>
      {pagedRows.map((row: any) => {
        const childKey = row.uuid as string;
        const isChildSelected = selectedChildObjects.has(childKey);
        const isChildExpanded = expandedChild === childKey;
        const toggleOn = !!includeChild[childKey];
        const atDepthLimit = depth >= effectiveMax;
        const canExpand = !atDepthLimit && isChildSelected && toggleOn;

        const handleToggle = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (!isChildSelected || atDepthLimit) return;
          setIncludeChild((p) => {
            const turningOn = !p[childKey];
            const next: Record<string, boolean> = { ...p, [childKey]: turningOn };
            if (turningOn) {
              setExpandedChild(childKey);
            } else {
              setExpandedChild((c) => c === childKey ? null : c);
            }
            return next;
          });
        };

        const isMasterDetail = row.relationshipType === 'MasterDetail';

        const handleCheckbox = () => {
          if (isMasterDetail) return;
          toggleChildObject(childKey);
          if (isChildSelected) {
            setIncludeChild((p) => { const n = { ...p }; delete n[childKey]; return n; });
            setExpandedChild((c) => c === childKey ? null : c);
          }
        };

        const levelColors: Record<number, string> = { 1: '#7C3AED', 2: '#A16207', 3: '#008020', 4: '#0891B2', 5: '#E11D48' };
        const accentColor = levelColors[depth] ?? '#E11D48';
        const rowBg = isChildSelected
          ? `${accentColor}08`
          : depth === 1 ? '#FAFBFC' : depth === 2 ? '#F4F6F8' : '#EFF2F5';

        return (
          <React.Fragment key={childKey}>
            <tr className='transition-all duration-150 group'
              style={{ background: rowBg, borderBottom: isChildExpanded && canExpand ? 'none' : '1px solid #E8EDF2' }}>
              <td style={{
                borderLeft: `${isChildSelected ? 4 : 3}px solid ${isChildSelected ? accentColor : accentColor + '60'}`,
                paddingLeft: 8, paddingTop: 0, paddingBottom: 0,
                transition: 'border-color 0.15s',
              }} />
              <td className='px-3 py-2' onClick={(e) => e.stopPropagation()}>
                <div style={{ paddingLeft: depth * 20 }}>
                  <input type='checkbox' checked={isChildSelected} onChange={handleCheckbox}
                    disabled={isMasterDetail}
                    className='w-4 h-4 accent-blue-600'
                    style={{ cursor: isMasterDetail ? 'not-allowed' : 'pointer', opacity: isMasterDetail ? 0.6 : 1 }} />
                </div>
              </td>
              <td className='px-3 py-2'>
                <div className='flex items-center gap-1.5 min-w-0' style={{ paddingLeft: depth * 20 }}>
                  <span className='flex-shrink-0 select-none' style={{ color: accentColor + '90', fontSize: 13, fontFamily: 'monospace', lineHeight: 1 }}>└</span>
                  <span className='flex-shrink-0 select-none' style={{ color: accentColor + '60', fontSize: 11, fontFamily: 'monospace', lineHeight: 1, marginLeft: -2 }}>──</span>
                  <span className={`text-sm truncate ${isChildSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {row.relationshipName ?? row.label ?? row.apiName ?? row.name ?? '--'}
                  </span>
                  {row.relationshipType && (
                    <span className='flex-shrink-0 text-xs px-1.5 py-0.5 rounded-md font-medium'
                      style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                      {row.relationshipType}
                    </span>
                  )}
                  {canExpand && (
                    <button onClick={(e) => { e.stopPropagation(); setExpandedChild((c) => c === childKey ? null : childKey); }}
                      className='ml-auto flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-all hover:scale-110'
                      style={{ color: accentColor, background: `${accentColor}15` }}>
                      <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'
                        style={{ transition: 'transform 0.2s', transform: isChildExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <polyline points='6 9 12 15 18 9' />
                      </svg>
                    </button>
                  )}
                </div>
              </td>
              <td className='px-3 py-2 text-center' onClick={(e) => e.stopPropagation()}>
                <ToggleSwitch on={toggleOn} disabled={!isChildSelected || atDepthLimit} onChange={handleToggle} />
              </td>
              <td className='px-3 py-2'>
                {(() => {
                  const levelColorMap: Record<number, string> = { 1: '#7C3AED', 2: '#A16207', 3: '#008020', 4: '#0891B2', 5: '#E11D48' };
                  const color = levelColorMap[depth] ?? '#E11D48';
                  return (
                    <span className='inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold'
                      style={{ whiteSpace: 'pre', background: `${color}14`, color }}>
                      Level {depth + 1}
                    </span>
                  );
                })()}
              </td>
              <td className='px-3 py-2'>
                <span className='text-xs font-medium px-2 py-0.5 rounded-md'
                  style={{ background: '#F1F5F9', color: '#64748B' }}>
                  {row.objectType ?? row.type ?? 'Standard'}
                </span>
              </td>
              <td className='px-3 py-2' />
            </tr>
            {isChildExpanded && (
              <ChildRows
                crmId={crmId}
                objectName={row.apiName as string}
                parentUuid={childKey}
                depth={depth + 1}
                selectedChildObjects={selectedChildObjects}
                toggleChildObject={toggleChildObject}
                registerChildApiName={registerChildApiName}
                registerChildFieldApiName={registerChildFieldApiName}
                registerChildParent={registerChildParent}
                includeChild={includeChild}
                setIncludeChild={setIncludeChild}
                maxDepth={effectiveMax}
                resetTick={resetTick}
              />
            )}
          </React.Fragment>
        );
      })}
      {totalPages > 1 && (
        <tr style={{
          background: depth === 1 ? '#FAFBFC' : depth === 2 ? '#F4F6F8' : '#EFF2F5',
          borderBottom: '1px solid #E8EDF2',
          borderLeft: `3px solid ${['#155DFC', '#7C3AED', '#0891B2', '#059669', '#D97706'][(depth - 1) % 5]}40`,
        }}>
          <td colSpan={7} className='px-4 py-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-gray-400'>
                Showing {page * CHILD_PAGE_SIZE + 1}–{Math.min((page + 1) * CHILD_PAGE_SIZE, rows.length)} of {rows.length}
              </span>
              <div className='flex items-center gap-1'>
                <button onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(0, p - 1)); }}
                  disabled={page === 0}
                  className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>‹</button>
                {(() => {
                  let start = Math.max(0, page - 2);
                  const end = Math.min(totalPages - 1, start + 4);
                  start = Math.max(0, end - 4);
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((i) => (
                    <button key={i}
                      onClick={(e) => { e.stopPropagation(); setPage(i); }}
                      className='w-6 h-6 rounded-full text-xs font-medium transition-colors flex items-center justify-center'
                      style={{ background: page === i ? '#155DFC' : 'transparent', color: page === i ? 'white' : '#64748B' }}>
                      {i + 1}
                    </button>
                  ));
                })()}
                <button onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages - 1, p + 1)); }}
                  disabled={page >= totalPages - 1}
                  className='px-2 py-1 text-xs text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors'>›</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
