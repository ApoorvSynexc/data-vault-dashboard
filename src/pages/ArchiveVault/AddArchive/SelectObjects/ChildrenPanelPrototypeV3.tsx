/**
 * PROTOTYPE V3 — React Flow hierarchy with real API (getObjectDepthChildren).
 * Navigate to /prototype/children-panel-v3
 *
 * Usage in real flow: user picks object in main list → clicks "Set Configuration"
 * → this opens (receives objectName as prop). For prototype we show a top selector.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCrmMetadataService, type DepthChildNode } from '../../../../services/crm-metadata/crm-metadata.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type RelType = 'MasterDetail' | 'Lookup';

interface TNode {
  id: string;          // full path: "Account/Case/CaseComment"
  apiName: string;
  relType?: RelType;
  depth: number;       // 0 = root, 1 = L2, 2 = L3 …
  parentId: string | null;
  childIds: string[];
}

type FlowNodeData = {
  apiName: string;
  relType?: RelType;
  depth: number;
  isChecked: boolean;
  isMd: boolean;
  isRoot: boolean;
  onCheck: () => void;
};
type FlowNode = Node<FlowNodeData, 'objNode'>;

type FlowEdgeData = {
  isMd: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  targetId: string;
  onToggle: () => void;
};
type FlowEdge = Edge<FlowEdgeData, 'expandEdge'>;

// ── Layout constants ──────────────────────────────────────────────────────────

const NW = 180, NH = 68, HGAP = 28, VGAP = 76;

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
) {
  for (const n of nodes) {
    const id = `${parentId}/${n.name}`;
    const relType: RelType = (n.cascadeDelete || n.restrictedDelete) ? 'MasterDetail' : 'Lookup';
    const existing = map.get(parentId);
    if (existing && !existing.childIds.includes(id)) existing.childIds.push(id);
    if (!map.has(id)) {
      map.set(id, { id, apiName: n.name, relType, depth, parentId, childIds: [] });
    }
    if (n.children?.length) flattenChildren(n.children, id, depth + 1, map);
  }
}

function collectMdIds(id: string, map: Map<string, TNode>): string[] {
  const node = map.get(id);
  if (!node) return [];
  const selfMd = node.relType === 'MasterDetail' ? [id] : [];
  return [...selfMd, ...node.childIds.flatMap((cid) => collectMdIds(cid, map))];
}

function collectDescendants(id: string, map: Map<string, TNode>): string[] {
  const node = map.get(id);
  if (!node) return [id];
  return [id, ...node.childIds.flatMap((cid) => collectDescendants(cid, map))];
}

// ── Custom node ───────────────────────────────────────────────────────────────

function ObjNode({ data, id }: NodeProps<FlowNode>) {
  const { apiName, relType, depth, isChecked, isMd, isRoot, onCheck } = data;
  const col = dc(depth);

  return (
    <div
      onClick={() => { if (!isMd && !isRoot) onCheck(); }}
      style={{
        width: NW, minHeight: NH,
        background: (isChecked || isRoot) ? col.bg : '#fff',
        border: `${isChecked || isRoot ? 2 : 1.5}px solid ${isChecked || isRoot ? col.border : '#E2E8F0'}`,
        borderRadius: 10,
        boxShadow: isChecked ? `0 0 0 3px ${col.ring}` : '0 1px 3px rgba(0,0,0,0.07)',
        padding: '7px 9px',
        display: 'flex', flexDirection: 'column', gap: 4,
        cursor: isMd || isRoot ? 'default' : 'pointer',
        transition: 'all 0.12s',
        userSelect: 'none',
      }}
    >
      <Handle type='target' position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />

      {/* Row 1: icon/lock + name + level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {isRoot ? (
          <div style={{ width: 18, height: 18, borderRadius: 5, background: col.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>{apiName[0]}</span>
          </div>
        ) : isMd ? (
          <div title='Required — MasterDetail' style={{ width: 16, height: 16, borderRadius: 4, background: '#EDE9FE', border: '1.5px solid #A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'not-allowed' }}>
            <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='#7C3AED' strokeWidth='3.5'><polyline points='20 6 9 17 4 12' /></svg>
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

      {/* Row 2: rel badge */}
      {relType && (
        <div style={{ display: 'flex' }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
            ...(relType === 'MasterDetail'
              ? { background: '#EDE9FE', color: '#7C3AED', border: '1px solid #C4B5FD' }
              : { background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }) }}>
            {relType === 'MasterDetail' ? '⛓ MasterDetail' : 'Lookup'}
          </span>
        </div>
      )}

      <Handle type='source' position={Position.Bottom} id={`${id}-src`} style={{ opacity: 0, pointerEvents: 'none' }} />
    </div>
  );
}

// ── Custom edge with expand/collapse "+" button ───────────────────────────────

function ExpandEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data,
}: EdgeProps<FlowEdge>) {
  if (!data) return null;
  const { isMd, hasChildren, isExpanded, onToggle } = data;

  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: isMd ? '#7C3AED' : '#CBD5E1',
          strokeWidth: isMd ? 2 : 1.5,
          strokeDasharray: isMd ? undefined : '5 4',
        }}
      />
      {hasChildren && (
        <EdgeLabelRenderer>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              width: 18, height: 18, borderRadius: '50%',
              border: `1.5px solid ${isMd ? '#7C3AED' : '#94A3B8'}`,
              background: isMd ? '#F5F3FF' : '#F8FAFC',
              color: isMd ? '#7C3AED' : '#64748B',
              fontSize: 13, fontWeight: 700, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              zIndex: 10,
              transition: 'all 0.12s',
            }}
            title={isExpanded ? 'Collapse children' : 'Expand children'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const NODE_TYPES = { objNode: ObjNode };
const EDGE_TYPES = { expandEdge: ExpandEdge };

// ── Inner canvas (receives stable props) ──────────────────────────────────────

function FlowCanvas({
  treeMap,
  rootId,
  expandedIds,
  checkedIds,
  onToggleExpand,
  onCheck,
}: {
  treeMap: Map<string, TNode>;
  rootId: string;
  expandedIds: Set<string>;
  checkedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onCheck: (id: string) => void;
}) {
  // Visible node IDs = root + all children of expanded parents
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

  // Compute positions
  const positions = useMemo<Map<string, { x: number; y: number }>>(() => {
    const pos = new Map<string, { x: number; y: number }>();
    placeNodes(rootId, 0, treeMap, visibleIds, pos);
    return pos;
  }, [treeMap, rootId, visibleIds]);

  // Build RF nodes
  const rfNodes: FlowNode[] = useMemo(() =>
    [...visibleIds].flatMap((id) => {
      const node = treeMap.get(id);
      if (!node) return [];
      const pos = positions.get(id) ?? { x: 0, y: 0 };
      const isMd = node.relType === 'MasterDetail';
      const isRoot = node.depth === 0;
      return {
        id,
        type: 'objNode' as const,
        position: pos,
        data: {
          apiName: node.apiName,
          relType: node.relType,
          depth: node.depth,
          isChecked: isRoot || checkedIds.has(id),
          isMd,
          isRoot,
          onCheck: () => onCheck(id),
        },
        draggable: false,
      };
    }), [treeMap, visibleIds, positions, checkedIds, onCheck]);

  // Build RF edges
  const rfEdges: FlowEdge[] = useMemo(() =>
    [...visibleIds]
      .filter((id) => {
        const node = treeMap.get(id);
        return node?.parentId && visibleIds.has(node.parentId);
      })
      .map((id) => {
        const node = treeMap.get(id)!;
        const isMd = node.relType === 'MasterDetail';
        const hasChildren = node.childIds.length > 0;
        const isExpanded = expandedIds.has(id);
        return {
          id: `${node.parentId}->${id}`,
          source: node.parentId!,
          target: id,
          type: 'expandEdge' as const,
          data: { isMd, hasChildren, isExpanded, targetId: id, onToggle: () => onToggleExpand(id) },
        };
      }), [treeMap, visibleIds, expandedIds, onToggleExpand]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={() => {}}
      onEdgesChange={() => {}}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.15}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background color='#E2E8F0' gap={20} size={1} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

// ── Right sidebar ─────────────────────────────────────────────────────────────

function RightSidebar({
  treeMap, checkedIds, rootId, isLoading,
}: {
  treeMap: Map<string, TNode>;
  checkedIds: Set<string>;
  rootId: string;
  isLoading: boolean;
}) {
  const selected = [...checkedIds].filter((id) => id.startsWith(rootId + '/'));
  const mdSelected = selected.filter((id) => treeMap.get(id)?.relType === 'MasterDetail');
  const lkpSelected = selected.filter((id) => treeMap.get(id)?.relType === 'Lookup');

  return (
    <div style={{
      width: 230, flexShrink: 0,
      background: '#fff', borderLeft: '1px solid #E2E8F0',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0 }}>Children Selection</p>
        <p style={{ fontSize: 10, color: '#94A3B8', margin: '3px 0 0' }}>
          {isLoading ? 'Loading hierarchy…' : `${selected.length} objects included`}
        </p>
      </div>

      {/* Selected list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 }}>
            {[1,2,3,4].map((i) => (
              <div key={i} style={{ height: 28, borderRadius: 6, background: '#F1F5F9', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : (
          <>
            {mdSelected.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '6px 0 4px' }}>
                  MasterDetail ({mdSelected.length})
                </p>
                {mdSelected.map((id) => {
                  const n = treeMap.get(id);
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px', borderRadius: 6, background: '#F5F3FF', marginBottom: 2 }}>
                      <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: '#EDE9FE', color: '#7C3AED', fontWeight: 700, flexShrink: 0 }}>L{(n?.depth ?? 0) + 1}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#4C1D95', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n?.apiName}</span>
                    </div>
                  );
                })}
              </>
            )}
            {lkpSelected.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '10px 0 4px' }}>
                  Lookup ({lkpSelected.length})
                </p>
                {lkpSelected.map((id) => {
                  const n = treeMap.get(id);
                  return (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px', borderRadius: 6, background: '#F8FAFC', marginBottom: 2 }}>
                      <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: '#E2E8F0', color: '#64748B', fontWeight: 700, flexShrink: 0 }}>L{(n?.depth ?? 0) + 1}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n?.apiName}</span>
                    </div>
                  );
                })}
              </>
            )}
            {selected.length === 0 && (
              <p style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 24 }}>Nothing selected yet</p>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 2, background: '#7C3AED' }} />
          <span style={{ fontSize: 10, color: '#7C3AED', fontWeight: 600 }}>MasterDetail (auto-selected)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 0, borderTop: '2px dashed #CBD5E1' }} />
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Lookup (optional)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #94A3B8', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', lineHeight: 1 }}>+</span>
          </div>
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Expand / collapse level</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
          {['L1','L2','L3','L4','L5','L6'].map((lbl, i) => {
            const col = dc(i);
            return (
              <span key={lbl} style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: col.ring, color: col.text }}>
                {lbl}
              </span>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button style={{ padding: '8px', borderRadius: 8, background: '#1D4ED8', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Apply Selection →
        </button>
        <button style={{ padding: '8px', borderRadius: 8, background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

// For prototype, user picks the root object from a small top bar.
// In real usage, this receives objectName as a prop from the wizard.
const DEMO_OBJECTS = ['Account', 'Opportunity', 'Contact', 'Case', 'Order'];

export default function ChildrenPanelPrototypeV3() {
  const [rootName, setRootName] = useState('Account');
  const [treeMap, setTreeMap]   = useState<Map<string, TNode>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading]     = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);

  const crmService = useCrmMetadataService();

  // Load full tree when rootName changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setApiError(null);
      setExpandedIds(new Set());
      setCheckedIds(new Set());

      const rootId = rootName;
      const rootNode: TNode = { id: rootId, apiName: rootName, depth: 0, parentId: null, childIds: [] };
      const map = new Map<string, TNode>([[rootId, rootNode]]);
      setTreeMap(map); // seed immediately so FlowCanvas doesn't crash before API resolves

      try {
        const res = await crmService.getObjectDepthChildren(rootName, 'archival', undefined, 5);
        const children: DepthChildNode[] = (res as any)?.data?.children ?? (res as any)?.children ?? [];
        flattenChildren(children, rootId, 1, map);

        if (cancelled) return;

        // Auto-select all MasterDetail nodes
        const mdIds = map.get(rootId)!.childIds.flatMap((cid) => collectMdIds(cid, map));

        // Auto-expand: root + all MD ancestor paths
        const toExpand = new Set<string>([rootId]);
        mdIds.forEach((mdId) => {
          // expand all ancestors of this MD node
          const parts = mdId.split('/');
          for (let i = 1; i < parts.length; i++) {
            toExpand.add(parts.slice(0, i).join('/'));
          }
        });

        setTreeMap(map);
        setExpandedIds(toExpand);
        setCheckedIds(new Set(mdIds));
      } catch (e: any) {
        if (!cancelled) setApiError(e?.response?.data?.message ?? e?.message ?? 'Failed to load children');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [rootName]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        collectMdIds(id, treeMap).forEach((m) => next.add(m));
      }
      return next;
    });
  }, [treeMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#F8FAFC', fontFamily: 'system-ui,sans-serif' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
          ⚠ PROTOTYPE V3
        </span>
        <div style={{ height: 16, width: 1, background: '#E2E8F0' }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0 }}>
          {rootName} — Child Hierarchy
        </p>
        <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>
          Click <strong>+</strong> on an edge to expand that level · Click Lookup nodes to include/exclude · MasterDetail auto-selected
        </p>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#64748B' }}>Preview object:</span>
          <select
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#374151', cursor: 'pointer' }}
          >
            {DEMO_OBJECTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          {isLoading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFCcc', zIndex: 20, gap: 10 }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#1D4ED8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Fetching children for {rootName}…</p>
            </div>
          )}
          {apiError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 20 }}>
              <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>Failed to load</p>
              <p style={{ fontSize: 11, color: '#94A3B8' }}>{apiError}</p>
            </div>
          )}
          <ReactFlowProvider key={rootName}>
            <FlowCanvas
              treeMap={treeMap}
              rootId={rootName}
              expandedIds={expandedIds}
              checkedIds={checkedIds}
              onToggleExpand={handleToggleExpand}
              onCheck={handleCheck}
            />
          </ReactFlowProvider>
        </div>

        {/* Right sidebar */}
        <RightSidebar
          treeMap={treeMap}
          checkedIds={checkedIds}
          rootId={rootName}
          isLoading={isLoading}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
