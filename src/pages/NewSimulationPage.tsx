import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Brain, Users, BookOpen, Shirt, ChevronRight,
  TrendingDown, Search, Star, Scale, Megaphone,
  AlertCircle, FlaskConical, Lightbulb, LayoutTemplate,
  X, Plus, Minus, GitCompare, Repeat, Sparkles, Loader2,
} from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useLLMStore } from '@/stores/llmStore'
import { LLM_PROVIDERS as PROVIDERS, getProvider } from '@/config/llm'
import { PERSONAS_BY_MODE, ADVOCATUS_DIABOLI } from '@/data/personas'
import { TEMPLATES_BY_MODE } from '@/data/templates'
import { generateAgentPersonas } from '@/services/llm'
import type {
  SimulationMode, AgentPersona, LLMProvider,
  FashionConfig, FashionGoal,
  ConsultingConfig, ConsultingGoal,
  SocialConfig, SocialGoal, CampaignObjective,
  ResearchConfig, ResearchGoal, ResearchAudience,
} from '@/types'

// ─── Mode definitions ─────────────────────────────────────────────────────────
const MODES: { id: SimulationMode; label: string; desc: string; icon: typeof Brain; color: string; bg: string }[] = [
  { id: 'consulting', label: 'Consulting', desc: 'Strategic analysis with business personas', icon: Brain,    color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200'    },
  { id: 'social',     label: 'Social',     desc: 'Public opinion & sentiment simulation',    icon: Users,    color: 'text-pink-600',    bg: 'bg-pink-50 border-pink-200'    },
  { id: 'research',   title: 'Research', label: 'Research',   desc: 'Insight synthesis & pattern analysis',   icon: BookOpen, color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200'  },
  { id: 'fashion',    label: 'Fashion',    desc: 'Collection & licensing retail intelligence', icon: Shirt,   color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 border-fuchsia-200' },
] as { id: SimulationMode; label: string; desc: string; icon: typeof Brain; color: string; bg: string }[]

// ─── Constants ────────────────────────────────────────────────────────────────
const RETAILERS    = ['Renner', 'Riachuelo', 'C&A', 'Marisa', 'Hering', 'Arezzo', 'Zara Brasil', 'Outra']
const TARGET_GENDERS = ['Feminino', 'Masculino', 'Unissex', 'Infantil']
const SEASONS      = ['Verão 2026', 'Inverno 2026', 'Verão 2027', 'Inverno 2027', 'Cápsula / Atemporal']
const PRICE_RANGES = ['Popular (< R$80)', 'Acessível (R$80–150)', 'Médio (R$150–300)', 'Médio-alto (R$300+)']
const INDUSTRIES   = ['Varejo', 'Tecnologia', 'Saúde', 'Finanças', 'Educação', 'Manufatura', 'E-commerce', 'Outro']
const SOCIAL_PLATFORMS = ['Twitter/X', 'Reddit', 'LinkedIn', 'TikTok', 'Facebook', 'Instagram']
const RESEARCH_DOMAINS = ['Marketing', 'Comportamento do consumidor', 'Tecnologia', 'Saúde', 'Educação', 'Finanças', 'RH', 'Outro']

const FASHION_GOALS:    { id: FashionGoal;    icon: typeof Star;       label: string; desc: string }[] = [
  { id: 'evaluate',        icon: Star,        label: 'Avaliar nova coleção',      desc: 'Analise uma coleção ou licenciado antes de lançar' },
  { id: 'discover_license',icon: Search,      label: 'Descobrir próximo licenciado', desc: 'Meu licenciado atual está perdendo força — qual escolher?' },
  { id: 'discover_own',    icon: TrendingDown,label: 'Renovar coleção própria',   desc: 'Minha linha está caindo — que direção tomar?' },
]
const CONSULTING_GOALS: { id: ConsultingGoal; icon: typeof Brain;      label: string; desc: string }[] = [
  { id: 'debate', icon: Brain, label: 'Análise estratégica', desc: 'Debata um problema, oportunidade ou decisão complexa' },
  { id: 'decide', icon: Scale, label: 'Decisão travada',     desc: 'Tenho opções definidas e preciso escolher — ajude-me a decidir' },
]
const SOCIAL_GOALS:     { id: SocialGoal;     icon: typeof Megaphone;  label: string; desc: string }[] = [
  { id: 'launch', icon: Megaphone,   label: 'Lançamento / Campanha', desc: 'Como o público vai reagir ao que vou anunciar?' },
  { id: 'crisis', icon: AlertCircle, label: 'Gestão de Crise',       desc: 'Minha marca está em crise — simule a reação e estratégia' },
]
const RESEARCH_GOALS:   { id: ResearchGoal;   icon: typeof FlaskConical; label: string; desc: string }[] = [
  { id: 'synthesize', icon: FlaskConical, label: 'Síntese de dados / pesquisa', desc: 'Tenho dados ou feedbacks — extraia insights e padrões' },
  { id: 'validate',   icon: Lightbulb,    label: 'Validar hipótese',            desc: 'Acredito que X é verdade — desafie e avalie minha hipótese' },
]
const RESEARCH_AUDIENCES: { id: ResearchAudience; label: string }[] = [
  { id: 'academic',  label: 'Acadêmica' },
  { id: 'executive', label: 'Executiva' },
  { id: 'public',    label: 'Geral / Público' },
]
const CAMPAIGN_OBJECTIVES: { id: CampaignObjective; label: string }[] = [
  { id: 'awareness',  label: 'Awareness' },
  { id: 'engagement', label: 'Engajamento' },
  { id: 'conversion', label: 'Conversão' },
]

// ─── Default configs ──────────────────────────────────────────────────────────
const DEFAULT_FASHION:    FashionConfig    = { goal: 'evaluate', collectionName: '', collectionType: 'own', licensedBrand: '', styleNotes: '', decliningItem: '', decliningReason: '', retailer: '', targetAge: '', targetGender: '', season: '', priceRange: '' }
const DEFAULT_CONSULTING: ConsultingConfig = { goal: 'debate', company: '', industry: '', problem: '', constraints: '', optionA: '', optionB: '', optionC: '' }
const DEFAULT_SOCIAL:     SocialConfig     = { goal: 'launch', content: '', platform: 'Twitter/X', targetDemo: '', campaignObjective: 'awareness' }
const DEFAULT_RESEARCH:   ResearchConfig   = { goal: 'synthesize', question: '', domain: '', audience: 'executive', dataContext: '' }

// ─── Small UI helpers ─────────────────────────────────────────────────────────
function StringChips({ options, value, onChange, activeClass }: { options: string[]; value: string; onChange: (v: string) => void; activeClass: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${value === o ? activeClass : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
        >{o}</button>
      ))}
    </div>
  )
}

function Chips<T extends string>({ options, value, onChange, activeClass }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; activeClass: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${value === o.id ? activeClass : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
        >{o.label}</button>
      ))}
    </div>
  )
}

