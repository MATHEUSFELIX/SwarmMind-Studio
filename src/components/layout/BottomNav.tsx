import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import LLMSelector from '@/components/LLMSelector'

export default function BottomNav() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      {/* Settings drawer (mobile) */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="absolute bottom-16 left-4 right-4 card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              AI Provider
            </p>
            <LLMSelector />
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              isActive ? 'text-brand-400' : 'text-slate-500'
            }`
          }
        >
          <LayoutDashboard size={20} />
          Home
        </NavLink>

        <NavLink
          to="/new"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              isActive ? 'text-brand-400' : 'text-slate-500'
            }`
          }
        >
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center -mt-4">
            <Plus size={18} className="text-slate-950" />
          </div>
          New
        </NavLink>

        <button
          onClick={() => setShowSettings((v) => !v)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-xs text-slate-500"
        >
          <Settings size={20} />
          Provider
        </button>
      </nav>
    </>
  )
}
