import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  getSmoothStepPath,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCrmMetadataService, type DepthChildNode } from '../../../../services/crm-metadata/crm-metadata.service';
import type { BuiltChildNode } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

type RelType = 'MasterDetail' | 'RequiredLookup' | 'Lookup';

export type MdWarning = {
  childName: string;
  fieldApiName?: string;
  otherParents: string[]; // other objects this child is also a MasterDetail child of
};

interface TNode {
  id: string;
  apiName: string;
  fieldApiName?: string;
  relType?: RelType;
  depth: number;
  parentId: string | null;
  childIds: string[];
  otherMdParents?: string[]; // populated when parent[] contains other MD relationships
}

type FlowNodeData = {
  apiName: string;
  fieldApiName?: string;
  relType?: RelType;
  depth: number;
  isChecked: boolean;
  isRequired: boolean; // MasterDetail or RequiredLookup — auto-selected, non-interactive
  isRoot: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  onCheck: () => void;
  onToggleExpand: () => void;
};
type FlowNode = Node<FlowNodeData, 'objNode'>;

type FlowEdgeData = { relType?: RelType };
type FlowEdge = Edge<FlowEdgeData, 'expandEdge'>;

// ── Layout constants ──────────────────────────────────────────────────────────

const NW = 180, NH = 84, HGAP = 28, VGAP = 72;

const DCOL: Record<number, { border: string; bg: string; text: string; ring: string }> = {
  0: { border: '#1D4ED8', bg: '#EFF6FF', text: '#1E40AF', ring: '#BFDBFE' },
  1: { border: '#3B82F6', bg: '#F0F9FF', text: '#1D4ED8', ring: '#BAE6FD' },
  2: { border: '#7C3AED', bg: '#F5F3FF', text: '#6D28D9', ring: '#DDD6FE' },
  3: { border: '#059669', bg: '#ECFDF5', text: '#047857', ring: '#A7F3D0' },
  4: { border: '#D97706', bg: '#FFFBEB', text: '#B45309', ring: '#FDE68A' },
  5: { border: '#DC2626', bg: '#FEF2F2', text: '#B91C1C', ring: '#FECACA' },
};
const dc = (d: number) => DCOL[Math.min(d, 5)];

// ── Tree layout ───────────────────────────────────────────────────────────────

function subtreeW(id: string, map: Map<string, TNode>, visibleIds: Set<string>): number {
  const node = map.get(id);
  if (!node) return NW;
  const visibleChildren = node.childIds.filter((cid) => visibleIds.has(cid));
  if (!visibleChildren.length) return NW;
  return Math.max(NW, visibleChildren.reduce((s, cid) => s + subtreeW(cid, map, visibleIds) + HGAP, -HGAP));
}

function placeNodes(
  id: string,
  xCenter: number,
  map: Map<string, TNode>,
  visibleIds: Set<string>,
  positions: Map<string, { x: number; y: number }>,
) {
  const node = map.get(id);
  if (!node) return;
  positions.set(id, { x: xCenter - NW / 2, y: node.depth * (NH + VGAP) });
  const visibleChildren = node.childIds.filter((cid) => visibleIds.has(cid));
  if (!visibleChildren.length) return;
  const totalW = visibleChildren.reduce((s, cid) => s + subtreeW(cid, map, visibleIds) + HGAP, -HGAP);
  let xCur = xCenter - totalW / 2;
  for (const cid of visibleChildren) {
    const cw = subtreeW(cid, map, visibleIds);
    placeNodes(cid, xCur + cw / 2, map, visibleIds, positions);
    xCur += cw + HGAP;
  }
}

// ── Flatten API response into TNode map ───────────────────────────────────────

