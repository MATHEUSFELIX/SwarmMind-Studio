import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useLLMStore } from '@/stores/llmStore'
import { LLM_PROVIDERS, getProvider } from '@/config/llm'
import type { LLMProvider } from '@/types'

export default function LLMSelector() {
  const { selectedProvider, setProvider } = useLLMStore()
  const provider = getProvider(selectedProvider)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(id: LLMProvider) {
    setProvider(id)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all text-sm"
      >
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: provider.color + '30', color: provider.color }}
        >
          {provider.icon}
        </span>
        <span className="flex-1 text-left text-slate-200 font-medium">{provider.name}</span>
        <ChevronDown
          size={14}
          className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 card shadow-xl z-50 overflow-hidden">
          {LLM_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => select(p.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-800 transition-colors"
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                style={{ backgroundColor: p.color + '30', color: p.color }}
              >
                {p.icon}
              </span>
              <div className="flex-1 text-left">
                <p className="text-slate-200 font-medium leading-tight">{p.name}</p>
                <p className="text-slate-500 text-xs font-mono leading-tight truncate">
                  {p.model}
                </p>
              </div>
              {p.id === selectedProvider && (
                <Check size={14} className="text-brand-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
