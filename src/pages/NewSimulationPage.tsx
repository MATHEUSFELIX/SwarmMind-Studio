import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Brain, Users, BookOpen, Shirt, ChevronRight, TrendingDown, Search, Star } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { PERSONAS_BY_MODE } from '@/data/personas'
import type { SimulationMode, AgentPersona, FashionConfig, FashionGoal } from '@/types'

// ─── Mode definitions ─────────────────────────────────────────────────────────
const MODES: {
  id: SimulationMode
  label: string
  desc: string
  icon: typeof Brain
  color: string
  bg: string
}[] = [
  { id: 'consulting', label: 'Consulting', desc: 'Strategic analysis with business personas', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'social', label: 'Social', desc: 'Public opinion & sentiment simulation', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  { id: 'research', label: 'Research', desc: 'Insight synthesis & pattern analysis', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { id: 'fashion', label: 'Fashion', desc: 'Collection & licensing retail intelligence', icon: Shirt, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
]

const SOCIAL_PLATFORMS = ['Twitter/X', 'Reddit', 'LinkedIn', 'TikTok', 'Facebook']
const RETAILERS = ['Renner', 'Riachuelo', 'C&A', 'Marisa', 'Hering', 'Arezzo', 'Zara Brasil', 'Outra']
const TARGET_GENDERS = ['Feminino', 'Masculino', 'Unissex', 'Infantil']
const SEASONS = ['Verão 2026', 'Inverno 2026', 'Verão 2027', 'Inverno 2027', 'Cápsula / Atemporal']
const PRICE_RANGES = ['Popular (< R$80)', 'Acessível (R$80–150)', 'Médio (R$150–300)', 'Médio-alto (R$300+)']

const SCENARIO_EXAMPLES: Record<SimulationMode, string> = {
  consulting: 'We are considering entering the Nordic market with our SaaS product. Current ARR is $2M, target is $10M in 3 years. Main competitors are Salesforce and HubSpot. We have a lean team of 40 people.',
  social: "We are launching a new AI-powered feature that automatically summarizes your emails. It will be opt-in and free for all users. We're announcing it on social media tomorrow.",
  research: 'We analyzed 2,400 customer feedback responses from Q1. Main themes seem to be around onboarding friction, pricing concerns, and feature requests for mobile. What insights can we extract?',
  fashion: '',
}

// ─── Fashion goal config ──────────────────────────────────────────────────────
const FASHION_GOALS: { id: FashionGoal; icon: typeof Star; label: string; desc: string }[] = [
  { id: 'evaluate', icon: Star, label: 'Avaliar nova coleção', desc: 'Analise uma coleção ou licenciado antes de lançar' },
  { id: 'discover_license', icon: Search, label: 'Descobrir próximo licenciado', desc: 'Meu licenciado atual está perdendo força — qual escolher?' },
  { id: 'discover_own', icon: TrendingDown, label: 'Renovar coleção própria', desc: 'Minha linha está caindo — que direção tomar?' },
]

// ─── Agent toggle ──────────────────────────────────────────────────────────────
function AgentToggle({ persona, selected, onToggle }: { persona: AgentPersona; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
        selected ? `${persona.bgColor} opacity-100` : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-80'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border ${persona.bgColor}`}>
        {persona.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${selected ? persona.color : 'text-slate-400'}`}>{persona.name}</p>
        <p className="text-xs text-slate-500 truncate">{persona.role}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${selected ? 'bg-brand-500 border-brand-500' : 'border-slate-700'}`} />
    </button>
  )
}

// ─── Shared fields (retailer, age, gender, season, price) ────────────────────
function SharedFields({ config, onChange }: { config: FashionConfig; onChange: (c: FashionConfig) => void }) {
  function set<K extends keyof FashionConfig>(key: K, val: FashionConfig[K]) {
    onChange({ ...config, [key]: val })
  }

  return (
    <>
      {/* Retailer */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Varejista alvo <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {RETAILERS.map((r) => (
            <button key={r} onClick={() => set('retailer', r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${config.retailer === r ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* Age + Gender */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Público — Idade
          </label>
          <input
            className="input"
            placeholder="ex: 6–12, 18–25, 35+"
            value={config.targetAge}
            onChange={(e) => set('targetAge', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Público — Gênero
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_GENDERS.map((g) => (
              <button key={g} onClick={() => set('targetGender', g)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${config.targetGender === g ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
              >{g}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Season */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Estação / Entrega</label>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <button key={s} onClick={() => set('season', s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${config.season === s ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Faixa de preço</label>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((p) => (
            <button key={p} onClick={() => set('priceRange', p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${config.priceRange === p ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
            >{p}</button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Evaluate form ─────────────────────────────────────────────────────────────
function EvaluateForm({ config, onChange }: { config: FashionConfig; onChange: (c: FashionConfig) => void }) {
  function set<K extends keyof FashionConfig>(key: K, val: FashionConfig[K]) {
    onChange({ ...config, [key]: val })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Collection type */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tipo de coleção</label>
        <div className="grid grid-cols-2 gap-2">
          {(['own', 'licensed'] as const).map((t) => (
            <button key={t} onClick={() => set('collectionType', t)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${config.collectionType === t ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
            >{t === 'own' ? '🏷️ Coleção Própria' : '🤝 Licenciado'}</button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {config.collectionType === 'licensed' ? 'Nome do Licenciado' : 'Nome da Coleção'}
          <span className="text-red-400 ml-1">*</span>
        </label>
        <input className="input"
          placeholder={config.collectionType === 'licensed' ? 'ex: NASA, Disney, Marvel…' : 'ex: Coleção Y2K Revival, Terra & Mar…'}
          value={config.collectionType === 'licensed' ? (config.licensedBrand ?? '') : config.collectionName}
          onChange={(e) => config.collectionType === 'licensed' ? set('licensedBrand', e.target.value) : set('collectionName', e.target.value)}
        />
      </div>

      {config.collectionType === 'licensed' && (
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nome da Linha / Coleção</label>
          <input className="input" placeholder="ex: Coleção NASA × Renner Outono 2026"
            value={config.collectionName}
            onChange={(e) => set('collectionName', e.target.value)}
          />
        </div>
      )}

      <SharedFields config={config} onChange={onChange} />

      {/* Style notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Referências de estilo, paleta, silhuetas & contexto <span className="text-red-400">*</span>
        </label>
        <textarea className="input resize-none h-32"
          placeholder={config.collectionType === 'licensed'
            ? 'Por que este licenciado? Peças-chave previstas, paleta, inspirações, diferenciais…'
            : 'Proposta da coleção, tendências, peças-chave, paleta, materiais, diferenciais…'}
          value={config.styleNotes}
          onChange={(e) => set('styleNotes', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Discovery form (license or own) ─────────────────────────────────────────
function DiscoveryForm({ config, onChange }: { config: FashionConfig; onChange: (c: FashionConfig) => void }) {
  function set<K extends keyof FashionConfig>(key: K, val: FashionConfig[K]) {
    onChange({ ...config, [key]: val })
  }

  const isLicense = config.goal === 'discover_license'

  return (
    <div className="flex flex-col gap-5">
      {/* What's declining */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {isLicense ? 'Qual licenciado está parando de vender?' : 'Qual coleção / linha está caindo?'}
          <span className="text-red-400 ml-1">*</span>
        </label>
        <input className="input"
          placeholder={isLicense ? 'ex: Sonic the Hedgehog, Power Rangers, Hello Kitty…' : 'ex: Coleção floral verão 25, Linha básicos premium…'}
          value={config.decliningItem ?? ''}
          onChange={(e) => set('decliningItem', e.target.value)}
        />
      </div>

      {/* Why declining */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Por que está caindo? <span className="text-slate-600 normal-case font-normal">(opcional)</span>
        </label>
        <textarea className="input resize-none h-24"
          placeholder={isLicense
            ? 'ex: Sell-through caiu de 85% para 40% nos últimos 2 ciclos, estoque acumulado, concorrente com preço mais baixo…'
            : 'ex: Consumidora cansou do estampado, cores fora de tendência, margem apertando, sem diferencial frente à concorrência…'}
          value={config.decliningReason ?? ''}
          onChange={(e) => set('decliningReason', e.target.value)}
        />
      </div>

      <SharedFields config={config} onChange={onChange} />

      {/* Additional constraints */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Restrições ou requisitos <span className="text-slate-600 normal-case font-normal">(opcional)</span>
        </label>
        <textarea className="input resize-none h-20"
          placeholder={isLicense
            ? 'ex: Preciso de licença com forte appeal infantil, não posso usar IPs da Disney (já tenho com concorrente), budget de licença até R$X…'
            : 'ex: Sem estampas (já saturado), deve usar matéria-prima nacional, cápsula de no máximo 12 SKUs…'}
          value={config.styleNotes}
          onChange={(e) => set('styleNotes', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Build scenario string ────────────────────────────────────────────────────
function buildFashionScenario(fc: FashionConfig): string {
  if (fc.goal === 'discover_license' || fc.goal === 'discover_own') {
    const type = fc.goal === 'discover_license' ? 'LICENSED BRAND' : 'OWN-BRAND COLLECTION'
    return `FASHION DISCOVERY BRIEF — RETAIL INTELLIGENCE

SITUATION — DECLINING ${type}:
${fc.goal === 'discover_license' ? `Licensed brand losing momentum: ${fc.decliningItem || '(not specified)'}` : `Collection/line in decline: ${fc.decliningItem || '(not specified)'}`}
Retailer: ${fc.retailer || '(not specified)'}
Target audience: ${fc.targetAge || '(not specified)'}, ${fc.targetGender || '(not specified)'}
Season context: ${fc.season || '(not specified)'}
Price point: ${fc.priceRange || '(not specified)'}
${fc.decliningReason ? `\nWhy it is declining:\n${fc.decliningReason}` : ''}
${fc.styleNotes ? `\nConstraints & requirements:\n${fc.styleNotes}` : ''}

CHALLENGE: ${fc.goal === 'discover_license'
  ? `The "${fc.decliningItem}" license is underperforming. Identify which licensed brand(s) should replace it to recover commercial performance for this retailer and audience. Propose specific alternatives with commercial rationale, trend positioning, and risk assessment.`
  : `The current collection direction is declining. Identify which new style concept, aesthetic, or product direction should replace it. Propose specific alternatives with commercial rationale, trend positioning, and differentiation strategy.`}

TASK FOR EACH AGENT: From your specific perspective (trends, buying, consumer, brand, visual merchandising, ESG), propose and evaluate replacement options. Be specific — name actual IPs, brands, trends, or concepts. Explain why each would succeed where the current one is failing.`
  }

  // Evaluate mode
  const collName = fc.collectionType === 'licensed'
    ? `Licensed collection: ${fc.licensedBrand ?? '(unnamed)'} — ${fc.collectionName || '(line TBD)'}`
    : `Own collection: ${fc.collectionName || '(unnamed)'}`

  return `FASHION BRIEF — RETAIL INTELLIGENCE SIMULATION

${collName}
Retailer: ${fc.retailer || '(not specified)'}
Target audience: ${fc.targetAge || '(not specified)'}, ${fc.targetGender || '(not specified)'}
Season / Delivery: ${fc.season || '(not specified)'}
Price point: ${fc.priceRange || '(not specified)'}
Collection type: ${fc.collectionType === 'licensed' ? 'Licensed brand collaboration' : 'Retailer own-label collection'}

STYLE REFERENCES & CONTEXT:
${fc.styleNotes || '(no additional context provided)'}

TASK: Evaluate the commercial, creative, and strategic viability of this collection/licensing deal for the retailer. Assess trend alignment, sell-through potential, brand fit, consumer appeal, visual merchandising potential, and ESG risks.`
}

// ─── Default config ───────────────────────────────────────────────────────────
const DEFAULT_FASHION_CONFIG: FashionConfig = {
  goal: 'evaluate',
  collectionName: '',
  collectionType: 'own',
  licensedBrand: '',
  styleNotes: '',
  decliningItem: '',
  decliningReason: '',
  retailer: '',
  targetAge: '',
  targetGender: '',
  season: '',
  priceRange: '',
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewSimulationPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { createSimulation } = useSimulationStore()

  const defaultMode = (params.get('mode') as SimulationMode) || 'consulting'

  const [name, setName] = useState('')
  const [mode, setMode] = useState<SimulationMode>(defaultMode)
  const [scenario, setScenario] = useState(SCENARIO_EXAMPLES[defaultMode])
  const [fashionConfig, setFashionConfig] = useState<FashionConfig>(DEFAULT_FASHION_CONFIG)
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(
    new Set(PERSONAS_BY_MODE[defaultMode].map((p) => p.id)),
  )
  const [platform, setPlatform] = useState('Twitter/X')

  useEffect(() => {
    setSelectedAgentIds(new Set(PERSONAS_BY_MODE[mode].map((p) => p.id)))
    setScenario(SCENARIO_EXAMPLES[mode])
    if (mode === 'fashion') setFashionConfig(DEFAULT_FASHION_CONFIG)
  }, [mode])

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) }
      else next.add(id)
      return next
    })
  }

  function handleCreate() {
    const agents = PERSONAS_BY_MODE[mode].filter((p) => selectedAgentIds.has(p.id))
    const finalScenario = mode === 'fashion' ? buildFashionScenario(fashionConfig) : scenario.trim()

    const defaultName = () => {
      if (mode !== 'fashion') return `${mode.charAt(0).toUpperCase() + mode.slice(1)} — ${new Date().toLocaleDateString()}`
      if (fashionConfig.goal === 'discover_license') return `Descoberta: substituto do ${fashionConfig.decliningItem || 'licenciado'}`
      if (fashionConfig.goal === 'discover_own') return `Descoberta: nova direção para ${fashionConfig.decliningItem || 'coleção'}`
      if (fashionConfig.collectionType === 'licensed' && fashionConfig.licensedBrand) return `${fashionConfig.licensedBrand} × ${fashionConfig.retailer || 'Retail'}`
      return fashionConfig.collectionName || `Fashion — ${new Date().toLocaleDateString()}`
    }

    const sim = createSimulation({
      id: crypto.randomUUID(),
      name: name.trim() || defaultName(),
      mode,
      scenario: finalScenario,
      agents,
      platform: mode === 'social' ? platform : undefined,
      fashionConfig: mode === 'fashion' ? fashionConfig : undefined,
    })

    navigate(`/simulation/${sim.id}`)
  }

  const isFashionValid = (() => {
    if (mode !== 'fashion') return true
    if (!fashionConfig.retailer) return false
    if (fashionConfig.goal === 'evaluate') {
      const hasName = !!(fashionConfig.collectionName.trim() || fashionConfig.licensedBrand?.trim())
      return hasName && fashionConfig.styleNotes.trim().length > 5
    }
    // discovery modes
    return !!(fashionConfig.decliningItem?.trim())
  })()

  const canCreate = selectedAgentIds.size > 0 && isFashionValid && (mode === 'fashion' || scenario.trim().length > 10)
  const modeConfig = MODES.find((m) => m.id === mode)!

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">New Simulation</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your multi-agent swarm</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Simulation Name <span className="text-slate-600 normal-case font-normal">(optional)</span>
          </label>
          <input className="input" placeholder="e.g., Sonic Replacement Strategy — Renner" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Mode selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mode</label>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(({ id, label, desc, icon: Icon, color, bg }) => (
              <button key={id} onClick={() => setMode(id)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 ${mode === id ? bg : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
              >
                <Icon size={18} className={mode === id ? color : 'text-slate-600'} />
                <p className={`text-sm font-semibold mt-1.5 ${mode === id ? color : 'text-slate-400'}`}>{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Social: platform */}
        {mode === 'social' && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Platform</label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((p) => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${platform === p ? 'bg-pink-500/15 text-pink-400 border-pink-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                >{p}</button>
              ))}
            </div>
          </div>
        )}

        {/* Fashion: goal selector + dynamic form */}
        {mode === 'fashion' ? (
          <div className={`card border p-5 ${modeConfig.bg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${modeConfig.color}`}>🧵 Fashion Intelligence</p>

            {/* Goal selector */}
            <div className="flex flex-col gap-2 mb-6">
              {FASHION_GOALS.map(({ id, icon: Icon, label, desc }) => (
                <button key={id} onClick={() => setFashionConfig((c) => ({ ...c, goal: id }))}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${fashionConfig.goal === id ? 'bg-fuchsia-500/20 border-fuchsia-500/40' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${fashionConfig.goal === id ? 'bg-fuchsia-500/20' : 'bg-slate-800'}`}>
                    <Icon size={14} className={fashionConfig.goal === id ? 'text-fuchsia-400' : 'text-slate-500'} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${fashionConfig.goal === id ? 'text-fuchsia-300' : 'text-slate-400'}`}>{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                  <div className={`ml-auto mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${fashionConfig.goal === id ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-slate-700'}`} />
                </button>
              ))}
            </div>

            {/* Dynamic form based on goal */}
            {fashionConfig.goal === 'evaluate'
              ? <EvaluateForm config={fashionConfig} onChange={setFashionConfig} />
              : <DiscoveryForm config={fashionConfig} onChange={setFashionConfig} />
            }
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Scenario / Document</label>
            <textarea className="input resize-none h-36"
              placeholder="Describe the situation, paste a document, or outline the context…"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            />
            <p className="text-xs text-slate-600 mt-1">{scenario.length} characters</p>
          </div>
        )}

        {/* Agents */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agents</label>
            <span className="text-xs text-slate-600">{selectedAgentIds.size} selected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERSONAS_BY_MODE[mode].map((persona) => (
              <AgentToggle key={persona.id} persona={persona} selected={selectedAgentIds.has(persona.id)} onToggle={() => toggleAgent(persona.id)} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <button onClick={handleCreate} disabled={!canCreate}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
        >
          Launch Simulation
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
