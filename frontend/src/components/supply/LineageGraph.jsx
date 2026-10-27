import { useEffect, useMemo, useRef } from 'react';

/**
 * AISecGuard — Lineage graph
 * Draws the supply chain around one artifact, left (upstream) to right (downstream).
 * Nodes are coloured by their latest risk level; the root artifact is highlighted.
 */

const NODE_W = 188;
const NODE_H = 58;
const COL_GAP = 92;
const ROW_GAP = 22;
const PAD = 16;

const RISK_COLOR = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

const RELATION_LABEL = {
  DERIVED_FROM: 'derived from',
  TRAINED_ON: 'trained on',
  FINE_TUNED_FROM: 'fine-tuned from',
  DEPENDS_ON: 'depends on',
};

/** Column index per node: root = 0, parents to the left, children to the right. */
function layerNodes(graph) {
  const level = new Map([[graph.root_id, 0]]);
  const queue = [graph.root_id];
  while (queue.length) {
    const current = queue.shift();
    for (const e of graph.edges) {
      if (e.child_id === current && !level.has(e.parent_id)) {
        level.set(e.parent_id, level.get(current) - 1);
        queue.push(e.parent_id);
      }
      if (e.parent_id === current && !level.has(e.child_id)) {
        level.set(e.child_id, level.get(current) + 1);
        queue.push(e.child_id);
      }
    }
  }
  return level;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Positions every node in its column; null when there is nothing to draw. */
function computeLayout(graph) {
  if (!graph || graph.nodes.length <= 1) return null;
  const level = layerNodes(graph);
  const minLevel = Math.min(...level.values());
  const columns = new Map();
  for (const node of graph.nodes) {
    const col = (level.get(node.id) ?? 0) - minLevel;
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col).push(node);
  }
  const maxRows = Math.max(...[...columns.values()].map((c) => c.length));
  const height = PAD * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP;
  const width = PAD * 2 + columns.size * NODE_W + (columns.size - 1) * COL_GAP;

  const pos = new Map();
  for (const [col, nodes] of columns) {
    const colHeight = nodes.length * NODE_H + (nodes.length - 1) * ROW_GAP;
    const y0 = (height - colHeight) / 2;
    nodes.forEach((node, i) => {
      pos.set(node.id, { x: PAD + col * (NODE_W + COL_GAP), y: y0 + i * (NODE_H + ROW_GAP) });
    });
  }
  return { pos, width, height };
}

export default function LineageGraph({ graph, onSelect }) {
  const scroller = useRef(null);
  const layout = useMemo(() => computeLayout(graph), [graph]);

  // Wide graphs scroll sideways: start with the root artifact in view.
  useEffect(() => {
    const el = scroller.current;
    const root = layout?.pos.get(graph.root_id);
    if (el && root) el.scrollLeft = Math.max(0, root.x + NODE_W / 2 - el.clientWidth / 2);
  }, [layout, graph]);

  if (!layout) {
    return (
      <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
        No lineage recorded yet. Link the datasets, base models or dependency files this artifact was built from.
      </p>
    );
  }
  const { pos, width, height } = layout;

  return (
    <div ref={scroller} style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label="Lineage graph"
        style={{ display: 'block', maxWidth: 'none' }}
      >
        <defs>
          <marker id="lineage-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#64748b" />
          </marker>
        </defs>

        {graph.edges.map((e) => {
          const a = pos.get(e.parent_id);
          const b = pos.get(e.child_id);
          if (!a || !b) return null;
          const x1 = a.x + NODE_W;
          const y1 = a.y + NODE_H / 2;
          const x2 = b.x - 2;
          const y2 = b.y + NODE_H / 2;
          const mid = (x1 + x2) / 2;
          return (
            <g key={e.id}>
              <path
                d={`M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke="#64748b"
                strokeWidth="1.4"
                markerEnd="url(#lineage-arrow)"
              />
              <text x={mid} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">
                {RELATION_LABEL[e.relation] || e.relation}
              </text>
            </g>
          );
        })}

        {graph.nodes.map((node) => {
          const p = pos.get(node.id);
          const isRoot = node.id === graph.root_id;
          const color = node.status === 'QUARANTINED' ? '#ef4444' : RISK_COLOR[node.risk_level] || '#475569';
          return (
            <g
              key={node.id}
              transform={`translate(${p.x} ${p.y})`}
              onClick={() => onSelect?.(node)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <title>{`${node.name}\n${node.artifact_type} · ${node.status}\nRisk: ${node.risk_level || 'not scanned'}${node.signed ? '\nSigned' : ''}`}</title>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx="10"
                fill={isRoot ? 'rgba(59,130,246,0.14)' : 'rgba(15,23,42,0.9)'}
                stroke={isRoot ? '#3b82f6' : '#334155'}
                strokeWidth={isRoot ? 2 : 1}
              />
              <rect x="0" y="0" width="5" height={NODE_H} rx="2" fill={color} />
              <text x="16" y="23" fontSize="12.5" fontWeight="600" fill="#f1f5f9">
                {truncate(node.name, 24)}
              </text>
              <text x="16" y="42" fontSize="11" fill="#94a3b8">
                {node.artifact_type} · {node.status === 'QUARANTINED' ? 'QUARANTINED' : node.risk_level || 'not scanned'}
                {node.signed ? ' · signed' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
