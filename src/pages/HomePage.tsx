import { Link } from 'react-router-dom'
import { Plus, Brain, Users, BookOpen, Shirt, Zap, Clock, CheckCircle, Loader2, Circle, GitCompare, Trash2 } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import MetricCard from '@/components/MetricCard'
import type { Simulation } from '@/types'

const MODE_CONFIG = {
  consulting: { icon: Brain,    label: 'Consulting', color: 'text-blue-600',    bg: 'bg-blue-50'    },
  social:     { icon: Users,    label: 'Social',     color: 'text-pink-600',    bg: 'bg-pink-50'    },
  research:   { icon: BookOpen, label: 'Research',   color: 'text-purple-600',  bg: 'bg-purple-50'  },
  fashion:    { icon: Shirt,    label: 'Fashion',    color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
}

const STATUS_CONFIG = {
  completed: { icon: CheckCircle, label: 'Completed', cls: 'badge-green'  },
  running:   { icon: Loader2,     label: 'Running',   cls: 'badge-amber'  },
  idle:      { icon: Circle,      label: 'Idle',      cls: 'badge-slate'  },
  error:     { icon: Circle,      label: 'Error',     cls: 'badge-red'    },
}

function SimCard({ sim }: { sim: Simulation }) {
  const mode       = MODE_CONFIG[sim.mode]
  const ModeIcon   = mode.icon
  const status     = STATUS_CONFIG[sim.status]
  const StatusIcon = status.icon
  const { deleteSimulation } = useSimulationStore()

  return (
    <div className="card-hover p-4 flex items-center gap-3 group relative">
      <Link to={`/simulation/${sim.id}`} className="absolute inset-0" />

      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mode.bg}`}>
        <ModeIcon size={18} className={mode.color} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">{sim.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400 truncate">{sim.scenario.slice(0, 55)}…</p>
          {sim.rounds > 1 && <span className="text-xs text-gray-300 flex-shrink-0">{sim.rounds}R</span>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 relative z-10">
        <span className={`badge ${status.cls}`}>
          <StatusIcon size={10} className={sim.status === 'running' ? 'animate-spin' : ''} />
          {status.label}
        </span>
        <div className="flex items-center gap-1.5">
          {sim.linkedSimId && (
            <Link to={`/compare/${sim.id}/${sim.linkedSimId}`} className="text-blue-400 hover:text-blue-600 transition-colors" title="View A/B comparison">
              <GitCompare size={13} />
            </Link>
          )}
          <span className="text-xs text-gray-400">{sim.messages.length} msgs</span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteSimulation(sim.id) }}
            className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}


export default function HomePage() {
  const { simulations } = useSimulationStore()

  const total     = simulations.length
  const completed = simulations.filter((s) => s.status === 'completed').length
  const running   = simulations.filter((s) => s.status === 'running').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="text-gray-400 text-sm mt-1">Multi-agent swarm intelligence platform</p>
        </div>
        <Link to="/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Simulation
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total"     value={total}     sub="all simulations"  icon="🧠" accent="amber"  />
        <MetricCard label="Completed" value={completed} sub="finished runs"    icon="✓"  accent="green"  />
        <MetricCard label="Running"   value={running}   sub="active now"       icon="⚡" accent="blue"   />
        <MetricCard label="Agents"    value={simulations.reduce((a, s) => a + s.agents.length, 0)} sub="total configured" icon="🤖" accent="purple" />
      </div>

      {/* Quick Start */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Start</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { mode: 'consulting', title: 'Consulting',  desc: 'Strategic debate',        icon: Brain,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',    hover: 'hover:border-blue-200'    },
            { mode: 'social',     title: 'Social',      desc: 'Opinion & sentiment',     icon: Users,    color: 'text-pink-600',    bg: 'bg-pink-50',    border: 'border-pink-100',    hover: 'hover:border-pink-200'    },
            { mode: 'research',   title: 'Research',    desc: 'Synthesis & patterns',    icon: BookOpen, color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-100',  hover: 'hover:border-purple-200'  },
            { mode: 'fashion',    title: 'Fashion',     desc: 'Collection intelligence', icon: Shirt,    color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-100', hover: 'hover:border-fuchsia-200' },
          ].map(({ mode, title, desc, icon: Icon, color, bg, border, hover }) => (
            <Link key={mode} to={`/new?mode=${mode}`} className={`bg-white border ${border} ${hover} rounded-xl p-4 transition-all duration-200 hover:shadow-md group`}>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className={`font-semibold text-sm ${color}`}>{title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Simulations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Simulations</p>
          <div className="flex items-center gap-3">
            {completed >= 2 && (() => {
              const comp = simulations.filter((s) => s.status === 'completed')
              return (
                <Link to={`/compare/${comp[0].id}/${comp[1].id}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-500 transition-colors">
                  <GitCompare size={12} />Compare
                </Link>
              )
            })()}
            <Clock size={12} className="text-gray-300" />
          </div>
        </div>

        {simulations.length === 0 ? (
          <div className="card p-12 flex flex-col items-center justify-center text-center">
            <Zap size={32} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No simulations yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first simulation to get started</p>
            <Link to="/new" className="btn-primary mt-4">Start a Simulation</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {simulations.slice(0, 15).map((sim) => <SimCard key={sim.id} sim={sim} />)}
          </div>
        )}
      </div>
    </div>
  )
}
