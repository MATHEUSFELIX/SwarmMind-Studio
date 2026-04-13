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
  sentimentBias: number
}

export interface AgentScore {
  value: number           // 1–10
  confidence: 'low' | 'medium' | 'high'
  keyPoint: string
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
  round: number           // which debate round this belongs to
  score?: AgentScore      // extracted from final-round structured output
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

// ─── Simulation config ────────────────────────────────────────────────────────
export interface SimulationConfig {
  id: string
  name: string
  mode: SimulationMode
  scenario: string
  agents: AgentPersona[]
  platform?: string
  rounds: number                    // 1 | 2 | 3
  enableAdvocatus: boolean
  comparisonProvider?: LLMProvider  // if set, a mirror sim runs with this provider
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
  consensusEvolution?: number[]     // consensusLevel per round
  // Fashion
  trendScore?: number
  sellThroughPrediction?: number
  licensingFitScore?: number
  viralityPotential?: 'Low' | 'Medium' | 'High'
  sustainabilityRisk?: 'Low' | 'Medium' | 'High'
  // Consulting
  riskLevel?: 'Low' | 'Medium' | 'High'
  implementationComplexity?: 'Low' | 'Medium' | 'High'
  decisionScore?: number
  // Social
  viralityScore?: number
  controversyIndex?: number
  platformFit?: 'Low' | 'Medium' | 'High'
  // Research
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
  currentRound: number
  injectedContexts: string[]        // mid-sim context injections
  linkedSimId?: string              // A/B pair reference
}
