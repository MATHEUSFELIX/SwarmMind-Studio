import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LLMProvider } from '@/types'
import { DEFAULT_PROVIDER } from '@/config/llm'

interface LLMStore {
  selectedProvider: LLMProvider
  comparisonProvider: LLMProvider | null
  setProvider: (provider: LLMProvider) => void
  setComparisonProvider: (provider: LLMProvider | null) => void
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set) => ({
      selectedProvider: DEFAULT_PROVIDER,
      comparisonProvider: null,
      setProvider: (provider) => set({ selectedProvider: provider }),
      setComparisonProvider: (provider) => set({ comparisonProvider: provider }),
    }),
    { name: 'swarmmind-llm-provider' },
  ),
)