function flattenChildren(
  nodes: DepthChildNode[],
  parentId: string,
  depth: number,
  map: Map<string, TNode>,
  rootName: string,
) {
  for (const n of nodes) {
    // Combine name + field for a unique key:
    // - same object (e.g. "Asset") can appear via different fields
    // - same field (e.g. "AccountId") can be used by different objects
    const id = `${parentId}/${n.name}/${n.field}`;
    const relType: RelType = n.cascadeDelete
      ? 'MasterDetail'
      : n.restrictedDelete
        ? 'RequiredLookup'
        : 'Lookup';

    // Detect other MasterDetail parents: parent[] entries where cascadeDelete=true
    // and referenceTo doesn't point to the root object being archived.
    let otherMdParents: string[] | undefined;
    if (relType === 'MasterDetail' && Array.isArray(n.parent) && n.parent.length > 0) {
      const others = (n.parent as { cascadeDelete: boolean; referenceTo?: string[] }[])
        .filter((p) => p.cascadeDelete && p.referenceTo?.some((ref) => ref !== rootName))
        .flatMap((p) => (p.referenceTo ?? []).filter((ref) => ref !== rootName));
      if (others.length > 0) otherMdParents = others;
    }

    const existing = map.get(parentId);
    if (existing && !existing.childIds.includes(id)) existing.childIds.push(id);
    if (!map.has(id)) {
      map.set(id, { id, apiName: n.name, fieldApiName: n.field, relType, depth, parentId, childIds: [], otherMdParents });
    }
    if (n.children?.length) flattenChildren(n.children, id, depth + 1, map, rootName);
  }
}

function isAutoSelected(relType?: RelType) {
  return relType === 'MasterDetail' || relType === 'RequiredLookup';
}

function collectAutoIds(id: string, map: Map<string, TNode>): string[] {
  const node = map.get(id);
  if (!node) return [];
  const selfAuto = isAutoSelected(node.relType) ? [id] : [];
  return [...selfAuto, ...node.childIds.flatMap((cid) => collectAutoIds(cid, map))];
}

function collectDescendants(id: string, map: Map<string, TNode>): string[] {
  const node = map.get(id);
  if (!node) return [id];
  return [id, ...node.childIds.flatMap((cid) => collectDescendants(cid, map))];
}

// ── Build BuiltChildNode[] from tree state ────────────────────────────────────

function buildBuiltNodes(
  parentId: string,
  checkedIds: Set<string>,
  treeMap: Map<string, TNode>,
): BuiltChildNode[] {
  const parent = treeMap.get(parentId);
  if (!parent) return [];
  return parent.childIds
    .filter((cid) => checkedIds.has(cid))
    .map((cid) => {
      const child = treeMap.get(cid)!;
      const subChildren = buildBuiltNodes(cid, checkedIds, treeMap);
      return {
        id: crypto.randomUUID(),
        name: child.apiName,
        fieldApiName: child.fieldApiName,
        type: 'STANDARD' as const,
        condition: { type: 'AND' as const },
        field: [] as never[],
        ...(subChildren.length > 0 ? { includeChild: true, children: subChildren } : {}),
      };
    });
}

// ── Restore checked IDs from saved BuiltChildNode[] ──────────────────────────

function restoreCheckedIds(
  saved: BuiltChildNode[],
  parentId: string,
  treeMap: Map<string, TNode>,
  result: Set<string>,
): void {
  const parent = treeMap.get(parentId);
  if (!parent) return;
  for (const s of saved) {
    const matchId = parent.childIds.find((cid) => {
      const c = treeMap.get(cid);
      return c?.apiName === s.name && c?.fieldApiName === s.fieldApiName;
    });
    if (!matchId) continue;
    result.add(matchId);
    if (s.children?.length) restoreCheckedIds(s.children, matchId, treeMap, result);
  }
}

// ── Custom node ───────────────────────────────────────────────────────────────

