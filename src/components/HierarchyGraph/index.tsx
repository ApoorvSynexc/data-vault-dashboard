import { useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, Position, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export type HierarchyNode = {
  id: string;
  name: string;
  cascadeDelete?: boolean;
  restrictedDelete?: boolean;
  children?: HierarchyNode[];
};

// cascadeDelete wins regardless of restrictedDelete — a Master-Detail child is
// also restricted-delete under the hood, so check it first.
const RELATIONSHIP = {
  MASTER_DETAIL: { label: 'Master Detail', color: '#7C3AED', background: 'rgba(124,58,237,0.1)' },
  REQUIRED_LOOKUP: { label: 'Required Lookup', color: '#B45309', background: 'rgba(217,119,6,0.1)' },
} as const;

function getRelationship(node: HierarchyNode) {
  if (node.cascadeDelete === true) return RELATIONSHIP.MASTER_DETAIL;
  if (node.restrictedDelete === true) return RELATIONSHIP.REQUIRED_LOOKUP;
  return null;
}

type HierarchyGraphModalProps = {
  isOpen: boolean;
  onClose: () => void;
  rootId: string;
  rootLabel: string;
  // The root's children tree — same shape as the `children` key sent in the backup payload
  children: HierarchyNode[];
};

const LEVEL_HEIGHT = 138;
const SIBLING_WIDTH = 230;
const NODE_WIDTH = 200;

// Small "object" glyph used inside every node's icon chip
function ObjectIcon({ color }: { color: string }) {
  return (
    <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' />
      <polyline points='3.27 6.96 12 12.01 20.73 6.96' />
      <line x1='12' y1='22.08' x2='12' y2='12' />
    </svg>
  );
}

// Each direct child of the root anchors its own branch color; every descendant
// under it (edges + a node accent) inherits that same color, so a whole branch
// reads as one color from root to leaf instead of one uniform gray mesh.
const BRANCH_COLORS = ['#155DFC', '#059669', '#D97706', '#DB2777', '#7C3AED', '#0891B2', '#DC2626', '#65A30D'];

// Simple layered top-down layout: y by depth (parent above, children below),
// x centered over each node's own subtree — no external layout library needed
// for a tree this shallow.
function layoutTree(root: HierarchyNode) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nextCol = 0;

  // `graphId` is per-occurrence, not per-object — the same Salesforce object can
  // be a master-detail child of more than one parent, so it can legitimately
  // appear more than once in this tree. Keying nodes by the shared object uuid
  // would collapse those occurrences into one (React Flow requires unique ids),
  // silently dropping boxes and leaving edges pointing at nothing.
  function visit(node: HierarchyNode, depth: number, parentGraphId: string | undefined, branchColor: string | undefined): number {
    const graphId = parentGraphId ? `${parentGraphId}/${node.id}` : node.id;
    const kids = node.children ?? [];
    let x: number;
    if (kids.length > 0) {
      const childXs = kids.map((child, i) =>
        visit(child, depth + 1, graphId, depth === 0 ? BRANCH_COLORS[i % BRANCH_COLORS.length] : branchColor),
      );
      x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    } else {
      x = nextCol * SIBLING_WIDTH;
      nextCol += 1;
    }

    const isRoot = depth === 0;
    const accent = isRoot ? '#155DFC' : (branchColor ?? '#94A3B8');
    const badgeColors = isRoot
      ? { background: 'rgba(255,255,255,0.22)', color: '#fff' }
      : { background: `${accent}1A`, color: accent };
    const relationship = isRoot ? null : getRelationship(node);

    nodes.push({
      id: graphId,
      position: { x, y: depth * LEVEL_HEIGHT },
      data: {
        label: (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              width: NODE_WIDTH,
              padding: isRoot ? '10px 16px' : '9px 14px 8px 12px',
              borderRadius: 12,
              background: isRoot ? 'linear-gradient(135deg, #1B64FF 0%, #0B3FCB 100%)' : '#fff',
              border: isRoot ? '1px solid #0B3FCB' : '1px solid #EAEEF3',
              boxShadow: isRoot ? '0 6px 16px rgba(21,93,252,0.32)' : '0 1px 2px rgba(15,23,42,0.05), 0 1px 6px rgba(15,23,42,0.04)',
            }}
          >
            {!isRoot && (
              <span style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 3, background: accent }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: isRoot ? 'rgba(255,255,255,0.2)' : `${accent}14`,
                }}
              >
                <ObjectIcon color={isRoot ? '#fff' : accent} />
              </span>
              <span style={{ fontSize: 12, fontWeight: isRoot ? 700 : 600, color: isRoot ? '#fff' : '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.name}
              </span>
              {kids.length > 0 && (
                <span
                  title={`${kids.length} child object${kids.length > 1 ? 's' : ''}`}
                  style={{ ...badgeColors, fontSize: 10, fontWeight: 700, lineHeight: '15px', minWidth: 15, padding: '0 5px', borderRadius: 999, textAlign: 'center', flexShrink: 0 }}
                >
                  {kids.length}
                </span>
              )}
            </div>
            {relationship && (
              <span
                style={{
                  fontSize: 9.5, fontWeight: 700, lineHeight: '14px', letterSpacing: 0.2,
                  color: relationship.color, background: relationship.background,
                  borderRadius: 999, padding: '1px 8px', whiteSpace: 'nowrap',
                }}
              >
                {relationship.label}
              </span>
            )}
          </div>
        ),
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: { background: 'transparent', border: 'none', padding: 0, width: NODE_WIDTH },
    });

    if (parentGraphId) {
      edges.push({
        id: `${parentGraphId}->${graphId}`,
        source: parentGraphId,
        target: graphId,
        type: 'smoothstep',
        style: { stroke: branchColor ?? '#94A3B8', strokeWidth: 2 },
      });
    }

    return x;
  }

  visit(root, 0, undefined, undefined);
  return { nodes, edges };
}

export default function HierarchyGraphModal({ isOpen, onClose, rootId, rootLabel, children }: HierarchyGraphModalProps) {
  const { nodes, edges } = useMemo(
    () => layoutTree({ id: rootId, name: rootLabel, children }),
    [rootId, rootLabel, children],
  );

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={onClose}>
      <div
        className='flex h-[92vh] w-[96vw] max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between border-b border-gray-100 px-5 py-4 flex-shrink-0'>
          <div>
            <p className='text-sm font-semibold text-gray-900'>{rootLabel} — Object Hierarchy</p>
            <p className='text-xs text-gray-400 mt-0.5'>Objects that will be backed up together with {rootLabel}</p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600'
          >
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        <div className='min-h-0 flex-1'>
          {children.length === 0 ? (
            <div className='flex h-full flex-col items-center justify-center text-center'>
              <svg width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#CBD5E1' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='5' r='2' /><circle cx='5' cy='19' r='2' /><circle cx='19' cy='19' r='2' />
                <line x1='12' y1='7' x2='5' y2='17' /><line x1='12' y1='7' x2='19' y2='17' />
              </svg>
              <p className='mt-3 text-sm text-gray-400'>No related objects for {rootLabel}.</p>
            </div>
          ) : (
            <ReactFlowProvider>
              {/* Read-only diagram — the connection handles are only a visual anchor point, not interactive */}
              <style>{'.react-flow__handle { opacity: 0; }'}</style>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={16} color='#E2E8F0' />
                <Controls showInteractive={false} />
              </ReactFlow>
            </ReactFlowProvider>
          )}
        </div>
      </div>
    </div>
  );
}
