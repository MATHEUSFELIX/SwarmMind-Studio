import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, Brain, BookOpen, Users, Shirt, Zap } from 'lucide-react'
import { useLLMStore } from '@/stores/llmStore'
import { getProvider } from '@/config/llm'
import LLMSelector from '@/components/LLMSelector'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Command Center' },
  { to: '/new', icon: Plus, label: 'New Simulation' },
]

export default function Sidebar() {
  const { selectedProvider } = useLLMStore()
  const provider = getProvider(selectedProvider)

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800 p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
          <Zap size={16} className="text-slate-950" />
        </div>
        <div>
          <p className="font-bold text-slate-100 text-sm leading-tight">SwarmMind</p>
          <p className="text-xs text-slate-500">Studio v1</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="my-4 border-t border-slate-800" />

      {/* Mode quick links */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
        Modes
      </p>
      <div className="flex flex-col gap-1">
        {[
          { label: 'Consulting', icon: Brain, mode: 'consulting' },
          { label: 'Social', icon: Users, mode: 'social' },
          { label: 'Research', icon: BookOpen, mode: 'research' },
          { label: 'Fashion', icon: Shirt, mode: 'fashion' },
        ].map(({ label, icon: Icon, mode }) => (
          <NavLink
            key={mode}
            to={`/new?mode=${mode}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all duration-150"
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* LLM Selector */}
      <div className="border-t border-slate-800 pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
          AI Provider
        </p>
        <LLMSelector />
        <p className="text-xs text-slate-600 px-1 mt-1.5">{provider.model}</p>
      </div>
    </aside>
  )
}