function GoalSelector<T extends string>({ goals, value, onChange, activeClass }: {
  goals: { id: T; icon: React.ElementType; label: string; desc: string }[]
  value: T; onChange: (v: T) => void; activeClass: string
}) {
  return (
    <div className="flex flex-col gap-2 mb-5">
      {goals.map(({ id, icon: Icon, label, desc }) => (
        <button key={id} onClick={() => onChange(id)}
          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${value === id ? activeClass : 'bg-white border-gray-200 hover:border-gray-300'}`}
        >
          <div className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${value === id ? 'bg-white/60' : 'bg-gray-100'}`}>
            <Icon size={14} className={value === id ? 'opacity-80' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${value === id ? '' : 'text-gray-500'}`}>{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
          <div className={`ml-auto mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${value === id ? 'bg-current border-current opacity-70' : 'border-gray-300'}`} />
        </button>
      ))}
    </div>
  )
}

function AgentToggle({ persona, selected, onToggle }: { persona: AgentPersona; selected: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${selected ? 'bg-white border-gray-300 shadow-sm opacity-100' : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-90'}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border ${selected ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200'}`}>{persona.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${selected ? 'text-gray-800' : 'text-gray-400'}`}>{persona.name}</p>
        <p className="text-xs text-gray-400 truncate">{persona.role}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'}`} />
    </button>
  )
}

// ─── Fashion forms ────────────────────────────────────────────────────────────
function FashionSharedFields({ config, onChange }: { config: FashionConfig; onChange: (c: FashionConfig) => void }) {
  function set<K extends keyof FashionConfig>(k: K, v: FashionConfig[K]) { onChange({ ...config, [k]: v }) }
  return (
    <>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Varejista <span className="text-red-400">*</span></label>
        <StringChips options={RETAILERS} value={config.retailer} onChange={(v) => set('retailer', v)} activeClass="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-300" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Público — Idade</label>
          <input className="input" placeholder="ex: 6–12, 18–25, 35+" value={config.targetAge} onChange={(e) => set('targetAge', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Público — Gênero</label>
          <StringChips options={TARGET_GENDERS} value={config.targetGender} onChange={(v) => set('targetGender', v)} activeClass="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-300" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Estação</label>
        <StringChips options={SEASONS} value={config.season} onChange={(v) => set('season', v)} activeClass="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-300" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Faixa de preço</label>
        <StringChips options={PRICE_RANGES} value={config.priceRange} onChange={(v) => set('priceRange', v)} activeClass="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-300" />
      </div>
    </>
  )
}

// ─── Scenario builders ────────────────────────────────────────────────────────
function buildFashionScenario(fc: FashionConfig): string {
  if (fc.goal === 'discover_license' || fc.goal === 'discover_own') {
    const type = fc.goal === 'discover_license' ? 'LICENSED BRAND' : 'OWN-BRAND COLLECTION'
    return `FASHION DISCOVERY BRIEF — RETAIL INTELLIGENCE\n\nSITUATION — DECLINING ${type}:\n${fc.goal === 'discover_license' ? `Licensed brand losing momentum: ${fc.decliningItem || '(not specified)'}` : `Collection/line in decline: ${fc.decliningItem || '(not specified)'}`}\nRetailer: ${fc.retailer || '(not specified)'}\nTarget audience: ${fc.targetAge || '(not specified)'}, ${fc.targetGender || '(not specified)'}\nSeason context: ${fc.season || '(not specified)'}\nPrice point: ${fc.priceRange || '(not specified)'}${fc.decliningReason ? `\n\nWhy it is declining:\n${fc.decliningReason}` : ''}${fc.styleNotes ? `\n\nConstraints & requirements:\n${fc.styleNotes}` : ''}\n\nCHALLENGE: ${fc.goal === 'discover_license' ? `The "${fc.decliningItem}" license is underperforming. Identify which licensed brand(s) should replace it to recover commercial performance. Propose specific alternatives with commercial rationale, trend positioning, and risk assessment.` : `The current collection direction is declining. Identify which new style concept, aesthetic, or product direction should replace it. Propose specific alternatives with commercial rationale.`}\n\nTASK FOR EACH AGENT: From your specific perspective, propose and evaluate replacement options. Be specific — name actual IPs, brands, trends, or concepts.`
  }
  const collName = fc.collectionType === 'licensed' ? `Licensed collection: ${fc.licensedBrand ?? '(unnamed)'} — ${fc.collectionName || '(line TBD)'}` : `Own collection: ${fc.collectionName || '(unnamed)'}`
  return `FASHION BRIEF — RETAIL INTELLIGENCE SIMULATION\n\n${collName}\nRetailer: ${fc.retailer || '(not specified)'}\nTarget audience: ${fc.targetAge || '(not specified)'}, ${fc.targetGender || '(not specified)'}\nSeason / Delivery: ${fc.season || '(not specified)'}\nPrice point: ${fc.priceRange || '(not specified)'}\n\nSTYLE REFERENCES & CONTEXT:\n${fc.styleNotes || '(no additional context provided)'}\n\nTASK: Evaluate the commercial, creative, and strategic viability of this collection/licensing deal.`
}

function buildConsultingScenario(cc: ConsultingConfig): string {
  const header = cc.goal === 'decide' ? 'CONSULTING BRIEF — DECISION SUPPORT' : 'CONSULTING BRIEF — STRATEGIC ANALYSIS'
  let body = `${header}\n\nCompany / Product: ${cc.company || '(not specified)'}\nIndustry: ${cc.industry || '(not specified)'}\n\nSITUATION:\n${cc.problem || '(not specified)'}\n`
  if (cc.goal === 'decide') body += `\nOPTIONS IN CONTENTION:\n• Option A: ${cc.optionA || '(not specified)'}\n• Option B: ${cc.optionB || '(not specified)'}${cc.optionC ? `\n• Option C: ${cc.optionC}` : ''}\n`
  if (cc.constraints) body += `\nCONSTRAINTS & CONTEXT:\n${cc.constraints}\n`
  body += cc.goal === 'decide'
    ? `\nTASK: Each agent must evaluate the options from their unique perspective and give a clear recommendation. In the final round, explicitly state which option you support and why.`
    : `\nTASK: Analyze this situation from your unique perspective. Surface key insights, risks, opportunities, and recommendations. Build on or challenge what previous agents said.`
  return body
}

function buildSocialScenario(sc: SocialConfig): string {
  return `${sc.goal === 'crisis' ? 'SOCIAL BRIEF — PR CRISIS SIMULATION' : 'SOCIAL BRIEF — LAUNCH / CAMPAIGN SIMULATION'}\n\nPlatform: ${sc.platform || '(not specified)'}\nTarget audience: ${sc.targetDemo || '(not specified)'}\nObjective: ${sc.campaignObjective}\n\n${sc.goal === 'crisis' ? 'CRISIS SITUATION:' : 'ANNOUNCEMENT / CONTENT:'}\n${sc.content || '(not specified)'}\n\nTASK: ${sc.goal === 'crisis' ? 'Each agent must react from their social persona. Identify forming narratives, assess damage level, and propose a crisis response strategy. Moderator summarizes overall temperature and recommended actions.' : 'Each agent reacts from their social persona. Would they engage, share, criticize? What would they post? Moderator summarizes overall reaction and predicts campaign performance.'}`
}

function buildResearchScenario(rc: ResearchConfig): string {
  return `${rc.goal === 'validate' ? 'RESEARCH BRIEF — HYPOTHESIS VALIDATION' : 'RESEARCH BRIEF — INSIGHT SYNTHESIS'}\n\nDomain: ${rc.domain || '(not specified)'}\nAudience: ${rc.audience}\n${rc.goal === 'validate' ? `\nHYPOTHESIS:\n${rc.question || '(not specified)'}` : `\nRESEARCH QUESTION:\n${rc.question || '(not specified)'}`}\n\nDATA / CONTEXT:\n${rc.dataContext || '(not specified)'}\n\nTASK: ${rc.goal === 'validate' ? 'Each agent evaluates this hypothesis from their perspective. Synthesizer delivers a final verdict: Supported / Partially Supported / Rejected, with confidence level and key reasons.' : 'Each agent analyzes this data from their perspective. Synthesizer distills the 3 most actionable insights from the full discussion.'}`
}

// ─── Custom agent builder ─────────────────────────────────────────────────────
function CustomAgentBuilder({ onAdd, onClose }: { onAdd: (p: AgentPersona) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [emoji, setEmoji] = useState('🤖')
  const [prompt, setPrompt] = useState('')

  function handleAdd() {
    if (!name.trim() || !role.trim() || !prompt.trim()) return
    const agent: AgentPersona = {
      id: `custom_${Date.now()}`,
      name, role, emoji,
      description: role,
      systemPrompt: prompt,
      color: 'text-gray-600',
      bgColor: 'bg-gray-500/10 border-gray-500/20',
      sentimentBias: 0,
    }
    onAdd(agent)
    onClose()
  }

  return (
    <div className="card border-gray-300 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Custom Agent</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-[48px_1fr] gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Emoji</label>
          <input className="input text-center text-lg px-1" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input className="input" placeholder="ex: The CFO" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Role</label>
        <input className="input" placeholder="ex: Chief Financial Officer" value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">System prompt</label>
        <textarea className="input resize-none h-24" placeholder="Describe how this agent thinks, what they prioritize, and their communication style…" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </div>
      <button onClick={handleAdd} disabled={!name.trim() || !role.trim() || !prompt.trim()}
        className="btn-primary text-sm py-2 disabled:opacity-40"
      >Add Agent</button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewSimulationPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { createSimulation, linkSimulations } = useSimulationStore()
  const { selectedProvider } = useLLMStore()

  const defaultMode = (params.get('mode') as SimulationMode) || 'consulting'

  const [name, setName]                         = useState('')
  const [mode, setMode]                         = useState<SimulationMode>(defaultMode)
  const [fashionConfig, setFashionConfig]       = useState<FashionConfig>(DEFAULT_FASHION)
  const [consultingConfig, setConsultingConfig] = useState<ConsultingConfig>(DEFAULT_CONSULTING)
  const [socialConfig, setSocialConfig]         = useState<SocialConfig>(DEFAULT_SOCIAL)
  const [researchConfig, setResearchConfig]     = useState<ResearchConfig>(DEFAULT_RESEARCH)
  const [customAgents, setCustomAgents]         = useState<AgentPersona[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set(PERSONAS_BY_MODE[defaultMode].map((p) => p.id)))
  const [rounds, setRounds]                     = useState(1)
  const [enableAdvocatus, setEnableAdvocatus]   = useState(false)
  const [comparisonProvider, setComparisonProvider] = useState<LLMProvider | null>(null)
  const [showCustomBuilder, setShowCustomBuilder]   = useState(false)
  const [showTemplates, setShowTemplates]           = useState(false)
  const [generatingAgents, setGeneratingAgents]     = useState(false)
  const [generateError, setGenerateError]           = useState<string | null>(null)

  useEffect(() => {
    setSelectedAgentIds(new Set(PERSONAS_BY_MODE[mode].map((p) => p.id)))
    setCustomAgents([])
    setShowCustomBuilder(false)
  }, [mode])

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) }
      else next.add(id)
      return next
    })
  }

  function addCustomAgent(agent: AgentPersona) {
    setCustomAgents((prev) => [...prev, agent])
    setSelectedAgentIds((prev) => new Set([...prev, agent.id]))
  }

  async function handleGenerateAgents() {
    setGeneratingAgents(true)
    setGenerateError(null)
    try {
      const scenario = buildScenario()
      const provider = getProvider(selectedProvider)
      const generated = await generateAgentPersonas(provider, scenario, mode, 3)
      const COLORS = ['text-indigo-600', 'text-teal-600', 'text-orange-600']
      const BGS    = ['bg-indigo-500/10 border-indigo-500/20', 'bg-teal-500/10 border-teal-500/20', 'bg-orange-500/10 border-orange-500/20']
      generated.forEach((g, i) => {
        addCustomAgent({
          id: `ai_${Date.now()}_${i}`,
          name: g.name, role: g.role, emoji: g.emoji,
          description: g.role,
          systemPrompt: g.systemPrompt,
          color: COLORS[i % COLORS.length],
          bgColor: BGS[i % BGS.length],
          sentimentBias: 0,
        })
      })
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate agents')
    } finally {
      setGeneratingAgents(false)
    }
  }

  function applyTemplate(templateId: string) {
    const t = TEMPLATES_BY_MODE[mode].find((t) => t.id === templateId)
    if (!t) return
    if (t.consultingConfig) setConsultingConfig({ ...DEFAULT_CONSULTING, ...t.consultingConfig })
    if (t.socialConfig)     setSocialConfig({ ...DEFAULT_SOCIAL, ...t.socialConfig })
    if (t.researchConfig)   setResearchConfig({ ...DEFAULT_RESEARCH, ...t.researchConfig })
    if (t.fashionConfig)    setFashionConfig({ ...DEFAULT_FASHION, ...t.fashionConfig })
    setShowTemplates(false)
  }

  function buildScenario(): string {
    if (mode === 'fashion')    return buildFashionScenario(fashionConfig)
    if (mode === 'consulting') return buildConsultingScenario(consultingConfig)
    if (mode === 'social')     return buildSocialScenario(socialConfig)
    return buildResearchScenario(researchConfig)
  }

  function buildDefaultName(): string {
    if (mode === 'consulting') {
      if (consultingConfig.goal === 'decide') return `Decisão: ${consultingConfig.company || 'Empresa'} — ${new Date().toLocaleDateString()}`
      return `Estratégia: ${consultingConfig.company || 'Empresa'} — ${new Date().toLocaleDateString()}`
    }
    if (mode === 'social') return `${socialConfig.goal === 'crisis' ? 'Crise de PR' : 'Lançamento'} — ${socialConfig.platform}`
    if (mode === 'research') return researchConfig.question ? researchConfig.question.slice(0, 50) + (researchConfig.question.length > 50 ? '…' : '') : `Research — ${new Date().toLocaleDateString()}`
    if (mode === 'fashion') {
      if (fashionConfig.goal === 'discover_license') return `Descoberta: substituto do ${fashionConfig.decliningItem || 'licenciado'}`
      if (fashionConfig.goal === 'discover_own')     return `Descoberta: nova direção para ${fashionConfig.decliningItem || 'coleção'}`
      if (fashionConfig.collectionType === 'licensed' && fashionConfig.licensedBrand) return `${fashionConfig.licensedBrand} × ${fashionConfig.retailer || 'Retail'}`
      return fashionConfig.collectionName || `Fashion — ${new Date().toLocaleDateString()}`
    }
    return `Simulation — ${new Date().toLocaleDateString()}`
  }

  function handleCreate() {
    const allAgents = [...PERSONAS_BY_MODE[mode].filter((p) => selectedAgentIds.has(p.id)), ...customAgents.filter((p) => selectedAgentIds.has(p.id))]
    const agents = enableAdvocatus ? [...allAgents, ADVOCATUS_DIABOLI] : allAgents
    const scenario = buildScenario()
    const simName = name.trim() || buildDefaultName()

    const simA = createSimulation({
      id: crypto.randomUUID(),
      name: comparisonProvider ? `${simName} [A]` : simName,
      mode, scenario, agents, rounds, enableAdvocatus,
      platform: mode === 'social' ? socialConfig.platform : undefined,
      fashionConfig:    mode === 'fashion'    ? fashionConfig    : undefined,
      consultingConfig: mode === 'consulting' ? consultingConfig : undefined,
      socialConfig:     mode === 'social'     ? socialConfig     : undefined,
      researchConfig:   mode === 'research'   ? researchConfig   : undefined,
    })

    if (comparisonProvider) {
      const simB = createSimulation({
        id: crypto.randomUUID(),
        name: `${simName} [B — ${PROVIDERS.find((p: { id: string; name: string }) => p.id === comparisonProvider)?.name ?? comparisonProvider}]`,
        mode, scenario, agents, rounds, enableAdvocatus,
        comparisonProvider,
        platform: mode === 'social' ? socialConfig.platform : undefined,
        fashionConfig:    mode === 'fashion'    ? fashionConfig    : undefined,
        consultingConfig: mode === 'consulting' ? consultingConfig : undefined,
        socialConfig:     mode === 'social'     ? socialConfig     : undefined,
        researchConfig:   mode === 'research'   ? researchConfig   : undefined,
      })
      linkSimulations(simA.id, simB.id)
      navigate(`/compare/${simA.id}/${simB.id}`)
    } else {
      navigate(`/simulation/${simA.id}`)
    }
  }

  const modeConfig = MODES.find((m) => m.id === mode)!

  const allModeAgents = [...PERSONAS_BY_MODE[mode], ...customAgents]

  const isValid = (() => {
    if (mode === 'fashion') {
      if (!fashionConfig.retailer) return false
      if (fashionConfig.goal === 'evaluate') return !!(fashionConfig.collectionName.trim() || fashionConfig.licensedBrand?.trim()) && fashionConfig.styleNotes.trim().length > 5
      return !!(fashionConfig.decliningItem?.trim())
    }
    if (mode === 'consulting') return consultingConfig.company.trim().length > 0 && consultingConfig.problem.trim().length > 10
    if (mode === 'social')     return socialConfig.content.trim().length > 10
    return researchConfig.question.trim().length > 5 && researchConfig.dataContext.trim().length > 10
  })()

  const templates = TEMPLATES_BY_MODE[mode]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Simulation</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your multi-agent swarm</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Simulation Name <span className="text-gray-400 normal-case font-normal">(optional)</span></label>
          <input className="input" placeholder="Auto-generated if left blank" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Mode selector */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mode</label>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(({ id, label, desc, icon: Icon, color, bg }) => (
              <button key={id} onClick={() => setMode(id)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 ${mode === id ? bg : 'bg-white border-gray-200 hover:border-gray-300'}`}
              >
                <Icon size={18} className={mode === id ? color : 'text-gray-400'} />
                <p className={`text-sm font-semibold mt-1.5 ${mode === id ? color : 'text-gray-500'}`}>{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Templates quick-load */}
        {templates.length > 0 && (
          <div>
            <button onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <LayoutTemplate size={13} />
              {showTemplates ? 'Hide templates' : `Load a template (${templates.length} available)`}
            </button>
            {showTemplates && (
              <div className="mt-3 flex flex-col gap-2">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => applyTemplate(t.id)}
                    className="card-hover p-3 flex items-start gap-3 text-left"
                  >
                    <span className="text-xl flex-shrink-0">{t.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{t.label}</p>
                      <p className="text-xs text-gray-400">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mode-specific brief */}
        <div className={`card border p-5 ${modeConfig.bg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${modeConfig.color}`}>
            {mode === 'consulting' && '♟️ Consulting Brief'}
            {mode === 'social'     && '📣 Social Brief'}
            {mode === 'research'   && '🔬 Research Brief'}
            {mode === 'fashion'    && '🧵 Fashion Intelligence'}
          </p>

          {mode === 'consulting' && (
            <div className="flex flex-col gap-5">
              <GoalSelector goals={CONSULTING_GOALS} value={consultingConfig.goal} onChange={(v) => setConsultingConfig((c) => ({ ...c, goal: v }))} activeClass="bg-blue-50 border-blue-300 text-blue-700" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Empresa / Produto <span className="text-red-400">*</span></label>
                  <input className="input" placeholder="ex: Minha startup, Produto X…" value={consultingConfig.company} onChange={(e) => setConsultingConfig((c) => ({ ...c, company: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Setor</label>
                  <StringChips options={INDUSTRIES} value={consultingConfig.industry} onChange={(v) => setConsultingConfig((c) => ({ ...c, industry: v }))} activeClass="bg-blue-50 text-blue-600 border-blue-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Problema / Contexto <span className="text-red-400">*</span></label>
                <textarea className="input resize-none h-28" placeholder="Descreva o desafio, oportunidade, ou decisão que precisa de análise estratégica…" value={consultingConfig.problem} onChange={(e) => setConsultingConfig((c) => ({ ...c, problem: e.target.value }))} />
              </div>
              {consultingConfig.goal === 'decide' && (
                <div className="flex flex-col gap-3">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Opções em disputa <span className="text-red-400">*</span></label>
                  {(['optionA', 'optionB', 'optionC'] as const).map((k, i) => (
                    <div key={k}>
                      <p className="text-xs text-gray-500 mb-1.5">Opção {String.fromCharCode(65 + i)}{i === 2 ? ' (opcional)' : ''}</p>
                      <input className="input" placeholder={i === 0 ? 'ex: Expandir para o mercado europeu' : i === 1 ? 'ex: Fortalecer posição no mercado doméstico' : 'ex: Adquirir um player regional'} value={consultingConfig[k] ?? ''} onChange={(e) => setConsultingConfig((c) => ({ ...c, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Restrições <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
                <textarea className="input resize-none h-20" placeholder="ex: Budget R$2M, equipe de 40 pessoas, janela de 6 meses, regulação do setor X…" value={consultingConfig.constraints} onChange={(e) => setConsultingConfig((c) => ({ ...c, constraints: e.target.value }))} />
              </div>
            </div>
          )}

          {mode === 'social' && (
            <div className="flex flex-col gap-5">
              <GoalSelector goals={SOCIAL_GOALS} value={socialConfig.goal} onChange={(v) => setSocialConfig((c) => ({ ...c, goal: v }))} activeClass="bg-pink-50 border-pink-300 text-pink-700" />
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Plataforma</label>
                <StringChips options={SOCIAL_PLATFORMS} value={socialConfig.platform} onChange={(v) => setSocialConfig((c) => ({ ...c, platform: v }))} activeClass="bg-pink-50 text-pink-600 border-pink-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{socialConfig.goal === 'crisis' ? 'Descreva a crise' : 'O que está sendo lançado'} <span className="text-red-400">*</span></label>
                <textarea className="input resize-none h-32" placeholder={socialConfig.goal === 'crisis' ? 'ex: Vazamento de dados de 150k usuários. E-mails expostos. Senhas e dados financeiros NÃO afetados…' : 'ex: Nova feature de IA que resume emails automaticamente. Opt-in, gratuita, disponível amanhã…'} value={socialConfig.content} onChange={(e) => setSocialConfig((c) => ({ ...c, content: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Público-alvo</label>
                  <input className="input" placeholder="ex: Millennials tech-savvy, mães 30–45…" value={socialConfig.targetDemo} onChange={(e) => setSocialConfig((c) => ({ ...c, targetDemo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Objetivo</label>
                  <Chips options={CAMPAIGN_OBJECTIVES} value={socialConfig.campaignObjective} onChange={(v) => setSocialConfig((c) => ({ ...c, campaignObjective: v }))} activeClass="bg-pink-50 text-pink-600 border-pink-300" />
                </div>
              </div>
            </div>
          )}

          {mode === 'research' && (
            <div className="flex flex-col gap-5">
              <GoalSelector goals={RESEARCH_GOALS} value={researchConfig.goal} onChange={(v) => setResearchConfig((c) => ({ ...c, goal: v }))} activeClass="bg-purple-50 border-purple-300 text-purple-700" />
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{researchConfig.goal === 'validate' ? 'Hipótese a validar' : 'Pergunta de pesquisa'} <span className="text-red-400">*</span></label>
                <input className="input" placeholder={researchConfig.goal === 'validate' ? 'ex: Acredito que onboarding é o principal motivo de churn nos primeiros 30 dias' : 'ex: Quais são os principais drivers de retenção em apps de saúde?'} value={researchConfig.question} onChange={(e) => setResearchConfig((c) => ({ ...c, question: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Domínio</label>
                  <StringChips options={RESEARCH_DOMAINS} value={researchConfig.domain} onChange={(v) => setResearchConfig((c) => ({ ...c, domain: v }))} activeClass="bg-purple-50 text-purple-600 border-purple-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Audiência</label>
                  <Chips options={RESEARCH_AUDIENCES} value={researchConfig.audience} onChange={(v) => setResearchConfig((c) => ({ ...c, audience: v }))} activeClass="bg-purple-50 text-purple-600 border-purple-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dados / Contexto <span className="text-red-400">*</span></label>
                <textarea className="input resize-none h-36" placeholder={researchConfig.goal === 'validate' ? 'ex: Analisamos 1.200 churns dos últimos 6 meses. 60% saíram antes do dia 14. Tutorial tem 8 steps e 34% de conclusão…' : 'ex: Analisamos 2.400 respostas de feedback do Q1. Temas: onboarding, preço, pedidos de mobile…'} value={researchConfig.dataContext} onChange={(e) => setResearchConfig((c) => ({ ...c, dataContext: e.target.value }))} />
              </div>
            </div>
          )}

          {mode === 'fashion' && (
            <>
              <div className="flex flex-col gap-2 mb-6">
                {FASHION_GOALS.map(({ id, icon: Icon, label, desc }) => (
                  <button key={id} onClick={() => setFashionConfig((c) => ({ ...c, goal: id }))}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${fashionConfig.goal === id ? 'bg-fuchsia-50 border-fuchsia-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${fashionConfig.goal === id ? 'bg-fuchsia-50' : 'bg-gray-100'}`}>
                      <Icon size={14} className={fashionConfig.goal === id ? 'text-fuchsia-600' : 'text-gray-400'} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${fashionConfig.goal === id ? 'text-fuchsia-700' : 'text-gray-500'}`}>{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <div className={`ml-auto mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${fashionConfig.goal === id ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-gray-300'}`} />
                  </button>
                ))}
              </div>
              {fashionConfig.goal === 'evaluate' ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo de coleção</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['own', 'licensed'] as const).map((t) => (
                        <button key={t} onClick={() => setFashionConfig((c) => ({ ...c, collectionType: t }))}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${fashionConfig.collectionType === t ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                        >{t === 'own' ? '🏷️ Coleção Própria' : '🤝 Licenciado'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{fashionConfig.collectionType === 'licensed' ? 'Nome do Licenciado' : 'Nome da Coleção'} <span className="text-red-400">*</span></label>
                    <input className="input" placeholder={fashionConfig.collectionType === 'licensed' ? 'ex: NASA, Disney, Marvel…' : 'ex: Coleção Y2K Revival, Terra & Mar…'} value={fashionConfig.collectionType === 'licensed' ? (fashionConfig.licensedBrand ?? '') : fashionConfig.collectionName} onChange={(e) => fashionConfig.collectionType === 'licensed' ? setFashionConfig((c) => ({ ...c, licensedBrand: e.target.value })) : setFashionConfig((c) => ({ ...c, collectionName: e.target.value }))} />
                  </div>
                  <FashionSharedFields config={fashionConfig} onChange={setFashionConfig} />
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Referências de estilo & contexto <span className="text-red-400">*</span></label>
                    <textarea className="input resize-none h-32" placeholder="Proposta da coleção, tendências, peças-chave, paleta, materiais…" value={fashionConfig.styleNotes} onChange={(e) => setFashionConfig((c) => ({ ...c, styleNotes: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{fashionConfig.goal === 'discover_license' ? 'Qual licenciado está parando de vender?' : 'Qual coleção está caindo?'} <span className="text-red-400">*</span></label>
                    <input className="input" placeholder={fashionConfig.goal === 'discover_license' ? 'ex: Sonic the Hedgehog, Power Rangers…' : 'ex: Coleção floral verão 25…'} value={fashionConfig.decliningItem ?? ''} onChange={(e) => setFashionConfig((c) => ({ ...c, decliningItem: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Por que está caindo? <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
                    <textarea className="input resize-none h-24" placeholder="ex: Sell-through caiu de 85% para 40% nos últimos 2 ciclos, estoque acumulado…" value={fashionConfig.decliningReason ?? ''} onChange={(e) => setFashionConfig((c) => ({ ...c, decliningReason: e.target.value }))} />
                  </div>
                  <FashionSharedFields config={fashionConfig} onChange={setFashionConfig} />
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Restrições <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
                    <textarea className="input resize-none h-20" placeholder="ex: Não posso usar IPs Disney, budget de licença até R$200k…" value={fashionConfig.styleNotes} onChange={(e) => setFashionConfig((c) => ({ ...c, styleNotes: e.target.value }))} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Debate rounds */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Debate Rounds</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setRounds(Math.max(1, rounds - 1))}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all"
            ><Minus size={14} className="text-gray-500" /></button>
            <div className={`flex-1 p-3 rounded-xl border text-center ${rounds > 1 ? 'bg-brand-50 border-brand-300' : 'bg-white border-gray-200'}`}>
              <span className={`text-2xl font-bold ${rounds > 1 ? 'text-brand-700' : 'text-gray-600'}`}>{rounds}</span>
              <p className="text-xs text-gray-400 mt-0.5">
                {rounds === 1 ? 'Opening positions only' : rounds === 2 ? 'Opening + Cross-examination' : rounds === 3 ? 'Opening + Cross-exam + Final verdicts & scores' : `${rounds - 2} cross-exam round${rounds - 2 > 1 ? 's' : ''} + scored finale`}
              </p>
            </div>
            <button onClick={() => setRounds(rounds + 1)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-gray-300 hover:bg-gray-50 transition-all"
            ><Plus size={14} className="text-gray-500" /></button>
          </div>
          {rounds > 4 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              ⚠ More than 4 rounds — LLMs tend to repeat themselves. Use sparingly.
            </p>
          )}
        </div>

        {/* Advocatus Diaboli */}
        <div>
          <button onClick={() => setEnableAdvocatus((v) => !v)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${enableAdvocatus ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}
          >
            <span className="text-xl">😈</span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${enableAdvocatus ? 'text-gray-800' : 'text-gray-500'}`}>Advocatus Diaboli</p>
              <p className="text-xs text-gray-400">Adiciona um agente que sempre desafia o consenso emergente</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${enableAdvocatus ? 'bg-gray-600 border-gray-600' : 'border-gray-300'}`} />
          </button>
        </div>

        {/* A/B Provider comparison */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5"><GitCompare size={12} /> A/B Provider Comparison <span className="font-normal normal-case text-gray-400">(optional)</span></span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setComparisonProvider(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${comparisonProvider === null ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
            >Off</button>
            {PROVIDERS.filter((p: { id: string }) => p.id !== selectedProvider).map((p: { id: string; name: string; icon: string }) => (
              <button key={p.id} onClick={() => setComparisonProvider(p.id as LLMProvider)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${comparisonProvider === p.id ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
              >{p.icon} {p.name}</button>
            ))}
          </div>
          {comparisonProvider && (
            <p className="text-xs text-blue-500 mt-2 flex items-center gap-1"><Repeat size={11} />Vai criar 2 simulações em paralelo — você será redirecionado para a tela de comparação.</p>
          )}
        </div>

        {/* Agents */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agents</label>
            <span className="text-xs font-semibold text-gray-600">{selectedAgentIds.size + (enableAdvocatus ? 1 : 0)} active</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allModeAgents.map((persona) => (
              <AgentToggle key={persona.id} persona={persona} selected={selectedAgentIds.has(persona.id)} onToggle={() => toggleAgent(persona.id)} />
            ))}
            {enableAdvocatus && (
              <AgentToggle persona={ADVOCATUS_DIABOLI} selected={true} onToggle={() => setEnableAdvocatus(false)} />
            )}
          </div>

          {/* AI generate + custom agent */}
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={handleGenerateAgents}
              disabled={generatingAgents || !isValid}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-700 disabled:opacity-40 transition-colors"
            >
              {generatingAgents
                ? <><Loader2 size={13} className="animate-spin" />Generating 3 agents with AI…</>
                : <><Sparkles size={13} />Generate 3 contextual agents with AI</>
              }
            </button>
            {generateError && <p className="text-xs text-red-500">{generateError}</p>}

            {!showCustomBuilder ? (
              <button onClick={() => setShowCustomBuilder(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <Plus size={13} />Add custom agent manually
              </button>
            ) : (
              <CustomAgentBuilder onAdd={addCustomAgent} onClose={() => setShowCustomBuilder(false)} />
            )}
          </div>
        </div>

        {/* CTA */}
        <button onClick={handleCreate} disabled={!isValid || (selectedAgentIds.size + customAgents.filter((p) => selectedAgentIds.has(p.id)).length) === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-40"
        >
          {comparisonProvider ? <><GitCompare size={18} />Launch A/B Simulation</> : <><ChevronRight size={18} />Launch Simulation</>}
        </button>
      </div>
    </div>
  )
}
