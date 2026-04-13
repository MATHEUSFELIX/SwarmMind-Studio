import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Brain, Users, BookOpen, Shirt, ChevronRight } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { PERSONAS_BY_MODE } from '@/data/personas'
import type { SimulationMode, AgentPersona, FashionConfig } from '@/types'

// ─── Mode definitions ─────────────────────────────────────────────────────────
const MODES: {
  id: SimulationMode
  label: string
  desc: string
  icon: typeof Brain
  color: string
  bg: string
}[] = [
  {
    id: 'consulting',
    label: 'Consulting',
    desc: 'Strategic analysis with business personas',
    icon: Brain,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'social',
    label: 'Social',
    desc: 'Public opinion & sentiment simulation',
    icon: Users,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    id: 'research',
    label: 'Research',
    desc: 'Insight synthesis & pattern analysis',
    icon: BookOpen,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'fashion',
    label: 'Fashion',
    desc: 'Collection & licensing retail intelligence',
    icon: Shirt,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10 border-fuchsia-500/20',
  },
]

// ─── Options ──────────────────────────────────────────────────────────────────
const SOCIAL_PLATFORMS = ['Twitter/X', 'Reddit', 'LinkedIn', 'TikTok', 'Facebook']

const RETAILERS = ['Renner', 'Riachuelo', 'C&A', 'Marisa', 'Hering', 'Arezzo', 'Zara Brasil', 'Outra']
const TARGET_AGES = ['13–18', '19–24', '25–34', '35–44', '45–55', '55+', 'Todos']
const TARGET_GENDERS = ['Feminino', 'Masculino', 'Unissex']
const SEASONS = ['Verão 2026', 'Inverno 2026', 'Verão 2027', 'Inverno 2027', 'Cápsula / Atemporal']
const PRICE_RANGES = ['Popular (< R$80)', 'Acessível (R$80–150)', 'Médio (R$150–300)', 'Médio-alto (R$300+)']

// ─── Example scenarios ────────────────────────────────────────────────────────
const SCENARIO_EXAMPLES: Record<SimulationMode, string> = {
  consulting:
    'We are considering entering the Nordic market with our SaaS product. Current ARR is $2M, target is $10M in 3 years. Main competitors are Salesforce and HubSpot. We have a lean team of 40 people.',
  social:
    "We are launching a new AI-powered feature that automatically summarizes your emails. It will be opt-in and free for all users. We're announcing it on social media tomorrow.",
  research:
    'We analyzed 2,400 customer feedback responses from Q1. Main themes seem to be around onboarding friction, pricing concerns, and feature requests for mobile. What insights can we extract?',
  fashion: '',
}

