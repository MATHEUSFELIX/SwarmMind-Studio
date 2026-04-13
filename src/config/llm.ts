import type { LLMProvider, LLMProviderConfig } from '@/types'

export const LLM_PROVIDERS: LLMProviderConfig[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    model: import.meta.env.VITE_OLLAMA_MODEL || 'gemma3:4b',
    apiKey: import.meta.env.VITE_OLLAMA_API_KEY || '',
    baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
    isLocal: !import.meta.env.VITE_OLLAMA_API_KEY,
    color: '#7c3aed',
    icon: '🦙',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    isLocal: false,
    color: '#10a37f',
    icon: '✦',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    isLocal: false,
    color: '#4285f4',
    icon: '♊',
  },
  {
    id: 'anthropic',
    name: 'Claude',
    model: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-5',
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    baseUrl:
      import.meta.env.VITE_ANTHROPIC_USE_PROXY === '1'
        ? '/__proxy/anthropic'
        : 'https://api.anthropic.com',
    isLocal: false,
    color: '#d97706',
    icon: '◆',
  },
]

export const DEFAULT_PROVIDER: LLMProvider =
  (import.meta.env.VITE_LLM_PROVIDER as LLMProvider) || 'ollama'

export function getProvider(id: LLMProvider): LLMProviderConfig {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0]
}