function ObjNode({ data, id }: NodeProps<FlowNode>) {
  const { apiName, fieldApiName, relType, depth, isChecked, isRequired, isRoot, hasChildren, isExpanded, onCheck, onToggleExpand } = data;
  const col = dc(depth);
  const isMd = relType === 'MasterDetail';
  const isReqLookup = relType === 'RequiredLookup';
  return (
    <div
      onClick={() => { if (!isRequired && !isRoot) onCheck(); }}
      style={{
        width: NW,
        background: (isChecked || isRoot) ? col.bg : '#fff',
        border: `${isChecked || isRoot ? 2 : 1.5}px solid ${isChecked || isRoot ? col.border : '#E2E8F0'}`,
        borderRadius: 10,
        boxShadow: isChecked ? `0 0 0 3px ${col.ring}` : '0 1px 3px rgba(0,0,0,0.07)',
        padding: '7px 9px',
        display: 'flex', flexDirection: 'column', gap: 4,
        cursor: isRequired || isRoot ? 'default' : 'pointer',
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
    >
      <Handle type='target' position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />

      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {isRoot ? (
          <div style={{ width: 18, height: 18, borderRadius: 5, background: col.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>{apiName[0]}</span>
          </div>
        ) : isMd ? (
          <div title='Auto-included — MasterDetail' style={{ width: 16, height: 16, borderRadius: 4, background: '#EDE9FE', border: '1.5px solid #A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'not-allowed' }}>
            <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='#7C3AED' strokeWidth='3.5'><polyline points='20 6 9 17 4 12' /></svg>
          </div>
        ) : isReqLookup ? (
          <div title='Auto-included — Required Lookup' style={{ width: 16, height: 16, borderRadius: 4, background: '#FEF3C7', border: '1.5px solid #FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'not-allowed' }}>
            <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='#D97706' strokeWidth='3.5'><polyline points='20 6 9 17 4 12' /></svg>
          </div>
        ) : (
          <div style={{ width: 16, height: 16, borderRadius: 4, background: isChecked ? col.border : '#E2E8F0', border: `1.5px solid ${isChecked ? col.border : '#CBD5E1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isChecked && <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='#fff' strokeWidth='3.5'><polyline points='20 6 9 17 4 12' /></svg>}
          </div>
        )}
        <span style={{ fontSize: 11, fontWeight: isChecked || isRoot ? 700 : 600, color: isChecked || isRoot ? col.text : '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {apiName}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 99, background: col.ring, color: col.text, border: `1px solid ${col.border}30`, flexShrink: 0 }}>
          L{depth + 1}
        </span>
      </div>

      {/* Field API name — distinguishes same-object nodes with different relationship fields */}
      {!isRoot && fieldApiName && (
        <span style={{ fontSize: 9, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          via {fieldApiName}
        </span>
      )}

      {/* Relation type badge */}
      {relType && (
        <div style={{ display: 'flex' }}>
          {isMd && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#EDE9FE', color: '#7C3AED', border: '1px solid #C4B5FD' }}>
              ⛓ MasterDetail
            </span>
          )}
          {isReqLookup && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' }}>
              🔒 Required Lookup
            </span>
          )}
          {relType === 'Lookup' && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>
              Lookup
            </span>
          )}
        </div>
      )}

      {/* Expand / collapse toggle — Lookup nodes must be selected before expanding */}
      {hasChildren && (() => {
        const expandDisabled = !isRequired && !isRoot && !isChecked;
        return (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
            <button
              onClick={(e) => { e.stopPropagation(); if (!expandDisabled) onToggleExpand(); }}
              disabled={expandDisabled}
              title={expandDisabled ? 'Select this node first to expand its children' : isExpanded ? 'Collapse children' : 'Expand children'}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                border: `1.5px solid ${expandDisabled ? '#E2E8F0' : isMd ? '#A78BFA' : isReqLookup ? '#FCD34D' : isRoot ? col.border : '#94A3B8'}`,
                background: expandDisabled ? '#F8FAFC' : isMd ? '#EDE9FE' : isReqLookup ? '#FEF3C7' : isRoot ? col.bg : '#F8FAFC',
                color: expandDisabled ? '#CBD5E1' : isMd ? '#7C3AED' : isReqLookup ? '#D97706' : isRoot ? col.text : '#64748B',
                fontSize: 14, fontWeight: 700, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: expandDisabled ? 'not-allowed' : 'pointer',
                boxShadow: expandDisabled ? 'none' : '0 1px 3px rgba(0,0,0,0.10)',
                transition: 'all 0.12s',
                flexShrink: 0,
                opacity: expandDisabled ? 0.4 : 1,
              }}
            >
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        );
      })()}

      <Handle type='source' position={Position.Bottom} id={`${id}-src`} style={{ opacity: 0, pointerEvents: 'none' }} />
    </div>
  );
}

// ── Custom edge (simple connector line) ───────────────────────────────────────

function ExpandEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<FlowEdge>) {
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 });
  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: data?.relType === 'MasterDetail' ? '#7C3AED' : data?.relType === 'RequiredLookup' ? '#D97706' : '#CBD5E1',
        strokeWidth: data?.relType === 'MasterDetail' || data?.relType === 'RequiredLookup' ? 2 : 1.5,
        strokeDasharray: data?.relType === 'MasterDetail' || data?.relType === 'RequiredLookup' ? undefined : '5 4',
      }}
    />
  );
}

const NODE_TYPES = { objNode: ObjNode };
const EDGE_TYPES = { expandEdge: ExpandEdge };

// ── Inner canvas ──────────────────────────────────────────────────────────────

function FlowCanvas({
  treeMap, rootId, expandedIds, checkedIds, onToggleExpand, onCheck,
}: {
  treeMap: Map<string, TNode>;
  rootId: string;
  expandedIds: Set<string>;
  checkedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onCheck: (id: string) => void;
}) {
  const { fitView } = useReactFlow();

  const visibleIds = useMemo<Set<string>>(() => {
    const visible = new Set<string>([rootId]);
    function addVisible(id: string) {
      const node = treeMap.get(id);
      if (!node || !expandedIds.has(id)) return;
      node.childIds.forEach((cid) => { visible.add(cid); addVisible(cid); });
    }
    addVisible(rootId);
    return visible;
  }, [treeMap, rootId, expandedIds]);

  const handleInit = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => fitView({ padding: 0.18 })));
  }, [fitView]);

  const positions = useMemo<Map<string, { x: number; y: number }>>(() => {
    const pos = new Map<string, { x: number; y: number }>();
    placeNodes(rootId, 0, treeMap, visibleIds, pos);
    return pos;
  }, [treeMap, rootId, visibleIds]);

  const rfNodes: FlowNode[] = useMemo(() =>
    [...visibleIds].flatMap((id) => {
      const node = treeMap.get(id);
      if (!node) return [];
      const pos = positions.get(id) ?? { x: 0, y: 0 };
      const isRoot = node.depth === 0;
      return [{
        id,
        type: 'objNode' as const,
        position: pos,
        data: {
          apiName: node.apiName,
          fieldApiName: node.fieldApiName,
          relType: node.relType,
          depth: node.depth,
          isChecked: isRoot || checkedIds.has(id),
          isRequired: isAutoSelected(node.relType),
          isRoot,
          hasChildren: node.childIds.length > 0,
          isExpanded: expandedIds.has(id),
          onCheck: () => onCheck(id),
          onToggleExpand: () => onToggleExpand(id),
        },
        draggable: false,
      }];
    }), [treeMap, visibleIds, positions, checkedIds, expandedIds, onCheck, onToggleExpand]);

  // Refit after nodes are actually painted (double-RAF ensures layout is complete)
  useEffect(() => {
    if (rfNodes.length === 0) return;
    let raf1: number, raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        fitView({ padding: 0.18, duration: 200 });
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  // rfNodes.length covers initial appearance; visibleIds.size covers expand/collapse
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes.length, visibleIds.size]);

  const rfEdges: FlowEdge[] = useMemo(() =>
    [...visibleIds]
      .filter((id) => {
        const node = treeMap.get(id);
        return node?.parentId && visibleIds.has(node.parentId);
      })
      .map((id) => {
        const node = treeMap.get(id)!;
        return {
          id: `${node.parentId}->${id}`,
          source: node.parentId!,
          target: id,
          type: 'expandEdge' as const,
          data: { relType: node.relType },
        };
      }), [treeMap, visibleIds]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={() => {}}
      onEdgesChange={() => {}}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onInit={handleInit}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.15}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background color='#E2E8F0' gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ChildHierarchyPanelProps {
  objectName: string;
  initialBuiltChildren?: BuiltChildNode[];
  onSelectionChange: (children: BuiltChildNode[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  onMasterDetailWarnings?: (warnings: MdWarning[]) => void;
}

// ── Main panel component ──────────────────────────────────────────────────────

export function ChildHierarchyPanel({
  objectName,
  initialBuiltChildren,
  onSelectionChange,
  onLoadingChange,
  onMasterDetailWarnings,
}: ChildHierarchyPanelProps) {
  const [treeMap, setTreeMap] = useState<Map<string, TNode>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Prevents emitting onSelectionChange during initial load/restoration
  const isReadyRef = useRef(false);
  // Always holds the latest callbacks without being deps of the emit effect
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const onMdWarningsRef = useRef(onMasterDetailWarnings);
  onMdWarningsRef.current = onMasterDetailWarnings;

  const crmService = useCrmMetadataService();

  useEffect(() => {
    let cancelled = false;
    isReadyRef.current = false;

    // setTimeout(0) prevents double API calls from React Strict Mode:
    // the cleanup clears the timer before it fires on the first (discarded) run.
    const startTimer = setTimeout(async () => {
      if (cancelled) return;

      setIsLoading(true);
      onLoadingChange?.(true);
      setApiError(null);
      setExpandedIds(new Set());
      setCheckedIds(new Set());

      const rootNode: TNode = { id: objectName, apiName: objectName, depth: 0, parentId: null, childIds: [] };
      const map = new Map<string, TNode>([[objectName, rootNode]]);
      setTreeMap(map);

      try {
        const res = await crmService.getObjectDepthChildren(objectName, 'archival', 'schedule');
        if (cancelled) return;

        const children: DepthChildNode[] = (res as any)?.data?.children ?? (res as any)?.children ?? [];
        flattenChildren(children, objectName, 1, map, objectName);

        // Collect multi-parent MasterDetail warnings from the freshly built tree
        const warnings: MdWarning[] = [];
        for (const [, node] of map) {
          if (node.otherMdParents?.length) {
            warnings.push({ childName: node.apiName, fieldApiName: node.fieldApiName, otherParents: node.otherMdParents });
          }
        }
        onMdWarningsRef.current?.(warnings);

        // Auto-select MasterDetail and RequiredLookup nodes
        const mdIds = map.get(objectName)!.childIds.flatMap((cid) => collectAutoIds(cid, map));
        const initialChecked = new Set<string>(mdIds);

        // Restore previously saved selection
        if (initialBuiltChildren?.length) {
          restoreCheckedIds(initialBuiltChildren, objectName, map, initialChecked);
        }

        setTreeMap(new Map(map));
        setExpandedIds(new Set([objectName]));  // show root + level-1 children on first load
        setCheckedIds(initialChecked);
        isReadyRef.current = true;

        // Emit initial selection to parent
        onSelectionChangeRef.current(buildBuiltNodes(objectName, initialChecked, map));
      } catch (e: any) {
        if (!cancelled) setApiError(e?.response?.data?.message ?? e?.message ?? 'Failed to load children');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          onLoadingChange?.(false);
        }
      }
    }, 0);

    return () => { cancelled = true; clearTimeout(startTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectName]);

  // Emit on every user-driven checkedIds change (not during initial load)
  useEffect(() => {
    if (!isReadyRef.current) return;
    onSelectionChangeRef.current(buildBuiltNodes(objectName, checkedIds, treeMap));
  // treeMap is intentionally omitted — it's stable after load and captured via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIds]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        collectDescendants(id, treeMap).forEach((d) => next.delete(d));
      } else {
        next.add(id);
        collectAutoIds(id, treeMap).forEach((m: string) => next.add(m));
      }
      return next;
    });
  }, [treeMap]);

  return (
    <div style={{ height: 440, border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', background: '#F8FAFC', position: 'relative' }}>
      {isLoading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,250,252,0.9)', zIndex: 20, gap: 8 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: '#1D4ED8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 11, color: '#64748B', fontWeight: 600, margin: 0 }}>Loading {objectName} hierarchy…</p>
        </div>
      )}
      {apiError && !isLoading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 20 }}>
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, margin: 0 }}>Failed to load hierarchy</p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{apiError}</p>
        </div>
      )}
      <ReactFlowProvider key={objectName}>
        <FlowCanvas
          treeMap={treeMap}
          rootId={objectName}
          expandedIds={expandedIds}
          checkedIds={checkedIds}
          onToggleExpand={handleToggleExpand}
          onCheck={handleCheck}
        />
      </ReactFlowProvider>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
