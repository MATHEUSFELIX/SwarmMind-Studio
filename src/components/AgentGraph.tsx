import type { AgentRelation } from '@/types'

interface AgentNode {
  id: string
  name: string
  emoji: string
  color: string // tailwind text color class
}

interface GraphEdge {
  sourceId: string
  targetId: string
  type: AgentRelation['type']
  round: number
}

interface AgentGraphProps {
  agents: AgentNode[]
  edges: GraphEdge[]
}

const EDGE_COLORS: Record<AgentRelation['type'], string> = {
  AGREE:     '#22c55e', // green
  CHALLENGE: '#ef4444', // red
  NEUTRAL:   '#94a3b8', // slate
  BUILDS_ON: '#6366f1', // indigo
}

const EDGE_LABELS: Record<AgentRelation['type'], string> = {
  AGREE:     'agrees',
  CHALLENGE: 'challenges',
  NEUTRAL:   'neutral',
  BUILDS_ON: 'builds on',
}

export default function AgentGraph({ agents, edges }: AgentGraphProps) {
  if (agents.length === 0) return null

  const W = 480
  const H = 360
  const cx = W / 2
  const cy = H / 2
  const r  = Math.min(cx, cy) - 64

  // Radial positions
  const positions = agents.map((_, i) => ({
    x: cx + r * Math.cos((2 * Math.PI * i / agents.length) - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i / agents.length) - Math.PI / 2),
  }))
  const posMap = Object.fromEntries(agents.map((a, i) => [a.id, positions[i]]))

  // Deduplicate edges by source+target+type (keep highest round)
  const edgeKey = (e: GraphEdge) => `${e.sourceId}→${e.targetId}:${e.type}`
  const bestEdge = new Map<string, GraphEdge>()
  for (const e of edges) {
    const k = edgeKey(e)
    if (!bestEdge.has(k) || e.round > bestEdge.get(k)!.round) bestEdge.set(k, e)
  }
  const uniqueEdges = [...bestEdge.values()]

  // Count edge occurrences per source+target pair (for offset)
  function getOffset(e: GraphEdge, idx: number): number {
    const sameDir = uniqueEdges.filter(
      (o, i) => i < idx && o.sourceId === e.sourceId && o.targetId === e.targetId,
    )
    return sameDir.length * 18
  }

  const NODE_R = 26

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg mx-auto" style={{ minHeight: 280 }}>
        <defs>
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              viewBox="0 0 10 10" refX="10" refY="5"
              markerWidth="6" markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
            </marker>
          ))}
        </defs>

        {/* Edges */}
        {uniqueEdges.map((e, idx) => {
          const src = posMap[e.sourceId]
          const tgt = posMap[e.targetId]
          if (!src || !tgt) return null
          const color = EDGE_COLORS[e.type]
          const offset = getOffset(e, idx)

          // Curved path
          const dx = tgt.x - src.x
          const dy = tgt.y - src.y
          const len = Math.sqrt(dx * dx + dy * dy)
          const nx = -dy / len  // normal x
          const ny = dx / len   // normal y
          const curve = 30 + offset

          // Move endpoints to edge of nodes
          const ratio = NODE_R / len
          const sx = src.x + dx * ratio
          const sy = src.y + dy * ratio
          const ex = tgt.x - dx * ratio
          const ey = tgt.y - dy * ratio

          const mx = (sx + ex) / 2 + nx * curve
          const my = (sy + ey) / 2 + ny * curve

          const path = `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`

          return (
            <g key={`${e.sourceId}-${e.targetId}-${e.type}`}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.7}
                markerEnd={`url(#arrow-${e.type})`}
              />
              <text
                x={mx} y={my - 6}
                textAnchor="middle"
                fontSize={8}
                fill={color}
                opacity={0.8}
              >{EDGE_LABELS[e.type]}</text>
            </g>
          )
        })}

        {/* Nodes */}
        {agents.map((agent, i) => {
          const { x, y } = positions[i]
          return (
            <g key={agent.id}>
              <circle cx={x} cy={y} r={NODE_R} fill="white" stroke="#e5e7eb" strokeWidth={1.5} />
              <text x={x} y={y + 5} textAnchor="middle" fontSize={18} dominantBaseline="middle">
                {agent.emoji}
              </text>
              <text
                x={x} y={y + NODE_R + 12}
                textAnchor="middle" fontSize={9} fill="#6b7280"
              >
                {agent.name.replace(/^The /, '')}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2">
        {(Object.entries(EDGE_COLORS) as [AgentRelation['type'], string][]).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-400 capitalize">{EDGE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
