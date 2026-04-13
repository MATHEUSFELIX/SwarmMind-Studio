import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Brain, Users, BookOpen, Shirt, ChevronRight,
  TrendingDown, Search, Star, Scale, Megaphone,
  AlertCircle, FlaskConical, Lightbulb,
} from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { PERSONAS_BY_MODE } from '@/data/personas'
import type {
  SimulationMode, AgentPersona,
  FashionConfig, FashionGoal,
  ConsultingConfig, ConsultingGoal,
  SocialConfig, SocialGoal, CampaignObjective,
  ResearchConfig, ResearchGoal, ResearchAudience,
} from '@/types'

// ─── Mode definitions ─────────────────────────────────────────────────────────
const MODES: {
  id: SimulationMode
  label: string
  desc: string
  icon: typeof Brain
  color: string
  bg: string
}[] = [
  { id: 'consulting', label: 'Consulting', desc: 'Strategic analysis with business personas', icon: Brain, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { id: 'social', label: 'Social', desc: 'Public opinion & sentiment simulation', icon: Users, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
  { id: 'research', label: 'Research', desc: 'Insight synthesis & pattern analysis', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  { id: 'fashion', label: 'Fashion', desc: 'Collection & licensing retail intelligence', icon: Shirt, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50 border-fuchsia-200' },
]

// ─── Fashion constants ────────────────────────────────────────────────────────
const RETAILERS = ['Renner', 'Riachuelo', 'C&A', 'Marisa', 'Hering', 'Arezzo', 'Zara Brasil', 'Outra']
const TARGET_GENDERS = ['Feminino', 'Masculino', 'Unissex', 'Infantil']
const SEASONS = ['Verão 2026', 'Inverno 2026', 'Verão 2027', 'Inverno 2027', 'Cápsula / Atemporal']
const PRICE_RANGES = ['Popular (< R$80)', 'Acessível (R$80–150)', 'Médio (R$150–300)', 'Médio-alto (R$300+)']
const FASHION_GOALS: { id: FashionGoal; icon: typeof Star; label: string; desc: string }[] = [
  { id: 'evaluate', icon: Star, label: 'Avaliar nova coleção', desc: 'Analise uma coleção ou licenciado antes de lançar' },
  { id: 'discover_license', icon: Search, label: 'Descobrir próximo licenciado', desc: 'Meu licenciado atual está perdendo força — qual escolher?' },
  { id: 'discover_own', icon: TrendingDown, label: 'Renovar coleção própria', desc: 'Minha linha está caindo — que direção tomar?' },
]

// ─── Consulting constants ─────────────────────────────────────────────────────
const INDUSTRIES = ['Varejo', 'Tecnologia', 'Saúde', 'Finanças', 'Educação', 'Manufatura', 'E-commerce', 'Outro']
const CONSULTING_GOALS: { id: ConsultingGoal; icon: typeof Scale; label: string; desc: string }[] = [
  { id: 'debate', icon: Brain, label: 'Análise estratégica', desc: 'Debata um problema, oportunidade ou decisão complexa' },
  { id: 'decide', icon: Scale, label: 'Decisão travada', desc: 'Tenho opções definidas e preciso escolher — ajude-me a decidir' },
]

// ─── Social constants ─────────────────────────────────────────────────────────
const SOCIAL_PLATFORMS = ['Twitter/X', 'Reddit', 'LinkedIn', 'TikTok', 'Facebook', 'Instagram']
const SOCIAL_GOALS: { id: SocialGoal; icon: typeof Megaphone; label: string; desc: string }[] = [
  { id: 'launch', icon: Megaphone, label: 'Lançamento / Campanha', desc: 'Como o público vai reagir ao que vou anunciar?' },
  { id: 'crisis', icon: AlertCircle, label: 'Gestão de Crise', desc: 'Minha marca está em crise — simule a reação e estratégia' },
]
const CAMPAIGN_OBJECTIVES: { id: CampaignObjective; label: string }[] = [
  { id: 'awareness', label: 'Awareness' },
  { id: 'engagement', label: 'Engajamento' },
  { id: 'conversion', label: 'Conversão' },
]

// ─── Research constants ───────────────────────────────────────────────────────
const RESEARCH_DOMAINS = ['Marketing', 'Comportamento do consumidor', 'Tecnologia', 'Saúde', 'Educação', 'Finanças', 'RH', 'Outro']
const RESEARCH_GOALS: { id: ResearchGoal; icon: typeof FlaskConical; label: string; desc: string }[] = [
  { id: 'synthesize', icon: FlaskConical, label: 'Síntese de dados / pesquisa', desc: 'Tenho dados ou feedbacks — extraia insights e padrões' },
  { id: 'validate', icon: Lightbulb, label: 'Validar hipótese', desc: 'Acredito que X é verdade — desafie e avalie minha hipótese' },
]
const RESEARCH_AUDIENCES: { id: ResearchAudience; label: string }[] = [
  { id: 'academic', label: 'Acadêmica' },
  { id: 'executive', label: 'Executiva' },
  { id: 'public', label: 'Geral / Público' },
]

// ─── Agent toggle ──────────────────────────────────────────────────────────────
function AgentToggle({ persona, selected, onToggle }: { persona: AgentPersona; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
        selected ? 'bg-white border-gray-300 shadow-sm opacity-100' : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-90'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border ${selected ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200'}`}>
        {persona.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${selected ? 'text-gray-800' : 'text-gray-400'}`}>{persona.name}</p>
        <p className="text-xs text-gray-400 truncate">{persona.role}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${selected ? 'bg-brand-500 border-brand-500' : 'border-gray-300'}`} />
    </button>
  )
}

// ─── Chip selector helper ─────────────────────────────────────────────────────
function Chips<T extends string>({
  options, value, onChange, activeClass,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; activeClass: string }) {
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

function GoalSelector<T extends string>({ goals, value, onChange, activeClass }: {
  goals: { id: T; icon: React.ElementType; label: string; desc: string }[]
  value: T
  onChange: (v: T) => void
  activeClass: string
  iconActiveClass: string
}) {
  return (
    <div className="flex flex-col gap-2 mb-6">
      {goals.map(({ id, icon: Icon, label, desc }) => (
        <button key={id} onClick={() => onChange(id)}
          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${value === id ? activeClass : 'bg-white border-gray-200 hover:border-gray-300'}`}
        >
          <div className={`p-1.5 rounded-lg mt-0.5 flex-shrink-0 ${value === id ? 'bg-white/60' : 'bg-gray-100'}`}>
            <Icon size={14} className={value === id ? 'text-current opacity-80' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${value === id ? 'text-current' : 'text-gray-500'}`}>{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
          <div className={`ml-auto mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${value === id ? 'bg-current border-current opacity-80' : 'border-gray-300'}`} />
        </button>
      ))}
    </div>
  )
}

// ─── Fashion shared fields ────────────────────────────────────────────────────
function FashionSharedFields({ config, onChange }: { config: FashionConfig; onChange: (c: FashionConfig) => void }) {
  function set<K extends keyof FashionConfig>(key: K, val: FashionConfig[K]) {
    onChange({ ...config, [key]: val })
  }
  return (
    <>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Varejista alvo <span className="text-red-400">*</span></label>
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
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Estação / Entrega</label>
        <StringChips options={SEASONS} value={config.season} onChange={(v) => set('season', v)} activeClass="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-300" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Faixa de preço</label>
        <StringChips options={PRICE_RANGES} value={config.priceRange} onChange={(v) => set('priceRange', v)} activeClass="bg-fuchsia-50 text-fuchsia-600 border-fuchsia-300" />
      </div>
    </>
  )
}

function FashionEvaluateForm({ config, onChange }: { config: FashionConfig; onChange: (c: FashionConfig) => void }) {
  function set<K extends keyof FashionConfig>(key: K, val: FashionConfig[K]) {
    onChange({ ...config, [key]: val })
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo de coleção</label>
        <div className="grid grid-cols-2 gap-2">
          {(['own', 'licensed'] as const).map((t) => (
            <button key={t} onClick={() => set('collectionType', t)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${config.collectionType === t ? 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >{t === 'own' ? '🏷️ Coleção Própria' : '🤝 Licenciado'}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {config.collectionType === 'licensed' ? 'Nome do Licenciado' : 'Nome da Coleção'} <span className="text-red-400">*</span>
        </label>
        <input className="input"
          placeholder={config.collectionType === 'licensed' ? 'ex: NASA, Disney, Marvel…' : 'ex: Coleção Y2K Revival, Terra & Mar…'}
          value={config.collectionType === 'licensed' ? (config.licensedBrand ?? '') : config.collectionName}
          onChange={(e) => config.collectionType === 'licensed' ? set('licensedBrand', e.target.value) : set('collectionName', e.target.value)}
        />
      </div>
      {config.collectionType === 'licensed' && (
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nome da Linha / Coleção</label>
          <input className="input" placeholder="ex: Coleção NASA × Renner Outono 2026" value={config.collectionName} onChange={(e) => set('collectionName', e.target.value)} />
        </div>
      )}
      <FashionSharedFields config={config} onChange={onChange} />
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
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

function FashionDiscoveryForm({ config, onChange }: { config: FashionConfig; onChange: (c: FashionConfig) => void }) {
  function set<K extends keyof FashionConfig>(key: K, val: FashionConfig[K]) {
    onChange({ ...config, [key]: val })
  }
  const isLicense = config.goal === 'discover_license'
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {isLicense ? 'Qual licenciado está parando de vender?' : 'Qual coleção / linha está caindo?'} <span className="text-red-400">*</span>
        </label>
        <input className="input"
          placeholder={isLicense ? 'ex: Sonic the Hedgehog, Power Rangers, Hello Kitty…' : 'ex: Coleção floral verão 25, Linha básicos premium…'}
          value={config.decliningItem ?? ''} onChange={(e) => set('decliningItem', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Por que está caindo? <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
        <textarea className="input resize-none h-24"
          placeholder={isLicense
            ? 'ex: Sell-through caiu de 85% para 40% nos últimos 2 ciclos, estoque acumulado…'
            : 'ex: Consumidora cansou do estampado, cores fora de tendência, margem apertando…'}
          value={config.decliningReason ?? ''} onChange={(e) => set('decliningReason', e.target.value)}
        />
      </div>
      <FashionSharedFields config={config} onChange={onChange} />
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Restrições ou requisitos <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
        <textarea className="input resize-none h-20"
          placeholder={isLicense
            ? 'ex: Preciso de licença com forte appeal infantil, não posso usar IPs da Disney…'
            : 'ex: Sem estampas (já saturado), deve usar matéria-prima nacional…'}
          value={config.styleNotes} onChange={(e) => set('styleNotes', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Consulting form ──────────────────────────────────────────────────────────
function ConsultingForm({ config, onChange }: { config: ConsultingConfig; onChange: (c: ConsultingConfig) => void }) {
  function set<K extends keyof ConsultingConfig>(key: K, val: ConsultingConfig[K]) {
    onChange({ ...config, [key]: val })
  }
  return (
    <div className="flex flex-col gap-5">
      <GoalSelector
        goals={CONSULTING_GOALS}
        value={config.goal}
        onChange={(v) => set('goal', v)}
        activeClass="bg-blue-50 border-blue-300 text-blue-700"
        iconActiveClass="text-blue-600"
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Empresa / Produto <span className="text-red-400">*</span></label>
          <input className="input" placeholder="ex: Minha startup, Produto X…" value={config.company} onChange={(e) => set('company', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Setor</label>
          <StringChips options={INDUSTRIES} value={config.industry} onChange={(v) => set('industry', v)} activeClass="bg-blue-50 text-blue-600 border-blue-300" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {config.goal === 'decide' ? 'Contexto do problema / decisão' : 'Problema ou oportunidade'} <span className="text-red-400">*</span>
        </label>
        <textarea className="input resize-none h-28"
          placeholder={config.goal === 'decide'
            ? 'Descreva o contexto da decisão: por que é difícil, o que está em jogo, quais as pressões…'
            : 'Descreva o desafio, oportunidade de mercado, ou situação que precisa de análise estratégica…'}
          value={config.problem} onChange={(e) => set('problem', e.target.value)}
        />
      </div>

      {config.goal === 'decide' && (
        <div className="flex flex-col gap-3">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Opções em disputa <span className="text-red-400">*</span></label>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Opção A</p>
            <input className="input" placeholder="ex: Expandir para o mercado europeu agora" value={config.optionA ?? ''} onChange={(e) => set('optionA', e.target.value)} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Opção B</p>
            <input className="input" placeholder="ex: Fortalecer posição no mercado doméstico primeiro" value={config.optionB ?? ''} onChange={(e) => set('optionB', e.target.value)} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Opção C <span className="text-gray-400 font-normal">(opcional)</span></p>
            <input className="input" placeholder="ex: Adquirir um player regional já estabelecido" value={config.optionC ?? ''} onChange={(e) => set('optionC', e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Restrições & contexto adicional <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
        <textarea className="input resize-none h-20"
          placeholder="ex: Orçamento limitado a R$2M, equipe de 40 pessoas, janela de 6 meses, regulação do setor X…"
          value={config.constraints} onChange={(e) => set('constraints', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Social form ──────────────────────────────────────────────────────────────
function SocialForm({ config, onChange }: { config: SocialConfig; onChange: (c: SocialConfig) => void }) {
  function set<K extends keyof SocialConfig>(key: K, val: SocialConfig[K]) {
    onChange({ ...config, [key]: val })
  }
  return (
    <div className="flex flex-col gap-5">
      <GoalSelector
        goals={SOCIAL_GOALS}
        value={config.goal}
        onChange={(v) => set('goal', v)}
        activeClass="bg-pink-50 border-pink-300 text-pink-700"
        iconActiveClass="text-pink-600"
      />

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Plataforma principal</label>
        <StringChips options={SOCIAL_PLATFORMS} value={config.platform} onChange={(v) => set('platform', v)} activeClass="bg-pink-50 text-pink-600 border-pink-300" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {config.goal === 'crisis' ? 'Descreva a crise' : 'O que está sendo lançado / anunciado'} <span className="text-red-400">*</span>
        </label>
        <textarea className="input resize-none h-32"
          placeholder={config.goal === 'crisis'
            ? 'ex: Vazamento de dados de usuários, produto defeituoso que causou dano, declaração polêmica de executivo, campanha que viralizou negativamente…'
            : 'ex: Nova feature de IA que resume e-mails automaticamente. Será opt-in, gratuita para todos, disponível amanhã…'}
          value={config.content} onChange={(e) => set('content', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Público-alvo</label>
          <input className="input" placeholder="ex: Millennials tech-savvy, mães 30-45 anos…" value={config.targetDemo} onChange={(e) => set('targetDemo', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {config.goal === 'crisis' ? 'Objetivo da resposta' : 'Objetivo da campanha'}
          </label>
          <Chips
            options={CAMPAIGN_OBJECTIVES}
            value={config.campaignObjective}
            onChange={(v) => set('campaignObjective', v)}
            activeClass="bg-pink-50 text-pink-600 border-pink-300"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Research form ────────────────────────────────────────────────────────────
function ResearchForm({ config, onChange }: { config: ResearchConfig; onChange: (c: ResearchConfig) => void }) {
  function set<K extends keyof ResearchConfig>(key: K, val: ResearchConfig[K]) {
    onChange({ ...config, [key]: val })
  }
  return (
    <div className="flex flex-col gap-5">
      <GoalSelector
        goals={RESEARCH_GOALS}
        value={config.goal}
        onChange={(v) => set('goal', v)}
        activeClass="bg-purple-50 border-purple-300 text-purple-700"
        iconActiveClass="text-purple-600"
      />

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {config.goal === 'validate' ? 'Hipótese a validar' : 'Pergunta de pesquisa'} <span className="text-red-400">*</span>
        </label>
        <input className="input"
          placeholder={config.goal === 'validate'
            ? 'ex: Acredito que onboarding é o principal motivo de churn nos primeiros 30 dias'
            : 'ex: Quais são os principais drivers de retenção em apps de saúde?'}
          value={config.question} onChange={(e) => set('question', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Domínio / Área</label>
          <StringChips options={RESEARCH_DOMAINS} value={config.domain} onChange={(v) => set('domain', v)} activeClass="bg-purple-50 text-purple-600 border-purple-300" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Audiência dos resultados</label>
          <Chips
            options={RESEARCH_AUDIENCES}
            value={config.audience}
            onChange={(v) => set('audience', v)}
            activeClass="bg-purple-50 text-purple-600 border-purple-300"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          {config.goal === 'validate' ? 'Dados / evidências disponíveis' : 'Dados, feedbacks ou contexto'} <span className="text-red-400">*</span>
        </label>
        <textarea className="input resize-none h-36"
          placeholder={config.goal === 'validate'
            ? 'ex: Analisamos 1.200 churns dos últimos 6 meses. 60% saíram antes do dia 14. O tutorial tem 8 steps e taxa de conclusão de 34%…'
            : 'ex: Analisamos 2.400 respostas de feedback do Q1. Temas principais: atrito no onboarding, preocupações com preço, pedidos de mobile…'}
          value={config.dataContext} onChange={(e) => set('dataContext', e.target.value)}
        />
      </div>
    </div>
  )
}

// ─── Scenario builders ────────────────────────────────────────────────────────
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

function buildConsultingScenario(cc: ConsultingConfig): string {
  const header = cc.goal === 'decide'
    ? 'CONSULTING BRIEF — DECISION SUPPORT'
    : 'CONSULTING BRIEF — STRATEGIC ANALYSIS'

  let body = `${header}

Company / Product: ${cc.company || '(not specified)'}
Industry: ${cc.industry || '(not specified)'}

SITUATION:
${cc.problem || '(not specified)'}
`
  if (cc.goal === 'decide') {
    body += `
OPTIONS IN CONTENTION:
• Option A: ${cc.optionA || '(not specified)'}
• Option B: ${cc.optionB || '(not specified)'}
${cc.optionC ? `• Option C: ${cc.optionC}` : ''}
`
  }

  if (cc.constraints) {
    body += `
CONSTRAINTS & CONTEXT:
${cc.constraints}
`
  }

  body += cc.goal === 'decide'
    ? `\nTASK: Each agent must evaluate the options from their unique perspective (strategy, risk, data, integration, innovation). Weight the pros and cons, identify the key decision criteria, and give a clear recommendation with rationale. At the end, each agent must explicitly state which option they support and why.`
    : `\nTASK: Analyze this situation from your unique perspective. Surface key insights, risks, opportunities, and recommendations. Build on what previous agents have said — agree, challenge, or extend their thinking with new angles.`

  return body
}

function buildSocialScenario(sc: SocialConfig): string {
  const header = sc.goal === 'crisis'
    ? 'SOCIAL BRIEF — PR CRISIS SIMULATION'
    : 'SOCIAL BRIEF — LAUNCH / CAMPAIGN SIMULATION'

  return `${header}

Platform: ${sc.platform || '(not specified)'}
Target audience: ${sc.targetDemo || '(not specified)'}
Objective: ${sc.campaignObjective}

${sc.goal === 'crisis' ? 'CRISIS SITUATION:' : 'ANNOUNCEMENT / CONTENT:'}
${sc.content || '(not specified)'}

TASK: ${sc.goal === 'crisis'
  ? 'Each agent must react to this crisis from their social media persona. How does the public perceive this? What narratives are forming? What should the brand do? The Moderator should assess the overall temperature and suggest a crisis response strategy.'
  : 'Each agent must react to this announcement from their social media persona and perspective. Would they engage? Share? Criticize? What would they post? The Moderator should summarize the overall public reaction and predict campaign performance.'}`
}

function buildResearchScenario(rc: ResearchConfig): string {
  const header = rc.goal === 'validate'
    ? 'RESEARCH BRIEF — HYPOTHESIS VALIDATION'
    : 'RESEARCH BRIEF — INSIGHT SYNTHESIS'

  return `${header}

Domain: ${rc.domain || '(not specified)'}
Target audience for findings: ${rc.audience}
${rc.goal === 'validate' ? `\nHYPOTHESIS TO VALIDATE:\n${rc.question || '(not specified)'}` : `\nRESEARCH QUESTION:\n${rc.question || '(not specified)'}`}

DATA / CONTEXT:
${rc.dataContext || '(not specified)'}

TASK: ${rc.goal === 'validate'
  ? 'Each agent must evaluate this hypothesis from their unique perspective. Is the evidence strong enough? Are there alternative interpretations? What methodology concerns exist? The Synthesizer must deliver a final verdict: Supported / Partially Supported / Rejected, with confidence level and the key reasons.'
  : 'Each agent must analyze this data from their unique perspective. Identify patterns, insights, risks, and opportunities. The Synthesizer must distill a clear "so what" — the 3 most actionable insights from the discussion.'}`
}

// ─── Default configs ──────────────────────────────────────────────────────────
const DEFAULT_FASHION: FashionConfig = { goal: 'evaluate', collectionName: '', collectionType: 'own', licensedBrand: '', styleNotes: '', decliningItem: '', decliningReason: '', retailer: '', targetAge: '', targetGender: '', season: '', priceRange: '' }
const DEFAULT_CONSULTING: ConsultingConfig = { goal: 'debate', company: '', industry: '', problem: '', constraints: '', optionA: '', optionB: '', optionC: '' }
const DEFAULT_SOCIAL: SocialConfig = { goal: 'launch', content: '', platform: 'Twitter/X', targetDemo: '', campaignObjective: 'awareness' }
const DEFAULT_RESEARCH: ResearchConfig = { goal: 'synthesize', question: '', domain: '', audience: 'executive', dataContext: '' }

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewSimulationPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { createSimulation } = useSimulationStore()

  const defaultMode = (params.get('mode') as SimulationMode) || 'consulting'

  const [name, setName] = useState('')
  const [mode, setMode] = useState<SimulationMode>(defaultMode)
  const [fashionConfig, setFashionConfig] = useState<FashionConfig>(DEFAULT_FASHION)
  const [consultingConfig, setConsultingConfig] = useState<ConsultingConfig>(DEFAULT_CONSULTING)
  const [socialConfig, setSocialConfig] = useState<SocialConfig>(DEFAULT_SOCIAL)
  const [researchConfig, setResearchConfig] = useState<ResearchConfig>(DEFAULT_RESEARCH)
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(
    new Set(PERSONAS_BY_MODE[defaultMode].map((p) => p.id)),
  )

  useEffect(() => {
    setSelectedAgentIds(new Set(PERSONAS_BY_MODE[mode].map((p) => p.id)))
  }, [mode])

  function toggleAgent(id: string) {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) }
      else next.add(id)
      return next
    })
  }

  function buildScenario(): string {
    if (mode === 'fashion') return buildFashionScenario(fashionConfig)
    if (mode === 'consulting') return buildConsultingScenario(consultingConfig)
    if (mode === 'social') return buildSocialScenario(socialConfig)
    if (mode === 'research') return buildResearchScenario(researchConfig)
    return ''
  }

  function buildDefaultName(): string {
    if (mode === 'consulting') {
      if (consultingConfig.goal === 'decide') return `Decisão: ${consultingConfig.company || 'Empresa'} — ${new Date().toLocaleDateString()}`
      return `Estratégia: ${consultingConfig.company || 'Empresa'} — ${new Date().toLocaleDateString()}`
    }
    if (mode === 'social') {
      if (socialConfig.goal === 'crisis') return `Crise de PR — ${socialConfig.platform}`
      return `Lançamento — ${socialConfig.platform}`
    }
    if (mode === 'research') {
      return researchConfig.question
        ? `${researchConfig.question.slice(0, 50)}${researchConfig.question.length > 50 ? '…' : ''}`
        : `Research — ${new Date().toLocaleDateString()}`
    }
    if (mode === 'fashion') {
      if (fashionConfig.goal === 'discover_license') return `Descoberta: substituto do ${fashionConfig.decliningItem || 'licenciado'}`
      if (fashionConfig.goal === 'discover_own') return `Descoberta: nova direção para ${fashionConfig.decliningItem || 'coleção'}`
      if (fashionConfig.collectionType === 'licensed' && fashionConfig.licensedBrand) return `${fashionConfig.licensedBrand} × ${fashionConfig.retailer || 'Retail'}`
      return fashionConfig.collectionName || `Fashion — ${new Date().toLocaleDateString()}`
    }
    return `Simulation — ${new Date().toLocaleDateString()}`
  }

  function handleCreate() {
    const agents = PERSONAS_BY_MODE[mode].filter((p) => selectedAgentIds.has(p.id))
    const scenario = buildScenario()
    const sim = createSimulation({
      id: crypto.randomUUID(),
      name: name.trim() || buildDefaultName(),
      mode,
      scenario,
      agents,
      platform: mode === 'social' ? socialConfig.platform : undefined,
      fashionConfig: mode === 'fashion' ? fashionConfig : undefined,
      consultingConfig: mode === 'consulting' ? consultingConfig : undefined,
      socialConfig: mode === 'social' ? socialConfig : undefined,
      researchConfig: mode === 'research' ? researchConfig : undefined,
    })
    navigate(`/simulation/${sim.id}`)
  }

  const isValid = (() => {
    if (mode === 'fashion') {
      if (!fashionConfig.retailer) return false
      if (fashionConfig.goal === 'evaluate') return !!(fashionConfig.collectionName.trim() || fashionConfig.licensedBrand?.trim()) && fashionConfig.styleNotes.trim().length > 5
      return !!(fashionConfig.decliningItem?.trim())
    }
    if (mode === 'consulting') return consultingConfig.company.trim().length > 0 && consultingConfig.problem.trim().length > 10
    if (mode === 'social') return socialConfig.content.trim().length > 10
    if (mode === 'research') return researchConfig.question.trim().length > 5 && researchConfig.dataContext.trim().length > 10
    return false
  })()

  const modeConfig = MODES.find((m) => m.id === mode)!

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Simulation</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your multi-agent swarm</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Simulation Name <span className="text-gray-400 normal-case font-normal">(optional)</span>
          </label>
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

        {/* Mode-specific brief */}
        <div className={`card border p-5 ${modeConfig.bg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${modeConfig.color}`}>
            {mode === 'consulting' && '♟️ Consulting Brief'}
            {mode === 'social' && '📣 Social Brief'}
            {mode === 'research' && '🔬 Research Brief'}
            {mode === 'fashion' && '🧵 Fashion Intelligence'}
          </p>

          {mode === 'consulting' && <ConsultingForm config={consultingConfig} onChange={setConsultingConfig} />}
          {mode === 'social' && <SocialForm config={socialConfig} onChange={setSocialConfig} />}
          {mode === 'research' && <ResearchForm config={researchConfig} onChange={setResearchConfig} />}
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
              {fashionConfig.goal === 'evaluate'
                ? <FashionEvaluateForm config={fashionConfig} onChange={setFashionConfig} />
                : <FashionDiscoveryForm config={fashionConfig} onChange={setFashionConfig} />
              }
            </>
          )}
        </div>

        {/* Agents */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agents</label>
            <span className="text-xs text-gray-400">{selectedAgentIds.size} selected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERSONAS_BY_MODE[mode].map((persona) => (
              <AgentToggle key={persona.id} persona={persona} selected={selectedAgentIds.has(persona.id)} onToggle={() => toggleAgent(persona.id)} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <button onClick={handleCreate} disabled={!isValid || selectedAgentIds.size === 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-40"
        >
          Launch Simulation
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