// ─── Agent toggle ──────────────────────────────────────────────────────────────
function AgentToggle({
  persona,
  selected,
  onToggle,
}: {
  persona: AgentPersona
  selected: boolean
  onToggle: () => void
}) {
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
      <div
        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
          selected ? 'bg-brand-500 border-brand-500' : 'border-slate-700'
        }`}
      />
    </button>
  )
}

// ─── Fashion structured form ──────────────────────────────────────────────────
function FashionForm({
  config,
  onChange,
}: {
  config: FashionConfig
  onChange: (c: FashionConfig) => void
}) {
  function set<K extends keyof FashionConfig>(key: K, val: FashionConfig[K]) {
    onChange({ ...config, [key]: val })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Collection type toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Tipo de coleção
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['own', 'licensed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => set('collectionType', t)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                config.collectionType === t
                  ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
              }`}
            >
              {t === 'own' ? '🏷️ Coleção Própria' : '🤝 Licenciado'}
            </button>
          ))}
        </div>
      </div>

      {/* Collection / license name */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {config.collectionType === 'licensed' ? 'Nome do Licenciado' : 'Nome da Coleção'}
          <span className="text-red-400 ml-1">*</span>
        </label>
        <input
          className="input"
          placeholder={
            config.collectionType === 'licensed'
              ? 'ex: NASA, Disney, Marvel, Stranger Things…'
              : 'ex: Coleção Y2K Revival, Terra & Mar…'
          }
          value={config.collectionType === 'licensed' ? (config.licensedBrand ?? '') : config.collectionName}
          onChange={(e) =>
            config.collectionType === 'licensed'
              ? set('licensedBrand', e.target.value)
              : set('collectionName', e.target.value)
          }
        />
      </div>

      {/* If licensed, also ask collection name */}
      {config.collectionType === 'licensed' && (
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Nome da Coleção / Linha
          </label>
          <input
            className="input"
            placeholder="ex: Coleção NASA × Renner Outono 2026"
            value={config.collectionName}
            onChange={(e) => set('collectionName', e.target.value)}
          />
        </div>
      )}

      {/* Retailer */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Varejista alvo <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {RETAILERS.map((r) => (
            <button
              key={r}
              onClick={() => set('retailer', r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                config.retailer === r
                  ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Target audience */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Público — Idade
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_AGES.map((a) => (
              <button
                key={a}
                onClick={() => set('targetAge', a)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                  config.targetAge === a
                    ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Público — Gênero
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => set('targetGender', g)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${
                  config.targetGender === g
                    ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Season */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Estação / Entrega
        </label>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => set('season', s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                config.season === s
                  ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Faixa de preço
        </label>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGES.map((p) => (
            <button
              key={p}
              onClick={() => set('priceRange', p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                config.priceRange === p
                  ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Style notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Referências de estilo, paleta, silhuetas & contexto
          <span className="text-red-400 ml-1">*</span>
        </label>
        <textarea
          className="input resize-none h-32"
          placeholder={
            config.collectionType === 'licensed'
              ? 'Descreva o licenciado, por que faz sentido para a varejista, peças-chave previstas, paleta de cores, inspirações…'
              : 'Descreva a proposta da coleção, tendências que inspira, peças-chave, paleta, materiais e qualquer diferencial…'
          }
          value={config.styleNotes}
          onChange={(e) => set('styleNotes', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Build scenario string from fashion config ────────────────────────────────
function buildFashionScenario(fc: FashionConfig): string {
  const collName =
    fc.collectionType === 'licensed'
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

// ─── Main component ───────────────────────────────────────────────────────────
const DEFAULT_FASHION_CONFIG: FashionConfig = {
  collectionName: '',
  retailer: '',
  targetAge: '',
  targetGender: '',
  season: '',
  priceRange: '',
  collectionType: 'own',
  licensedBrand: '',
  styleNotes: '',
}

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
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleCreate() {
    const allPersonas = PERSONAS_BY_MODE[mode]
    const agents = allPersonas.filter((p) => selectedAgentIds.has(p.id))

    const finalScenario =
      mode === 'fashion' ? buildFashionScenario(fashionConfig) : scenario.trim()

    const simName =
      name.trim() ||
      (mode === 'fashion' && fashionConfig.collectionType === 'licensed' && fashionConfig.licensedBrand
        ? `${fashionConfig.licensedBrand} × ${fashionConfig.retailer || 'Retail'}`
        : mode === 'fashion' && fashionConfig.collectionName
        ? fashionConfig.collectionName
        : `${mode.charAt(0).toUpperCase() + mode.slice(1)} — ${new Date().toLocaleDateString()}`)

    const sim = createSimulation({
      id: crypto.randomUUID(),
      name: simName,
      mode,
      scenario: finalScenario,
      agents,
      platform: mode === 'social' ? platform : undefined,
      fashionConfig: mode === 'fashion' ? fashionConfig : undefined,
    })

    navigate(`/simulation/${sim.id}`)
  }

  const isFashionValid =
    mode !== 'fashion' ||
    ((fashionConfig.collectionName.trim() || fashionConfig.licensedBrand?.trim()) &&
      fashionConfig.retailer &&
      fashionConfig.styleNotes.trim().length > 10)

  const canCreate =
    selectedAgentIds.size > 0 &&
    isFashionValid &&
    (mode === 'fashion' || scenario.trim().length > 10)

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
            Simulation Name{' '}
            <span className="text-slate-600 normal-case font-normal">(optional)</span>
          </label>
          <input
            className="input"
            placeholder="e.g., NASA × Renner Licensing Analysis"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Mode */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(({ id, label, desc, icon: Icon, color, bg }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                  mode === id ? bg : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Icon size={18} className={mode === id ? color : 'text-slate-600'} />
                <p
                  className={`text-sm font-semibold mt-1.5 ${
                    mode === id ? color : 'text-slate-400'
                  }`}
                >
                  {label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Social: platform selector */}
        {mode === 'social' && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    platform === p
                      ? 'bg-pink-500/15 text-pink-400 border-pink-500/30'
                      : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fashion: structured form */}
        {mode === 'fashion' ? (
          <div
            className={`card border p-5 ${modeConfig.bg}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${modeConfig.color}`}>
              🧵 Fashion Brief
            </p>
            <FashionForm config={fashionConfig} onChange={setFashionConfig} />
          </div>
        ) : (
          /* Generic scenario textarea */
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Scenario / Document
            </label>
            <textarea
              className="input resize-none h-36"
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
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Agents
            </label>
            <span className="text-xs text-slate-600">{selectedAgentIds.size} selected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERSONAS_BY_MODE[mode].map((persona) => (
              <AgentToggle
                key={persona.id}
                persona={persona}
                selected={selectedAgentIds.has(persona.id)}
                onToggle={() => toggleAgent(persona.id)}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
        >
          Launch Simulation
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
