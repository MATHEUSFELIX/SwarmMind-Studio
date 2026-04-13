import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import LLMSelector from '@/components/LLMSelector'

export default function BottomNav() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      {showSettings && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="absolute bottom-16 left-4 right-4 card p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              AI Provider
            </p>
            <LLMSelector />
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 flex items-center">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
              isActive ? 'text-brand-600' : 'text-gray-400'
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
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center -mt-4 shadow-md">
            <Plus size={18} className="text-white" />
          </div>
          New
        </NavLink>

        <button
          onClick={() => setShowSettings((v) => !v)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-xs text-gray-400"
        >
          <Settings size={20} />
          Provider
        </button>
      </nav>
    </>
  )
}
