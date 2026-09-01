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
import { useCrmMetadataService } from '../../../../services/crm-metadata/crm-metadata.service';

// Fires the describe API for a MasterDetail child at tier-1 so the data is
// cached before the user manually expands the row.
// Also checks fields[] for cascadeDelete:true — meaning this child itself has a
// MasterDetail parent elsewhere — and reports it via onMasterDetailField.
function PrefetchDescribe({
  objectName,
  parentObjectName,
  allowedObjectNames,
  relationshipDepth,
  parentLoaded,
  onMasterDetailField,
  onLoadingChange,
}: {
  objectName: string;
  parentObjectName: string;
  allowedObjectNames?: Set<string>;
  relationshipDepth?: number | null;
  parentLoaded: boolean;
  onMasterDetailField: (childObject: string, parentObject: string, parentLabel: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const crmMetadataService = useCrmMetadataService();
  // PrefetchDescribe always runs for tier-1 MasterDetail children (depth=1),
  // and prefetches their children which would be at tier-2, so +1 offset.
  const rdepth = (relationshipDepth ?? 0) + 1;
  const { data, isFetching } = useQuery({
    queryKey: ['crm-metadata-describe', objectName, 'archival', rdepth],
    queryFn: () => crmMetadataService.getObjectDescribe(objectName, 'archival', undefined, rdepth),
    // Only fire after the parent describe response has loaded
    enabled: !!objectName && parentLoaded,
  });

  useEffect(() => {
    onLoadingChange?.(isFetching);
    return () => onLoadingChange?.(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching]);

  const reportedRef = useRef<Set<string>>(new Set());
  // Reset on every mount so re-mounting (after deselect→reselect) re-reports from cached data.
  useEffect(() => { reportedRef.current = new Set(); }, []);
  useEffect(() => {
    if (!data) return;
    const fields: any[] = (data as any)?.data?.fields ?? [];
    fields
      .filter((f: any) => {
        if (!f.cascadeDelete) return false;
        // Use referenceTo[0] as the actual parent object API name
        const refTo: string = f.referenceTo?.[0] ?? f.name;
        if (reportedRef.current.has(refTo)) return false;
        // Skip if the referenced object is the parent that triggered this prefetch
        if (refTo === parentObjectName) return false;
        // Only warn for objects present in the main object list
        if (allowedObjectNames && !allowedObjectNames.has(refTo)) return false;
        return true;
      })
      .forEach((f: any) => {
        const refTo: string = f.referenceTo?.[0] ?? f.name;
        reportedRef.current.add(refTo);
        onMasterDetailField(objectName, refTo, f.label ?? refTo);
      });
  }, [data, objectName, parentObjectName, allowedObjectNames, onMasterDetailField]);

  return null;
}

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
  relationshipDepth?: number | null;
  allowedObjectNames?: Set<string>;
  onMasterDetailWarning?: (childObject: string, parentObject: string, parentLabel: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function ChildRows({
  crmId, objectName, parentUuid, depth,
  selectedChildObjects, toggleChildObject,
  registerChildApiName, registerChildFieldApiName, registerChildParent,
  includeChild, setIncludeChild, maxDepth, resetTick = 0, relationshipDepth,
  allowedObjectNames, onMasterDetailWarning, onLoadingChange,
}: ChildRowsProps) {
  const effectiveMax = maxDepth ?? MAX_CHILD_DEPTH;
  const crmMetadataService = useCrmMetadataService();
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Stable UUID map keyed by (parentUuid, childName) so the same object name under
  // different parents gets a different UUID, preventing cross-parent selection bleed.
  const uuidMapRef = useRef<Map<string, string>>(new Map());
  const getChildUuid = (childName: string): string => {
    const key = `${parentUuid}::${childName}`;
    if (!uuidMapRef.current.has(key)) {
      uuidMapRef.current.set(key, crypto.randomUUID());
    }
    return uuidMapRef.current.get(key)!;
  };

  // GET /v1/crm-metadata/objects/describe — fetch children of this parent object.
  // rdepth = SOQL relationshipDepth + (depth - 1) so each recursive tier increments
  // by 1: tier-1 → soqlDepth+0, tier-2 → soqlDepth+1, tier-3 → soqlDepth+2, etc.
  const rdepth = (relationshipDepth ?? 0) + (depth - 1);
  const { data, isLoading } = useQuery({
    queryKey: ['crm-metadata-describe', objectName, 'archival', rdepth],
    queryFn: () => crmMetadataService.getObjectDescribe(objectName, 'archival', undefined, rdepth),
    enabled: !!objectName,
  });

  // Notify parent wizard whenever this instance's loading state changes.
  useEffect(() => {
    onLoadingChange?.(isLoading);
    return () => onLoadingChange?.(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const rawChildren: any[] = (data as any)?.data?.children ?? (Array.isArray((data as any)?.children) ? (data as any).children : Array.isArray(data) ? data : []);

  // Deduplicate by name — API returns duplicate entries for objects with multiple relationships.
  // Also filter to only objects present in the main object list (allowedObjectNames).
  const seen = new Set<string>();
  const rawRows: any[] = rawChildren.filter((r: any) => {
    if (seen.has(r.name)) return false;
    if (allowedObjectNames && !allowedObjectNames.has(r.name)) return false;
    seen.add(r.name);
    return true;
  }).map((r: any) => ({
    uuid: getChildUuid(r.name),
    apiName: r.name,
    fieldApiName: r.field ?? r.name,
    label: r.name,
    relationshipName: r.name,
    relationshipType: (r.cascadeDelete || r.restrictedDelete) ? 'MasterDetail' : 'Lookup',
    objectType: 'Standard',
  }));

  // prevResetTickRef detects when resetTick changes (SOQL re-validate) so we know
  // selectedChildObjects was just cleared and MasterDetail rows need re-selection.
  const prevResetTickRef = useRef(resetTick);

  useEffect(() => {
    if (!data || rawRows.length === 0) return;

    const resetOccurred = prevResetTickRef.current !== resetTick;
    if (resetOccurred) prevResetTickRef.current = resetTick;

    // Register metadata for every row so buildChildTree() in AddDetailsWizard
    // can reconstruct the correct nested payload when the user hits Save
    rawRows.forEach((r: any) => {
      registerChildApiName(r.uuid as string, r.apiName as string);
      registerChildFieldApiName(r.uuid as string, r.fieldApiName as string);
      registerChildParent(r.uuid as string, parentUuid);
    });

    // Auto-select MasterDetail children that are not currently selected.
    // We check selectedChildObjects directly so Back→Next always re-selects them
    // if the state was cleared, without relying on a separate ref guard that
    // can get out of sync with the actual checkbox state.
    const masterDetailRows = rawRows.filter((r: any) => r.relationshipType === 'MasterDetail');
    const toSelect = masterDetailRows
      .map((r: any) => r.uuid as string)
      .filter((k: string) => k && !selectedChildObjects.has(k));
    toSelect.forEach((key) => toggleChildObject(key));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, parentUuid, registerChildApiName, registerChildParent, resetTick, selectedChildObjects]);

  const visibleRawRows = rawRows;

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
      {depth === 1 && rows
        .filter((r: any) => r.relationshipType === 'MasterDetail')
        .map((r: any) => (
          <tr key={`prefetch-${r.uuid}`} style={{ display: 'none' }}>
            <td><PrefetchDescribe objectName={r.apiName} parentObjectName={objectName} allowedObjectNames={allowedObjectNames} relationshipDepth={relationshipDepth} parentLoaded={!isLoading && !!data} onMasterDetailField={(child, parent, label) => onMasterDetailWarning?.(child, parent, label)} onLoadingChange={onLoadingChange} /></td>
          </tr>
        ))}
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
          } else {
            setIncludeChild((p) => ({ ...p, [childKey]: true }));
            setExpandedChild(childKey);
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
                      {row.relationshipType === 'Required Lookup' ? <><span style={{ color: '#EF4444' }}>*</span> Required Lookup</> : row.relationshipType}
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
                relationshipDepth={relationshipDepth}
                allowedObjectNames={allowedObjectNames}
                onMasterDetailWarning={onMasterDetailWarning}
                onLoadingChange={onLoadingChange}
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
