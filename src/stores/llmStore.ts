import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LLMProvider } from '@/types'
import { DEFAULT_PROVIDER } from '@/config/llm'

interface LLMStore {
  selectedProvider: LLMProvider
  setProvider: (provider: LLMProvider) => void
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set) => ({
      selectedProvider: DEFAULT_PROVIDER,
      setProvider: (provider) => set({ selectedProvider: provider }),
    }),
    { name: 'swarmmind-llm-provider' },
  ),
)
