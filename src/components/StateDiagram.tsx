import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TuringMachineConfig, Transition } from '../types/tm';
import { Move, RotateCcw } from 'lucide-react';

interface StateDiagramProps {
  config: TuringMachineConfig;
  currentState: string;
  activeTransition: Transition | null;
}

export const StateDiagram: React.FC<StateDiagramProps> = ({
  config,
  currentState,
  activeTransition
}) => {
  const { id: configId, states, transitions, initialState, acceptStates, rejectStates } = config;
  const svgRef = useRef<SVGSVGElement>(null);

  const nodeRadius = 21;

  // Compute default layout coordinates with comfortable vertical margins
  const defaultPositions = useMemo(() => {
    const width = 680;
    const height = 360;
    const map: Record<string, { x: number; y: number }> = {};

    if (configId === 'an_bn_cn') {
      const predefined: Record<string, { x: number; y: number }> = {
        q0: { x: 85, y: 140 },
        q1: { x: 220, y: 95 },
        q2: { x: 370, y: 95 },
        q3: { x: 520, y: 95 },
        q4: { x: 250, y: 260 },
        Q_a: { x: 440, y: 260 },
        q_accept: { x: 440, y: 260 },
        Q_r: { x: 85, y: 260 },
        q_reject: { x: 85, y: 260 }
      };
      states.forEach(s => {
        if (predefined[s]) map[s] = predefined[s];
      });
    } else if (configId === '0n_1n') {
      const predefined: Record<string, { x: number; y: number }> = {
        q0: { x: 90, y: 130 },
        q1: { x: 250, y: 95 },
        q2: { x: 420, y: 95 },
        q3: { x: 250, y: 260 },
        q4: { x: 400, y: 260 },
        Q_a: { x: 520, y: 260 },
        q_accept: { x: 520, y: 260 }
      };
      states.forEach(s => {
        if (predefined[s]) map[s] = predefined[s];
      });
    } else if (configId === 'palindrome_binary') {
      const predefined: Record<string, { x: number; y: number }> = {
        q0: { x: 85, y: 170 },
        q_have0: { x: 220, y: 95 },
        q_match0: { x: 380, y: 95 },
        q_have1: { x: 220, y: 255 },
        q_match1: { x: 380, y: 255 },
        q_rewind: { x: 530, y: 170 },
        Q_a: { x: 85, y: 280 },
        q_accept: { x: 85, y: 280 }
      };
      states.forEach(s => {
        if (predefined[s]) map[s] = predefined[s];
      });
    }

    // Fallback: layered/circular arrangement for other or custom states
    states.forEach(s => {
      if (!map[s]) {
        const count = states.length;
        const radius = Math.min(width, height) * 0.35;
        const centerX = width / 2;
        const centerY = height / 2 + 10;
        let angle: number;
        if (s === initialState) {
          angle = Math.PI;
        } else {
          const offsetIdx = states.filter(st => st !== initialState).indexOf(s);
          const totalOther = count - 1;
          angle = Math.PI + ((offsetIdx + 1) * (2 * Math.PI)) / (totalOther + 1);
        }
        const x = count <= 2 ? (s === initialState ? 180 : 460) : centerX + radius * Math.cos(angle);
        const y = count <= 2 ? centerY : centerY + radius * Math.sin(angle);
        map[s] = { x, y };
      }
    });

    return map;
  }, [configId, states, initialState]);

  // Dynamic user-movable node positions
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(defaultPositions);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  // Sync when machine preset changes
  useEffect(() => {
    setNodePositions(defaultPositions);
  }, [defaultPositions]);

  // Convert mouse event coordinates to exact SVG viewBox coordinates
  const getSVGPoint = (e: React.MouseEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode) return;
    const pt = getSVGPoint(e);
    if (!pt) return;

    // Constrain within viewBox boundaries (with margin for radius)
    const clampedX = Math.max(30, Math.min(650, pt.x));
    const clampedY = Math.max(30, Math.min(340, pt.y));

    setNodePositions(prev => ({
      ...prev,
      [draggingNode]: { x: clampedX, y: clampedY }
    }));
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  // Group transitions by pair (from -> to)
  const groupedEdges = useMemo(() => {
    const map = new Map<string, Transition[]>();
    transitions.forEach((t) => {
      const key = `${t.fromState}___${t.toState}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).map(([key, transList]) => {
      const [from, to] = key.split('___');
      return { from, to, transList };
    });
  }, [transitions]);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
            State Transition Graph
          </h3>
          <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-sans">
            <Move className="w-3 h-3 text-zinc-400" />
            Drag nodes to rearrange
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-600 bg-blue-100" /> Current
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-600" /> Accept (Q_a)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-500" /> Reject (Q_r)
          </span>
          <button
            onClick={() => setNodePositions(defaultPositions)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-zinc-200 hover:bg-zinc-100 text-zinc-600 text-[10px] transition-colors ml-1"
            title="Reset to default arrangement"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset Layout</span>
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 w-full min-h-[360px] bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden flex items-center justify-center select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 680 360"
          className="w-full h-full cursor-default"
        >
          <defs>
            <marker
              id="clean-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 1.5 L 7 4 L 0 6.5 z" fill="#64748b" />
            </marker>

            <marker
              id="clean-arrow-active"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 1.5 L 7 4 L 0 6.5 z" fill="#2563eb" />
            </marker>

            <marker
              id="start-arrow"
              viewBox="0 0 8 8"
              refX="6"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 1.5 L 7 4 L 0 6.5 z" fill="#0f172a" />
            </marker>
          </defs>

          {/* Initial State Incoming Arrow */}
          {nodePositions[initialState] && (
            <g>
              <line
                x1={nodePositions[initialState].x - 45}
                y1={nodePositions[initialState].y}
                x2={nodePositions[initialState].x - nodeRadius - 1}
                y2={nodePositions[initialState].y}
                stroke="#0f172a"
                strokeWidth="1.75"
                markerEnd="url(#start-arrow)"
              />
              <text
                x={nodePositions[initialState].x - 50}
                y={nodePositions[initialState].y + 3.5}
                fill="#475569"
                fontSize="10"
                fontFamily="sans-serif"
                fontWeight="500"
                textAnchor="end"
              >
                start
              </text>
            </g>
          )}

          {/* Draw Edges */}
          {groupedEdges.map(({ from, to, transList }) => {
            const n1 = nodePositions[from];
            const n2 = nodePositions[to];
            if (!n1 || !n2) return null;

            const isSelfLoop = from === to;
            const hasActive = transList.some(
              t => activeTransition && activeTransition.id === t.id
            );

            // Full rules - No truncation!
            const ruleStrings = transList.map(t => `${t.readSymbol}→${t.writeSymbol},${t.direction}`);

            if (isSelfLoop) {
              const loopTop = n1.y - 44;
              const pathD = `M ${n1.x - 10} ${n1.y - nodeRadius + 2} C ${n1.x - 28} ${loopTop}, ${n1.x + 28} ${loopTop}, ${n1.x + 10} ${n1.y - nodeRadius + 2}`;

              // Multi-row formatting if more than 2 rules
              const isMultiRow = ruleStrings.length > 2;
              const rows = isMultiRow
                ? [
                    ruleStrings.slice(0, Math.ceil(ruleStrings.length / 2)).join(' | '),
                    ruleStrings.slice(Math.ceil(ruleStrings.length / 2)).join(' | ')
                  ]
                : [ruleStrings.join(' | ')];

              const maxChars = Math.max(...rows.map(r => r.length));
              const boxW = maxChars * 5.6 + 10;
              const boxH = rows.length * 13 + 4;
              const boxY = Math.max(4, loopTop - boxH - 2);

              return (
                <g key={`loop_${from}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={hasActive ? '#2563eb' : '#94a3b8'}
                    strokeWidth={hasActive ? 2.5 : 1.5}
                    markerEnd={hasActive ? 'url(#clean-arrow-active)' : 'url(#clean-arrow)'}
                  />
                  <rect
                    x={n1.x - boxW / 2}
                    y={boxY}
                    width={boxW}
                    height={boxH}
                    rx="3"
                    fill="#ffffff"
                    stroke={hasActive ? '#2563eb' : '#cbd5e1'}
                    strokeWidth="1"
                  />
                  <text
                    x={n1.x}
                    y={boxY + 11}
                    fill={hasActive ? '#1d4ed8' : '#334155'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {rows.map((row, rIdx) => (
                      <tspan key={rIdx} x={n1.x} dy={rIdx === 0 ? 0 : 12}>
                        {row}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            }

            // Directed curve between two distinct states
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return null;

            const isBackward = n2.x < n1.x - 30;

            let curvature = 24;
            let nx = -dy / dist;
            let ny = dx / dist;

            if (isBackward) {
              curvature = Math.min(85, dist * 0.28);
              nx = 0;
              ny = 1;
            }

            const cx = (n1.x + n2.x) / 2 + nx * curvature;
            const cy = (n1.y + n2.y) / 2 + ny * curvature;

            const startAngle = Math.atan2(cy - n1.y, cx - n1.x);
            const sx = n1.x + nodeRadius * Math.cos(startAngle);
            const sy = n1.y + nodeRadius * Math.sin(startAngle);

            const endAngle = Math.atan2(n2.y - cy, n2.x - cx);
            const ex = n2.x - (nodeRadius + 1) * Math.cos(endAngle);
            const ey = n2.y - (nodeRadius + 1) * Math.sin(endAngle);

            const lx = 0.25 * sx + 0.5 * cx + 0.25 * ex;
            const ly = 0.25 * sy + 0.5 * cy + 0.25 * ey;

            const fullLabel = ruleStrings.join(' | ');
            const boxW = fullLabel.length * 5.6 + 10;

            return (
              <g key={`edge_${from}_${to}`}>
                <path
                  d={`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`}
                  fill="none"
                  stroke={hasActive ? '#2563eb' : '#94a3b8'}
                  strokeWidth={hasActive ? 2.5 : 1.5}
                  markerEnd={hasActive ? 'url(#clean-arrow-active)' : 'url(#clean-arrow)'}
                />
                <rect
                  x={lx - boxW / 2}
                  y={ly - 7.5}
                  width={boxW}
                  height="16"
                  rx="3"
                  fill="#ffffff"
                  stroke={hasActive ? '#2563eb' : '#cbd5e1'}
                  strokeWidth="1"
                />
                <text
                  x={lx}
                  y={ly + 3.5}
                  fill={hasActive ? '#1d4ed8' : '#334155'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {fullLabel}
                </text>
              </g>
            );
          })}

          {/* Draw State Nodes (Draggable!) */}
          {states.map((stateId) => {
            const pos = nodePositions[stateId];
            if (!pos) return null;

            const isCurrent = stateId === currentState;
            const isAccept = acceptStates.includes(stateId);
            const isReject = rejectStates.includes(stateId);
            const isDragging = draggingNode === stateId;

            // Display text: if legacy q_accept or q_reject, display Q_a or Q_r
            const displayText = stateId === 'q_accept' ? 'Q_a' : stateId === 'q_reject' ? 'Q_r' : stateId;

            return (
              <g
                key={stateId}
                onMouseDown={(e) => handleMouseDown(stateId, e)}
                className="cursor-grab active:cursor-grabbing transition-transform"
                style={{ touchAction: 'none' }}
              >
                {/* Accept State Outer Ring */}
                {isAccept && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeRadius + 4}
                    fill="none"
                    stroke={isCurrent ? '#16a34a' : '#22c55e'}
                    strokeWidth="1.5"
                  />
                )}

                {/* Main Node Circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeRadius}
                  fill={
                    isCurrent
                      ? '#dbeafe'
                      : isAccept
                      ? '#ecfdf5'
                      : isReject
                      ? '#fef2f2'
                      : isDragging
                      ? '#f1f5f9'
                      : '#ffffff'
                  }
                  stroke={
                    isCurrent
                      ? '#2563eb'
                      : isAccept
                      ? '#16a34a'
                      : isReject
                      ? '#dc2626'
                      : '#64748b'
                  }
                  strokeWidth={isCurrent ? 2.5 : 1.5}
                  className="transition-colors duration-100"
                />

                {/* State Label */}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  fill={isCurrent ? '#1e40af' : '#0f172a'}
                  fontSize={displayText.length > 4 ? '9' : '11'}
                  fontFamily="monospace"
                  fontWeight="600"
                  textAnchor="middle"
                  className="pointer-events-none select-none"
                >
                  {displayText}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
