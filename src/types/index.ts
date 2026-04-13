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

// ─── Fashion ──────────────────────────────────────────────────────────────────
export type FashionGoal = 'evaluate' | 'discover_license' | 'discover_own'

export interface FashionConfig {
  goal: FashionGoal
  collectionName: string
  collectionType: 'own' | 'licensed'
  licensedBrand?: string
  styleNotes: string
  decliningItem?: string
  decliningReason?: string
  retailer: string
  targetAge: string
  targetGender: string
  season: string
  priceRange: string
}

// ─── Consulting ───────────────────────────────────────────────────────────────
export type ConsultingGoal = 'debate' | 'decide'

export interface ConsultingConfig {
  goal: ConsultingGoal
  company: string
  industry: string
  problem: string
  constraints: string
  optionA?: string
  optionB?: string
  optionC?: string
}

// ─── Social ───────────────────────────────────────────────────────────────────
export type SocialGoal = 'launch' | 'crisis'
export type CampaignObjective = 'awareness' | 'engagement' | 'conversion'

export interface SocialConfig {
  goal: SocialGoal
  content: string
  platform: string
  targetDemo: string
  campaignObjective: CampaignObjective
}

// ─── Research ─────────────────────────────────────────────────────────────────
export type ResearchGoal = 'synthesize' | 'validate'
export type ResearchAudience = 'academic' | 'executive' | 'public'

export interface ResearchConfig {
  goal: ResearchGoal
  question: string
  domain: string
  audience: ResearchAudience
  hypothesis?: string
  dataContext: string
}

// ─── Simulation ───────────────────────────────────────────────────────────────
export interface SimulationConfig {
  id: string
  name: string
  mode: SimulationMode
  scenario: string
  agents: AgentPersona[]
  platform?: string
  fashionConfig?: FashionConfig
  consultingConfig?: ConsultingConfig
  socialConfig?: SocialConfig
  researchConfig?: ResearchConfig
}

export interface SimulationMetrics {
  consensusLevel: number
  overallSentiment: number
  positiveCount: number
  neutralCount: number
  negativeCount: number
  keyInsights: string[]
  // Fashion-specific
  trendScore?: number
  sellThroughPrediction?: number
  licensingFitScore?: number
  viralityPotential?: 'Low' | 'Medium' | 'High'
  sustainabilityRisk?: 'Low' | 'Medium' | 'High'
  // Consulting-specific
  riskLevel?: 'Low' | 'Medium' | 'High'
  implementationComplexity?: 'Low' | 'Medium' | 'High'
  decisionScore?: number
  // Social-specific
  viralityScore?: number
  controversyIndex?: number
  platformFit?: 'Low' | 'Medium' | 'High'
  // Research-specific
  evidenceStrength?: number
  practicalApplicability?: 'Low' | 'Medium' | 'High'
  researchGapScore?: number
}

export interface Simulation extends SimulationConfig {
  status: SimulationStatus
  messages: AgentMessage[]
  metrics?: SimulationMetrics
  createdAt: number
  completedAt?: number
}
