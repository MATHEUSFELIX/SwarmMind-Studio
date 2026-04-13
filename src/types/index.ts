export type LLMProvider = 'openai' | 'gemini' | 'anthropic' | 'ollama'
export type SimulationMode = 'consulting' | 'social' | 'research' | 'fashion'
export type SimulationStatus = 'idle' | 'running' | 'completed' | 'error'

export interface LLMProviderConfig {
  id: LLMProvider
  name: string
  model: string
  apiKey: string
  baseUrl: string
  isLocal: boolean
  color: string
  icon: string
}

export interface AgentPersona {
  id: string
  name: string
  role: string
  description: string
  systemPrompt: string
  color: string
  bgColor: string
  emoji: string
  sentimentBias: number // -1 (negative) to 1 (positive)
}

export interface AgentMessage {
  agentId: string
  agentName: string
  agentRole: string
  agentColor: string
  agentBgColor: string
  agentEmoji: string
  content: string
  isStreaming: boolean
  timestamp: number
  sentiment: number
}

export type FashionGoal = 'evaluate' | 'discover_license' | 'discover_own'

export interface FashionConfig {
  goal: FashionGoal
  // Evaluate mode
  collectionName: string
  collectionType: 'own' | 'licensed'
  licensedBrand?: string
  styleNotes: string
  // Discovery mode
  decliningItem?: string      // "Sonic", "Coleção floral verão 25"
  decliningReason?: string    // optional context on why it's declining
  // Shared
  retailer: string
  targetAge: string           // free text
  targetGender: string
  season: string
  priceRange: string
}

export interface SimulationConfig {
  id: string
  name: string
  mode: SimulationMode
  scenario: string
  agents: AgentPersona[]
  platform?: string
  fashionConfig?: FashionConfig
}

export interface SimulationMetrics {
  consensusLevel: number
  overallSentiment: number
  positiveCount: number
  neutralCount: number
  negativeCount: number
  keyInsights: string[]
  // Fashion-specific (optional)
  trendScore?: number
  sellThroughPrediction?: number
  licensingFitScore?: number
  viralityPotential?: 'Low' | 'Medium' | 'High'
  sustainabilityRisk?: 'Low' | 'Medium' | 'High'
}

export interface Simulation extends SimulationConfig {
  status: SimulationStatus
  messages: AgentMessage[]
  metrics?: SimulationMetrics
  createdAt: number
  completedAt?: number
}
