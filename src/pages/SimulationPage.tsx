import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Play,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  BarChart2,
} from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useLLMStore } from '@/stores/llmStore'
import { getProvider } from '@/config/llm'
import { streamChat, buildAgentMessages } from '@/services/llm'
import AgentBubble from '@/components/AgentBubble'
import SentimentChart from '@/components/SentimentChart'
import MetricCard from '@/components/MetricCard'
import type { AgentMessage } from '@/types'

function estimateSentiment(text: string, bias: number): number {
  const pos = (text.match(/\b(opportunity|growth|strong|excellent|promising|innovative|effective|success|advantage|positive|benefit|gain|improve|expand)\b/gi) || []).length
  const neg = (text.match(/\b(risk|challenge|concern|problem|fail|difficult|weakness|threat|uncertain|costly|complex|barrier|resist|loss)\b/gi) || []).length
  const score = (pos - neg) / Math.max(pos + neg, 1)
  return Math.max(-1, Math.min(1, score * 0.6 + bias * 0.4))
}

export default function SimulationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getSimulation, addMessage, appendToLastMessage, finalizeMessage, setStatus, setMetrics } =
    useSimulationStore()
  const { selectedProvider } = useLLMStore()

  const sim = id ? getSimulation(id) : undefined
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'debate' | 'metrics'>('debate')
  const bottomRef = useRef<HTMLDivElement>(null)
  const runningRef = useRef(false)

  // Auto-scroll as messages appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sim?.messages.length])

  useEffect(() => {
    if (!sim) return
    if (sim.status === 'idle') runSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!sim) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="text-slate-600" size={32} />
        <p className="text-slate-400">Simulation not found</p>
        <Link to="/" className="btn-secondary">Back to Home</Link>
      </div>
    )
  }

  async function runSimulation() {
    if (!sim || runningRef.current) return
    runningRef.current = true
    setError(null)
    setStatus(sim.id, 'running')

    const provider = getProvider(selectedProvider)
    const previous: { agentName: string; content: string }[] = []

    try {
      for (const agent of sim.agents) {
        // Create placeholder message
        const placeholder: AgentMessage = {
          agentId: agent.id,
          agentName: agent.name,
          agentRole: agent.role,
          agentColor: agent.color,
          agentBgColor: agent.bgColor,
          agentEmoji: agent.emoji,
          content: '',
          isStreaming: true,
          timestamp: Date.now(),
          sentiment: agent.sentimentBias,
        }
        addMessage(sim.id, placeholder)

        const messages = buildAgentMessages(agent.systemPrompt, sim.scenario, previous)
        let fullContent = ''

        for await (const chunk of streamChat(provider, messages)) {
          fullContent += chunk
          appendToLastMessage(sim.id, agent.id, chunk)
        }

        const sentiment = estimateSentiment(fullContent, agent.sentimentBias)
        finalizeMessage(sim.id, agent.id)
        previous.push({ agentName: agent.name, content: fullContent })

        // Update sentiment on the stored message
        useSimulationStore.setState((s) => ({
          simulations: s.simulations.map((sm) =>
            sm.id === sim.id
              ? {
                  ...sm,
                  messages: sm.messages.map((m) =>
                    m.agentId === agent.id ? { ...m, sentiment } : m,
                  ),
                }
              : sm,
          ),
        }))
      }

      // Calculate final metrics
      const msgs = useSimulationStore.getState().getSimulation(sim.id)?.messages ?? []
      const sentiments = msgs.map((m) => m.sentiment)
      const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      const positiveCount = sentiments.filter((s) => s > 0.15).length
      const negativeCount = sentiments.filter((s) => s < -0.15).length
      const neutralCount = sentiments.length - positiveCount - negativeCount
      const variance = sentiments.reduce((a, b) => a + Math.abs(b - avg), 0) / sentiments.length
      const consensusLevel = Math.round(Math.max(0, 1 - variance) * 100)

      // Fashion-specific metrics derived from agent sentiment biases
      const isFashion = sim.mode === 'fashion'
      const forecasterMsg = msgs.find((m) => m.agentId === 'trend_forecaster')
      const buyerMsg = msgs.find((m) => m.agentId === 'retail_buyer')
      const brandMsg = msgs.find((m) => m.agentId === 'brand_strategist')
      const consumerMsg = msgs.find((m) => m.agentId === 'target_consumer')
      const vmMsg = msgs.find((m) => m.agentId === 'visual_merchandiser')
      const auditorMsg = msgs.find((m) => m.agentId === 'sustainability_auditor')

      const trendScore = isFashion && forecasterMsg
        ? Math.round(((forecasterMsg.sentiment + 1) / 2) * 100)
        : undefined

      const sellThroughPrediction = isFashion && buyerMsg && forecasterMsg
        ? Math.round(((buyerMsg.sentiment * 0.6 + forecasterMsg.sentiment * 0.4 + 1) / 2) * 75 + 10)
        : undefined

      const licensingFitScore = isFashion && brandMsg
        ? Math.round(((brandMsg.sentiment + 1) / 2) * 100)
        : undefined

      const viralityScore = isFashion && consumerMsg && vmMsg
        ? (consumerMsg.sentiment + vmMsg.sentiment) / 2
        : null
      const viralityPotential = viralityScore !== null
        ? viralityScore > 0.3 ? 'High' : viralityScore > -0.1 ? 'Medium' : 'Low'
        : undefined

      const sustainabilityRisk = isFashion && auditorMsg
        ? auditorMsg.sentiment < -0.3 ? 'High' : auditorMsg.sentiment < 0.1 ? 'Medium' : 'Low'
        : undefined

      const fashionInsights = isFashion ? [
        trendScore !== undefined
          ? `Trend Score: ${trendScore}/100 — ${trendScore >= 70 ? 'strong trend alignment' : trendScore >= 40 ? 'moderate trend relevance' : 'weak trend positioning'}`
          : null,
        sellThroughPrediction !== undefined
          ? `Sell-Through Prediction: ~${sellThroughPrediction}% at full price`
          : null,
        licensingFitScore !== undefined
          ? `Licensing Fit: ${licensingFitScore}/100 — ${licensingFitScore >= 70 ? 'strong brand alignment' : licensingFitScore >= 40 ? 'moderate fit' : 'questionable fit for retailer'}`
          : null,
        viralityPotential ? `Virality Potential: ${viralityPotential}` : null,
        sustainabilityRisk ? `ESG Risk Level: ${sustainabilityRisk}` : null,
      ].filter(Boolean) as string[] : []

      setMetrics(sim.id, {
        consensusLevel,
        overallSentiment: avg,
        positiveCount,
        negativeCount,
        neutralCount,
        keyInsights: [
          ...fashionInsights,
          `${positiveCount} of ${sentiments.length} agents hold a positive view`,
          `Consensus level: ${consensusLevel}% agreement`,
          avg > 0.2
            ? 'Overall assessment leans positive'
            : avg < -0.2
            ? 'Overall assessment leans negative'
            : 'Assessment is mixed/neutral',
        ],
        trendScore,
        sellThroughPrediction,
        licensingFitScore,
        viralityPotential: viralityPotential as 'Low' | 'Medium' | 'High' | undefined,
        sustainabilityRisk: sustainabilityRisk as 'Low' | 'Medium' | 'High' | undefined,
      })

      setStatus(sim.id, 'completed')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setStatus(sim.id, 'error')
    } finally {
      runningRef.current = false
    }
  }

  const isRunning = sim.status === 'running'
  const isCompleted = sim.status === 'completed'
  const isError = sim.status === 'error'

  const sentimentLabel =
    !sim.metrics
      ? '–'
      : sim.metrics.overallSentiment > 0.2
      ? 'Positive'
      : sim.metrics.overallSentiment < -0.2
      ? 'Negative'
      : 'Mixed'

  const sentimentAccent =
    !sim.metrics
      ? 'slate'
      : sim.metrics.overallSentiment > 0.2
      ? 'green'
      : sim.metrics.overallSentiment < -0.2
      ? 'red'
      : 'amber'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate('/')} className="btn-ghost mt-0.5 p-1.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-100 truncate">{sim.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500 capitalize">{sim.mode}</span>
            {sim.platform && (
              <>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-500">{sim.platform}</span>
              </>
            )}
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">{sim.agents.length} agents</span>
          </div>
        </div>

        {/* Status */}
        {isRunning && (
          <div className="flex items-center gap-1.5 badge-amber">
            <Loader2 size={11} className="animate-spin" />
            Running
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center gap-1.5 badge-green">
            <CheckCircle size={11} />
            Done
          </div>
        )}
        {isError && (
          <button
            onClick={() => {
              setStatus(sim.id, 'idle')
              runSimulation()
            }}
            className="flex items-center gap-1.5 badge-red cursor-pointer"
          >
            <RefreshCw size={11} />
            Retry
          </button>
        )}
        {sim.status === 'idle' && (
          <button onClick={runSimulation} className="btn-primary flex items-center gap-1.5">
            <Play size={14} />
            Start
          </button>
        )}
      </div>

      {/* Scenario — fashion shows structured brief, others show raw text */}
      {sim.mode === 'fashion' && sim.fashionConfig ? (
        <div className="card border-fuchsia-500/20 bg-fuchsia-500/5 p-4 mb-6">
          {/* Discovery badge */}
          {(sim.fashionConfig.goal === 'discover_license' || sim.fashionConfig.goal === 'discover_own') ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="badge bg-orange-500/15 text-orange-400 border-orange-500/20">
                  🔄 Modo Descoberta — {sim.fashionConfig.goal === 'discover_license' ? 'Próximo Licenciado' : 'Nova Direção'}
                </span>
              </div>
              <div className="flex flex-col gap-2 text-xs mb-3">
                {sim.fashionConfig.decliningItem && (
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 flex-shrink-0">📉 Em queda:</span>
                    <span className="text-slate-200 font-semibold">{sim.fashionConfig.decliningItem}</span>
                  </div>
                )}
                {sim.fashionConfig.retailer && (
                  <div><span className="text-slate-500">Varejista:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.retailer}</span></div>
                )}
                {sim.fashionConfig.targetAge && (
                  <div><span className="text-slate-500">Público:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.targetAge} · {sim.fashionConfig.targetGender}</span></div>
                )}
                {sim.fashionConfig.priceRange && (
                  <div><span className="text-slate-500">Preço:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.priceRange}</span></div>
                )}
              </div>
              {sim.fashionConfig.decliningReason && (
                <div className="border-t border-fuchsia-500/10 pt-3">
                  <p className="text-xs text-slate-500 mb-1">Por que está caindo:</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{sim.fashionConfig.decliningReason}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider mb-3">🧵 Fashion Brief</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-3">
                {sim.fashionConfig.collectionType === 'licensed' && sim.fashionConfig.licensedBrand && (
                  <div><span className="text-slate-500">Licenciado:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.licensedBrand}</span></div>
                )}
                {sim.fashionConfig.collectionName && (
                  <div><span className="text-slate-500">Coleção:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.collectionName}</span></div>
                )}
                {sim.fashionConfig.retailer && (
                  <div><span className="text-slate-500">Varejista:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.retailer}</span></div>
                )}
                {sim.fashionConfig.season && (
                  <div><span className="text-slate-500">Estação:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.season}</span></div>
                )}
                {sim.fashionConfig.targetAge && (
                  <div><span className="text-slate-500">Público:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.targetAge} · {sim.fashionConfig.targetGender}</span></div>
                )}
                {sim.fashionConfig.priceRange && (
                  <div><span className="text-slate-500">Preço:</span> <span className="text-slate-200 font-medium ml-1">{sim.fashionConfig.priceRange}</span></div>
                )}
              </div>
              {sim.fashionConfig.styleNotes && (
                <p className="text-xs text-slate-400 leading-relaxed border-t border-fuchsia-500/10 pt-3">
                  {sim.fashionConfig.styleNotes}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Scenario</p>
          <p className="text-sm text-slate-300 leading-relaxed">{sim.scenario}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-500/20 bg-red-500/5 p-4 mb-6 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Simulation Error</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs (show after first message) */}
      {sim.messages.length > 0 && (
        <div className="flex gap-1 mb-4 p-1 card rounded-xl">
          <button
            onClick={() => setTab('debate')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              tab === 'debate'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Debate ({sim.messages.length})
          </button>
          <button
            onClick={() => setTab('metrics')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
              tab === 'metrics'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <BarChart2 size={12} />
            Metrics
          </button>
        </div>
      )}

      {/* Debate Tab */}
      {tab === 'debate' && (
        <div className="flex flex-col gap-4">
          {sim.messages.length === 0 && sim.status === 'idle' && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Play size={28} className="text-slate-700 mb-3" />
              <p className="text-slate-400 font-medium">Ready to launch</p>
              <p className="text-slate-600 text-sm mt-1">Click Start to begin the agent debate</p>
            </div>
          )}

          {sim.messages.map((msg, i) => (
            <AgentBubble key={`${msg.agentId}-${i}`} message={msg} />
          ))}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Metrics Tab */}
      {tab === 'metrics' && sim.metrics && (
        <div className="flex flex-col gap-4">

          {/* Fashion-specific scorecard */}
          {sim.mode === 'fashion' && (
            <div className="card border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
              <p className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider mb-3">
                🧵 Fashion Intelligence Scorecard
              </p>
              <div className="grid grid-cols-2 gap-3">
                {sim.metrics.trendScore !== undefined && (
                  <div className="card p-3">
                    <p className="text-xs text-slate-500 mb-1">Trend Score</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-fuchsia-400">{sim.metrics.trendScore}</span>
                      <span className="text-xs text-slate-500 mb-1">/100</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-fuchsia-500 rounded-full"
                        style={{ width: `${sim.metrics.trendScore}%` }}
                      />
                    </div>
                  </div>
                )}
                {sim.metrics.sellThroughPrediction !== undefined && (
                  <div className="card p-3">
                    <p className="text-xs text-slate-500 mb-1">Sell-Through Est.</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-emerald-400">~{sim.metrics.sellThroughPrediction}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${sim.metrics.sellThroughPrediction}%` }}
                      />
                    </div>
                  </div>
                )}
                {sim.metrics.licensingFitScore !== undefined && (
                  <div className="card p-3">
                    <p className="text-xs text-slate-500 mb-1">Licensing Fit</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-violet-400">{sim.metrics.licensingFitScore}</span>
                      <span className="text-xs text-slate-500 mb-1">/100</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${sim.metrics.licensingFitScore}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="card p-3 flex flex-col gap-2">
                  {sim.metrics.viralityPotential && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Virality</span>
                      <span className={`text-xs font-bold ${
                        sim.metrics.viralityPotential === 'High' ? 'text-rose-400'
                        : sim.metrics.viralityPotential === 'Medium' ? 'text-amber-400'
                        : 'text-slate-500'
                      }`}>{sim.metrics.viralityPotential}</span>
                    </div>
                  )}
                  {sim.metrics.sustainabilityRisk && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">ESG Risk</span>
                      <span className={`text-xs font-bold ${
                        sim.metrics.sustainabilityRisk === 'High' ? 'text-red-400'
                        : sim.metrics.sustainabilityRisk === 'Medium' ? 'text-amber-400'
                        : 'text-teal-400'
                      }`}>{sim.metrics.sustainabilityRisk}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Overall Sentiment"
              value={sentimentLabel}
              sub={`Score: ${sim.metrics.overallSentiment.toFixed(2)}`}
              accent={sentimentAccent as 'green' | 'red' | 'amber'}
              icon={sim.metrics.overallSentiment > 0 ? '↑' : '↓'}
            />
            <MetricCard
              label="Consensus"
              value={`${sim.metrics.consensusLevel}%`}
              sub="agent agreement"
              accent="blue"
              icon="⚖"
            />
            <MetricCard
              label="Positive Agents"
              value={sim.metrics.positiveCount}
              sub={`of ${sim.messages.length} total`}
              accent="green"
              icon="✓"
            />
            <MetricCard
              label="Critical Agents"
              value={sim.metrics.negativeCount}
              sub={`of ${sim.messages.length} total`}
              accent="red"
              icon="⚠"
            />
          </div>

          <SentimentChart messages={sim.messages} />

          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Key Insights
            </p>
            <ul className="flex flex-col gap-2">
              {sim.metrics.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-brand-400 mt-0.5 flex-shrink-0">→</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          {/* Agent breakdown */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Agent Breakdown
            </p>
            <div className="flex flex-col gap-2">
              {sim.messages.map((msg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base w-6 text-center">{msg.agentEmoji}</span>
                  <span className={`text-xs font-medium w-28 flex-shrink-0 ${msg.agentColor}`}>
                    {msg.agentName.replace('The ', '')}
                  </span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        msg.sentiment > 0.15
                          ? 'bg-green-500'
                          : msg.sentiment < -0.15
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.abs(msg.sentiment) * 100}%`,
                        marginLeft: msg.sentiment < 0 ? 'auto' : undefined,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">
                    {msg.sentiment > 0 ? '+' : ''}{msg.sentiment.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'metrics' && !sim.metrics && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <BarChart2 size={28} className="text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">Metrics available after completion</p>
        </div>
      )}
    </div>
  )
}
