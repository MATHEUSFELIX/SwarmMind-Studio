import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { Zap } from 'lucide-react'

interface Props {
  children: ReactNode
}

export default function AppShell({ children }: Props) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 flex items-center gap-2.5 px-4 py-3 bg-slate-950/95 backdrop-blur border-b border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap size={14} className="text-slate-950" />
          </div>
          <span className="font-bold text-sm text-slate-100">SwarmMind Studio</span>
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <BottomNav />
    </div>
  )
}
