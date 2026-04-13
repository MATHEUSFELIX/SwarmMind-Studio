import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Play, ArrowLeft, Loader2, CheckCircle, AlertTriangle, RefreshCw,
  BarChart2, GitFork, Download, Copy, PlusCircle, GitCompare, Check, Network,
} from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import { useLLMStore } from '@/stores/llmStore'
import { getProvider } from '@/config/llm'
import {
  streamChat,
  buildOpeningMessages, buildCrossExamMessages, buildFinalVerdictMessages, buildAgentMessages,
  parseScore, parseRelations,
} from '@/services/llm'
import AgentBubble from '@/components/AgentBubble'
import AgentGraph from '@/components/AgentGraph'
import SentimentChart from '@/components/SentimentChart'
import MetricCard from '@/components/MetricCard'
import { copyReport, downloadReport } from '@/utils/export'
import type { AgentMessage, AgentRelation } from '@/types'

function estimateSentiment(text: string, bias: number): number {
  const pos = (text.match(/\b(opportunity|growth|strong|excellent|promising|innovative|effective|success|advantage|positive|benefit|gain|improve|expand|recommend|support|agree|clear|viable|confidence|valid|evidence)\b/gi) || []).length
  const neg = (text.match(/\b(risk|challenge|concern|problem|fail|difficult|weakness|threat|uncertain|costly|complex|barrier|resist|loss|reject|flawed|insufficient|weak|contradict|gap|crisis|decline)\b/gi) || []).length
  const score = (pos - neg) / Math.max(pos + neg, 1)
  return Math.max(-1, Math.min(1, score * 0.6 + bias * 0.4))
}

function getRoundLabel(round: number, total: number): string {
  if (round === 1) return 'Opening Positions'
  if (round === total) return 'Final Verdicts'
  return `Discussion — Round ${round}`
}

export default function SimulationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    getSimulation, addMessage, appendToLastMessage, finalizeMessage,
    setStatus, setMetrics, setRound, injectContext, forkSimulation,
  } = useSimulationStore()
  const { selectedProvider } = useLLMStore()

  const sim = id ? getSimulation(id) : undefined
  const [error, setError]           = useState<string | null>(null)
  const [tab, setTab]               = useState<'debate' | 'metrics' | 'graph'>('debate')
  const [injectText, setInjectText] = useState('')
  const [showInject, setShowInject] = useState(false)
  const [copied, setCopied]         = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const runningRef = useRef(false)

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
        <AlertTriangle className="text-gray-300" size={32} />
        <p className="text-gray-500">Simulation not found</p>
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
    const totalRounds = sim.rounds ?? 1

    // Build agent lookup map for relation parsing
    const agentMap = Object.fromEntries(sim.agents.map((a) => [a.id, a.name]))

    // Position summaries: agentId → short summary of their previous-round stance
    const positionSummaries = new Map<string, string>()

    try {
      for (let round = 1; round <= totalRounds; round++) {
        setRound(sim.id, round)

        const previous: { agentName: string; content: string; round: number }[] = []
        const existingMsgs = useSimulationStore.getState().getSimulation(sim.id)?.messages ?? []
        const prevRoundMsgs = existingMsgs.filter((m) => m.round < round)
        prevRoundMsgs.forEach((m) => previous.push({ agentName: m.agentName, content: m.content, round: m.round }))

        const roundPrevious: { agentName: string; content: string }[] = []
        const injectedContexts = useSimulationStore.getState().getSimulation(sim.id)?.injectedContexts ?? []

        for (const agent of sim.agents) {
          const otherAgents = sim.agents.filter((a) => a.id !== agent.id).map((a) => ({ id: a.id, name: a.name }))
          const myPosSummary = positionSummaries.get(agent.id)

          const placeholder: AgentMessage = {
            agentId: agent.id, agentName: agent.name, agentRole: agent.role,
            agentColor: agent.color, agentBgColor: agent.bgColor, agentEmoji: agent.emoji,
            content: '', isStreaming: true, timestamp: Date.now(),
            sentiment: agent.sentimentBias, round,
          }
          addMessage(sim.id, placeholder)

          let messages
          const isFinalRound = round === totalRounds

          if (totalRounds === 1) {
            messages = buildAgentMessages(agent.systemPrompt, sim.scenario, roundPrevious, injectedContexts)
          } else if (round === 1) {
            messages = buildOpeningMessages(agent.systemPrompt, sim.scenario, roundPrevious, injectedContexts)
          } else if (isFinalRound) {
            messages = buildFinalVerdictMessages(agent.systemPrompt, sim.scenario, previous, injectedContexts, myPosSummary, otherAgents)
          } else {
            const r1 = previous.filter((m) => m.round === 1)
            messages = buildCrossExamMessages(agent.systemPrompt, sim.scenario, r1, roundPrevious, injectedContexts, myPosSummary, otherAgents)
          }

          let fullContent = ''
          for await (const chunk of streamChat(provider, messages)) {
            fullContent += chunk
            appendToLastMessage(sim.id, agent.id, chunk)
          }

          // Parse score (final round) → relations (round 2+) → clean content
          const { clean: afterScore, score } = isFinalRound ? parseScore(fullContent) : { clean: fullContent, score: undefined }
          const { clean, relations } = round > 1 ? parseRelations(afterScore, agentMap) : { clean: afterScore, relations: [] as AgentRelation[] }

          const sentiment = estimateSentiment(clean, agent.sentimentBias)
          finalizeMessage(sim.id, agent.id)
          roundPrevious.push({ agentName: agent.name, content: clean })
          previous.push({ agentName: agent.name, content: clean, round })

          // Store position summary for next round coherence
          positionSummaries.set(agent.id, clean.replace(/\n+/g, ' ').trim().slice(0, 280))

          // Update message with clean content + score + relations + sentiment
          useSimulationStore.setState((s) => ({
            simulations: s.simulations.map((sm) =>
              sm.id !== sim.id ? sm : {
                ...sm,
                messages: sm.messages.map((m) =>
                  m.agentId === agent.id && m.round === round
                    ? { ...m, sentiment, content: clean, score: score ?? m.score, relations: relations.length ? relations : m.relations }
                    : m,
                ),
              },
            ),
          }))
        }
      }

      // ── Compute metrics ──────────────────────────────────────────────────────
      const msgs = useSimulationStore.getState().getSimulation(sim.id)?.messages ?? []
      const sentiments = msgs.map((m) => m.sentiment)
      const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      const positiveCount = sentiments.filter((s) => s > 0.15).length
      const negativeCount = sentiments.filter((s) => s < -0.15).length
      const neutralCount  = sentiments.length - positiveCount - negativeCount
      const variance = sentiments.reduce((a, b) => a + Math.abs(b - avg), 0) / sentiments.length
      const consensusLevel = Math.round(Math.max(0, 1 - variance) * 100)

      // Consensus evolution per round
      const totalRoundsActual = sim.rounds ?? 1
      const consensusEvolution = Array.from({ length: totalRoundsActual }, (_, i) => {
        const roundMsgs = msgs.filter((m) => m.round === i + 1)
        if (!roundMsgs.length) return 0
        const rAvg = roundMsgs.reduce((a, m) => a + m.sentiment, 0) / roundMsgs.length
        const rVar = roundMsgs.reduce((a, m) => a + Math.abs(m.sentiment - rAvg), 0) / roundMsgs.length
        return Math.round(Math.max(0, 1 - rVar) * 100)
      })

      // ── Mode-specific metrics ────────────────────────────────────────────────
      const scoreToLabel = (s: number, hi = 0.3, lo = -0.1): 'High' | 'Medium' | 'Low' =>
        s > hi ? 'High' : s > lo ? 'Medium' : 'Low'

      // Fashion
      const isFashion   = sim.mode === 'fashion'
      const forecasterMsg = msgs.find((m) => m.agentId === 'trend_forecaster')
      const buyerMsg      = msgs.find((m) => m.agentId === 'retail_buyer')
      const brandMsg      = msgs.find((m) => m.agentId === 'brand_strategist')
      const consumerMsg   = msgs.find((m) => m.agentId === 'target_consumer')
      const vmMsg         = msgs.find((m) => m.agentId === 'visual_merchandiser')
      const auditorMsg    = msgs.find((m) => m.agentId === 'sustainability_auditor')
      const trendScore          = isFashion && forecasterMsg ? Math.round(((forecasterMsg.sentiment + 1) / 2) * 100) : undefined
      const sellThroughPrediction = isFashion && buyerMsg && forecasterMsg ? Math.round(((buyerMsg.sentiment * 0.6 + forecasterMsg.sentiment * 0.4 + 1) / 2) * 75 + 10) : undefined
      const licensingFitScore   = isFashion && brandMsg ? Math.round(((brandMsg.sentiment + 1) / 2) * 100) : undefined
      const viralityRaw         = isFashion && consumerMsg && vmMsg ? (consumerMsg.sentiment + vmMsg.sentiment) / 2 : null
      const viralityPotential   = viralityRaw !== null ? scoreToLabel(viralityRaw, 0.3, -0.1) as 'Low' | 'Medium' | 'High' : undefined
      const sustainabilityRisk  = isFashion && auditorMsg ? (auditorMsg.sentiment < -0.3 ? 'High' : auditorMsg.sentiment < 0.1 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low' : undefined

      // Consulting
      const isConsulting = sim.mode === 'consulting'
      const skepticMsg   = msgs.find((m) => m.agentId === 'skeptic')
      const analystMsg   = msgs.find((m) => m.agentId === 'analyst')
      const strategistMsg = msgs.find((m) => m.agentId === 'strategist')
      const innovatorMsg = msgs.find((m) => m.agentId === 'innovator')
      const mediatorMsg  = msgs.find((m) => m.agentId === 'mediator')
      const riskLevel    = isConsulting && skepticMsg ? (skepticMsg.sentiment < -0.4 ? 'High' : skepticMsg.sentiment < 0 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low' : undefined
      const complexRaw   = isConsulting && analystMsg ? -(analystMsg.sentiment * 0.5 + (skepticMsg?.sentiment ?? 0) * 0.5) : null
      const implementationComplexity = complexRaw !== null ? (complexRaw > 0.2 ? 'High' : complexRaw > -0.1 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low' : undefined
      const decisionScore = isConsulting && sim.consultingConfig?.goal === 'decide' && strategistMsg && mediatorMsg
        ? Math.round(((strategistMsg.sentiment * 0.4 + mediatorMsg.sentiment * 0.4 + (innovatorMsg?.sentiment ?? 0) * 0.2 + 1) / 2) * 100) : undefined

      // Social
      const isSocial     = sim.mode === 'social'
      const enthusiastMsg = msgs.find((m) => m.agentId === 'enthusiast')
      const influencerMsg = msgs.find((m) => m.agentId === 'influencer')
      const criticMsg     = msgs.find((m) => m.agentId === 'critic')
      const moderatorMsg  = msgs.find((m) => m.agentId === 'moderator')
      const viralityScore = isSocial && enthusiastMsg && influencerMsg
        ? Math.round(((enthusiastMsg.sentiment + influencerMsg.sentiment) / 2 + 1) / 2 * 100) : undefined
      const controversyIndex = isSocial && sentiments.length >= 2
        ? Math.round((Math.max(...sentiments) - Math.min(...sentiments)) / 2 * 100) : undefined
      const platformFit   = isSocial && moderatorMsg ? scoreToLabel(moderatorMsg.sentiment, 0.2, -0.1) as 'Low' | 'Medium' | 'High' : undefined

      // Research
      const isResearch    = sim.mode === 'research'
      const academicMsg   = msgs.find((m) => m.agentId === 'academic')
      const practitionerMsg = msgs.find((m) => m.agentId === 'practitioner')
      const contrainMsg   = msgs.find((m) => m.agentId === 'contrarian')
      const synthesizerMsg = msgs.find((m) => m.agentId === 'synthesizer')
      const evidenceStrength = isResearch && academicMsg ? Math.round(((academicMsg.sentiment + 1) / 2) * 100) : undefined
      const practicalApplicability = isResearch && practitionerMsg ? scoreToLabel(practitionerMsg.sentiment, 0.2, -0.1) as 'Low' | 'Medium' | 'High' : undefined
      const researchGapScore = isResearch && contrainMsg ? Math.round(((-contrainMsg.sentiment + 1) / 2) * 100) : undefined

      // Build key insights
      const fashionInsights = isFashion ? [
        trendScore !== undefined ? `Trend Score: ${trendScore}/100` : null,
        sellThroughPrediction !== undefined ? `Sell-Through: ~${sellThroughPrediction}%` : null,
        licensingFitScore !== undefined ? `Licensing Fit: ${licensingFitScore}/100` : null,
        viralityPotential ? `Virality: ${viralityPotential}` : null,
        sustainabilityRisk ? `ESG Risk: ${sustainabilityRisk}` : null,
      ].filter(Boolean) as string[] : []

      const consultingInsights = isConsulting ? [
        riskLevel ? `Risk Level: ${riskLevel}` : null,
        implementationComplexity ? `Complexity: ${implementationComplexity}` : null,
        decisionScore !== undefined ? `Decision Confidence: ${decisionScore}/100` : null,
      ].filter(Boolean) as string[] : []

      const socialInsights = isSocial ? [
        viralityScore !== undefined ? `Virality Score: ${viralityScore}/100` : null,
        controversyIndex !== undefined ? `Controversy: ${controversyIndex}/100` : null,
        platformFit ? `Platform Fit: ${platformFit}` : null,
        criticMsg && criticMsg.sentiment < -0.4 ? 'Strong criticism detected — prepare response' : null,
      ].filter(Boolean) as string[] : []

      const researchInsights = isResearch ? [
        evidenceStrength !== undefined ? `Evidence Strength: ${evidenceStrength}/100` : null,
        practicalApplicability ? `Applicability: ${practicalApplicability}` : null,
        researchGapScore !== undefined ? `Research Gap: ${researchGapScore}/100` : null,
        isResearch && synthesizerMsg ? `Synthesizer verdict: ${synthesizerMsg.sentiment > 0.3 ? 'Supported' : synthesizerMsg.sentiment > -0.1 ? 'Partially Supported' : 'Rejected'}` : null,
      ].filter(Boolean) as string[] : []

      // Score summary from agents (if final round)
      const scoredAgents = msgs.filter((m) => m.score)
      const scoreInsights = scoredAgents.length > 0
        ? [
            `Average agent score: ${(scoredAgents.reduce((a, m) => a + (m.score?.value ?? 5), 0) / scoredAgents.length).toFixed(1)}/10`,
            ...scoredAgents.filter((m) => m.score!.confidence === 'high').map((m) => `${m.agentEmoji} ${m.agentName.replace('The ', '')}: "${m.score!.keyPoint}"`).slice(0, 3),
          ]
        : []

      // Consensus evolution note
      const evolutionInsight = consensusEvolution.length > 1
        ? [`Consensus evolved: ${consensusEvolution.join('% → ')}%`]
        : []

      setMetrics(sim.id, {
        consensusLevel, overallSentiment: avg, positiveCount, negativeCount, neutralCount,
        consensusEvolution,
        keyInsights: [
          ...fashionInsights, ...consultingInsights, ...socialInsights, ...researchInsights,
          ...scoreInsights, ...evolutionInsight,
          `${positiveCount} of ${sentiments.length} agents hold a positive view`,
          `Consensus: ${consensusLevel}%`,
          avg > 0.2 ? 'Overall leans positive' : avg < -0.2 ? 'Overall leans negative' : 'Mixed/neutral assessment',
        ],
        trendScore, sellThroughPrediction, licensingFitScore, viralityPotential, sustainabilityRisk,
        riskLevel, implementationComplexity, decisionScore,
        viralityScore, controversyIndex, platformFit,
        evidenceStrength, practicalApplicability, researchGapScore,
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

  function handleInject() {
    if (!sim || !injectText.trim()) return
    injectContext(sim.id, injectText.trim())
    setInjectText('')
    setShowInject(false)
  }

  function handleFork() {
    if (!sim) return
    const forked = forkSimulation(sim.id)
    navigate(`/simulation/${forked.id}`)
  }

  function handleCopy() {
    if (!sim) return
    copyReport(sim)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isRunning   = sim.status === 'running'
  const isCompleted = sim.status === 'completed'
  const isError     = sim.status === 'error'

  const sentimentLabel  = !sim.metrics ? '–' : sim.metrics.overallSentiment > 0.2 ? 'Positive' : sim.metrics.overallSentiment < -0.2 ? 'Negative' : 'Mixed'
  const sentimentAccent = !sim.metrics ? 'slate' : sim.metrics.overallSentiment > 0.2 ? 'green' : sim.metrics.overallSentiment < -0.2 ? 'red' : 'amber'

  // Group messages by round
  const messagesByRound: Map<number, AgentMessage[]> = new Map()
  sim.messages.forEach((m) => {
    if (!messagesByRound.has(m.round)) messagesByRound.set(m.round, [])
    messagesByRound.get(m.round)!.push(m)
  })

  // ── Brief card ───────────────────────────────────────────────────────────────
  function renderBriefCard() {
    if (sim!.mode === 'fashion' && sim!.fashionConfig) {
      const fc = sim!.fashionConfig
      const isDiscovery = fc.goal === 'discover_license' || fc.goal === 'discover_own'
      return (
        <div className="card border-fuchsia-200 bg-fuchsia-50/50 p-4 mb-6">
          {isDiscovery ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="badge bg-orange-50 text-orange-500 border-orange-200">🔄 Modo Descoberta — {fc.goal === 'discover_license' ? 'Próximo Licenciado' : 'Nova Direção'}</span>
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                {fc.decliningItem && <div><span className="text-gray-500">📉 Em queda:</span> <span className="text-gray-800 font-semibold ml-1">{fc.decliningItem}</span></div>}
                {fc.retailer && <div><span className="text-gray-500">Varejista:</span> <span className="text-gray-800 font-medium ml-1">{fc.retailer}</span></div>}
                {fc.targetAge && <div><span className="text-gray-500">Público:</span> <span className="text-gray-800 font-medium ml-1">{fc.targetAge} · {fc.targetGender}</span></div>}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-fuchsia-500 uppercase tracking-wider mb-3">🧵 Fashion Brief</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {fc.licensedBrand && <div><span className="text-gray-500">Licenciado:</span> <span className="text-gray-800 font-medium ml-1">{fc.licensedBrand}</span></div>}
                {fc.collectionName && <div><span className="text-gray-500">Coleção:</span> <span className="text-gray-800 font-medium ml-1">{fc.collectionName}</span></div>}
                {fc.retailer && <div><span className="text-gray-500">Varejista:</span> <span className="text-gray-800 font-medium ml-1">{fc.retailer}</span></div>}
                {fc.season && <div><span className="text-gray-500">Estação:</span> <span className="text-gray-800 font-medium ml-1">{fc.season}</span></div>}
              </div>
            </>
          )}
        </div>
      )
    }

    if (sim!.mode === 'consulting' && sim!.consultingConfig) {
      const cc = sim!.consultingConfig
      return (
        <div className="card border-blue-200 bg-blue-50/40 p-4 mb-6">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">{cc.goal === 'decide' ? '⚖️ Decisão Travada' : '♟️ Análise Estratégica'}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {cc.company && <div><span className="text-gray-500">Empresa:</span> <span className="text-gray-800 font-medium ml-1">{cc.company}</span></div>}
            {cc.industry && <div><span className="text-gray-500">Setor:</span> <span className="text-gray-800 font-medium ml-1">{cc.industry}</span></div>}
          </div>
          {cc.goal === 'decide' && (cc.optionA || cc.optionB) && (
            <div className="mt-2 flex flex-col gap-0.5 text-xs border-t border-blue-100 pt-2">
              {cc.optionA && <div><span className="text-gray-500">A:</span> <span className="text-gray-700 ml-1">{cc.optionA}</span></div>}
              {cc.optionB && <div><span className="text-gray-500">B:</span> <span className="text-gray-700 ml-1">{cc.optionB}</span></div>}
              {cc.optionC && <div><span className="text-gray-500">C:</span> <span className="text-gray-700 ml-1">{cc.optionC}</span></div>}
            </div>
          )}
        </div>
      )
    }

    if (sim!.mode === 'social' && sim!.socialConfig) {
      const sc = sim!.socialConfig
      return (
        <div className="card border-pink-200 bg-pink-50/40 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`badge text-xs border ${sc.goal === 'crisis' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-pink-50 text-pink-500 border-pink-200'}`}>
              {sc.goal === 'crisis' ? '🚨 Crise' : '📣 Lançamento'} · {sc.platform}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{sc.content.slice(0, 160)}{sc.content.length > 160 ? '…' : ''}</p>
        </div>
      )
    }

    if (sim!.mode === 'research' && sim!.researchConfig) {
      const rc = sim!.researchConfig
      return (
        <div className="card border-purple-200 bg-purple-50/40 p-4 mb-6">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">{rc.goal === 'validate' ? '🔬 Validação de Hipótese' : '🧬 Síntese de Pesquisa'}</p>
          <p className="text-xs text-gray-700 font-medium">{rc.question}</p>
          <div className="flex gap-3 text-xs text-gray-400 mt-1.5">
            {rc.domain && <span>📂 {rc.domain}</span>}
            <span>👥 {rc.audience === 'academic' ? 'Acadêmica' : rc.audience === 'executive' ? 'Executiva' : 'Geral'}</span>
          </div>
        </div>
      )
    }

    return (
      <div className="card p-4 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scenario</p>
        <p className="text-sm text-gray-600 leading-relaxed">{sim!.scenario.slice(0, 300)}{sim!.scenario.length > 300 ? '…' : ''}</p>
      </div>
    )
  }

  // ── Mode scorecard ────────────────────────────────────────────────────────────
  function renderModeScorecard() {
    if (!sim!.metrics) return null
    const m = sim!.metrics

    if (sim!.mode === 'fashion') return (
      <div className="card border-fuchsia-200 bg-fuchsia-50/40 p-4">
        <p className="text-xs font-semibold text-fuchsia-500 uppercase tracking-wider mb-3">🧵 Fashion Intelligence Scorecard</p>
        <div className="grid grid-cols-2 gap-3">
          {m.trendScore !== undefined && <ScoreBar label="Trend Score" value={m.trendScore} color="fuchsia" unit="/100" />}
          {m.sellThroughPrediction !== undefined && <ScoreBar label="Sell-Through Est." value={m.sellThroughPrediction} color="emerald" unit="%" prefix="~" />}
          {m.licensingFitScore !== undefined && <ScoreBar label="Licensing Fit" value={m.licensingFitScore} color="violet" unit="/100" />}
          <div className="card p-3 flex flex-col gap-2">
            {m.viralityPotential && <LevelRow label="Virality" value={m.viralityPotential} />}
            {m.sustainabilityRisk && <LevelRow label="ESG Risk" value={m.sustainabilityRisk} invert />}
          </div>
        </div>
      </div>
    )

    if (sim!.mode === 'consulting') return (
      <div className="card border-blue-200 bg-blue-50/40 p-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">{sim!.consultingConfig?.goal === 'decide' ? '⚖️ Decision Scorecard' : '♟️ Strategic Analysis Scorecard'}</p>
        <div className="grid grid-cols-2 gap-3">
          {m.decisionScore !== undefined && <ScoreBar label="Decision Confidence" value={m.decisionScore} color="blue" unit="/100" />}
          <div className="card p-3 flex flex-col gap-2">
            {m.riskLevel && <LevelRow label="Risk Level" value={m.riskLevel} invert />}
            {m.implementationComplexity && <LevelRow label="Complexity" value={m.implementationComplexity} invert />}
          </div>
        </div>
      </div>
    )

    if (sim!.mode === 'social') return (
      <div className="card border-pink-200 bg-pink-50/40 p-4">
        <p className="text-xs font-semibold text-pink-600 uppercase tracking-wider mb-3">{sim!.socialConfig?.goal === 'crisis' ? '🚨 Crisis Scorecard' : '📣 Campaign Scorecard'}</p>
        <div className="grid grid-cols-2 gap-3">
          {m.viralityScore !== undefined && <ScoreBar label={sim!.socialConfig?.goal === 'crisis' ? 'Crisis Spread' : 'Virality Score'} value={m.viralityScore} color="pink" unit="/100" />}
          {m.controversyIndex !== undefined && <ScoreBar label="Controversy" value={m.controversyIndex} color={m.controversyIndex >= 60 ? 'red' : m.controversyIndex >= 30 ? 'amber' : 'green'} unit="/100" />}
          {m.platformFit && <div className="card p-3 flex items-center justify-between"><span className="text-xs text-gray-500">Platform Fit</span><LevelBadge value={m.platformFit} /></div>}
        </div>
      </div>
    )

    if (sim!.mode === 'research') return (
      <div className="card border-purple-200 bg-purple-50/40 p-4">
        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">{sim!.researchConfig?.goal === 'validate' ? '🔬 Hypothesis Verdict' : '🧬 Research Scorecard'}</p>
        <div className="grid grid-cols-2 gap-3">
          {m.evidenceStrength !== undefined && <ScoreBar label="Evidence Strength" value={m.evidenceStrength} color="purple" unit="/100" />}
          {m.researchGapScore !== undefined && <ScoreBar label="Research Gap" value={m.researchGapScore} color={m.researchGapScore >= 60 ? 'red' : m.researchGapScore >= 30 ? 'amber' : 'green'} unit="/100" />}
          {m.practicalApplicability && <div className="card p-3 flex items-center justify-between"><span className="text-xs text-gray-500">Applicability</span><LevelBadge value={m.practicalApplicability} /></div>}
        </div>
      </div>
    )

    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate('/')} className="btn-ghost mt-0.5 p-1.5"><ArrowLeft size={16} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{sim.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 capitalize">{sim.mode}</span>
            {sim.rounds > 1 && <><span className="text-gray-300">·</span><span className="text-xs text-gray-400">{sim.rounds} rounds</span></>}
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{sim.agents.length} agents</span>
            {isRunning && sim.rounds > 1 && (
              <><span className="text-gray-300">·</span><span className="text-xs text-amber-500">Round {sim.currentRound}/{sim.rounds}</span></>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {isCompleted && (
            <>
              {sim.linkedSimId && (
                <Link to={`/compare/${sim.id}/${sim.linkedSimId}`} className="btn-ghost p-1.5 text-blue-500" title="View A/B comparison">
                  <GitCompare size={15} />
                </Link>
              )}
              <button onClick={handleFork} className="btn-ghost p-1.5" title="Fork simulation"><GitFork size={15} /></button>
              <button onClick={handleCopy} className="btn-ghost p-1.5" title="Copy report">
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>
              <button onClick={() => sim && downloadReport(sim)} className="btn-ghost p-1.5" title="Download report"><Download size={15} /></button>
            </>
          )}
          {isRunning && <div className="flex items-center gap-1.5 badge-amber"><Loader2 size={11} className="animate-spin" />R{sim.currentRound}/{sim.rounds}</div>}
          {isCompleted && <div className="flex items-center gap-1.5 badge-green"><CheckCircle size={11} />Done</div>}
          {isError && (
            <button onClick={() => { setStatus(sim.id, 'idle'); runSimulation() }} className="flex items-center gap-1.5 badge-red cursor-pointer">
              <RefreshCw size={11} />Retry
            </button>
          )}
          {sim.status === 'idle' && <button onClick={runSimulation} className="btn-primary flex items-center gap-1.5"><Play size={14} />Start</button>}
        </div>
      </div>

      {renderBriefCard()}

      {/* Injected contexts badge */}
      {sim.injectedContexts.length > 0 && (
        <div className="mb-4 flex flex-col gap-1">
          {sim.injectedContexts.map((ctx, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs">
              <PlusCircle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-amber-700"><span className="font-semibold">Injected:</span> {ctx}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-200 bg-red-50/50 p-4 mb-6 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-500">Simulation Error</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {sim.messages.length > 0 && (
        <div className="flex gap-1 mb-4 p-1 card rounded-xl">
          <button onClick={() => setTab('debate')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === 'debate' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
          >Debate ({sim.messages.length})</button>
          <button onClick={() => setTab('metrics')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${tab === 'metrics' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
          ><BarChart2 size={12} />Metrics</button>
          <button onClick={() => setTab('graph')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${tab === 'graph' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
          ><Network size={12} />Graph</button>
        </div>
      )}

      {/* Debate Tab */}
      {tab === 'debate' && (
        <div className="flex flex-col gap-4">
          {sim.messages.length === 0 && sim.status === 'idle' && (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Play size={28} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Ready to launch</p>
              <p className="text-gray-400 text-sm mt-1">Click Start to begin the agent debate</p>
            </div>
          )}

          {Array.from(messagesByRound.entries()).map(([round, msgs]) => (
            <div key={round}>
              {sim.rounds > 1 && (
                <div className="flex items-center gap-3 mb-3 mt-2">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
                    Round {round} — {getRoundLabel(round, sim.rounds)}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}
              {msgs.map((msg, i) => <AgentBubble key={`${msg.agentId}-${round}-${i}`} message={msg} />)}
            </div>
          ))}

          {/* Inject context */}
          {isRunning && (
            <div className="mt-2">
              {!showInject ? (
                <button onClick={() => setShowInject(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-600 transition-colors">
                  <PlusCircle size={13} />Inject new context into debate
                </button>
              ) : (
                <div className="card border-amber-200 bg-amber-50/40 p-3 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-amber-600">💡 Inject context</p>
                  <textarea className="input resize-none h-20 text-xs" placeholder="ex: O concorrente acabou de lançar um produto similar com 30% menos preço. Como isso muda a análise?" value={injectText} onChange={(e) => setInjectText(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={handleInject} disabled={!injectText.trim()} className="btn-primary text-xs py-1.5 px-4 disabled:opacity-40">Inject</button>
                    <button onClick={() => setShowInject(false)} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Metrics Tab */}
      {tab === 'metrics' && sim.metrics && (
        <div className="flex flex-col gap-4">
          {renderModeScorecard()}

          {/* Consensus evolution (multi-round only) */}
          {sim.metrics.consensusEvolution && sim.metrics.consensusEvolution.length > 1 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Consensus Evolution</p>
              <div className="flex items-end gap-3 h-16">
                {sim.metrics.consensusEvolution.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-gray-600">{v}%</span>
                    <div className="w-full bg-gray-100 rounded-full overflow-hidden" style={{ height: 32 }}>
                      <div className="bg-brand-500 rounded-full transition-all duration-500" style={{ height: `${v}%`, marginTop: `${100 - v}%` }} />
                    </div>
                    <span className="text-xs text-gray-400">R{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Overall Sentiment" value={sentimentLabel} sub={`Score: ${sim.metrics.overallSentiment.toFixed(2)}`} accent={sentimentAccent as 'green' | 'red' | 'amber'} icon={sim.metrics.overallSentiment > 0 ? '↑' : '↓'} />
            <MetricCard label="Consensus" value={`${sim.metrics.consensusLevel}%`} sub="agent agreement" accent="blue" icon="⚖" />
            <MetricCard label="Positive Agents" value={sim.metrics.positiveCount} sub={`of ${sim.messages.length} total`} accent="green" icon="✓" />
            <MetricCard label="Critical Agents" value={sim.metrics.negativeCount} sub={`of ${sim.messages.length} total`} accent="red" icon="⚠" />
          </div>

          <SentimentChart messages={sim.messages} />

          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Key Insights</p>
            <ul className="flex flex-col gap-2">
              {sim.metrics.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-brand-400 mt-0.5 flex-shrink-0">→</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Agent Breakdown</p>
            <div className="flex flex-col gap-2">
              {sim.messages.filter((m) => m.round === sim.rounds).map((msg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base w-6 text-center">{msg.agentEmoji}</span>
                  <span className={`text-xs font-medium w-28 flex-shrink-0 ${msg.agentColor}`}>{msg.agentName.replace('The ', '')}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${msg.sentiment > 0.15 ? 'bg-green-500' : msg.sentiment < -0.15 ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.abs(msg.sentiment) * 100}%`, marginLeft: msg.sentiment < 0 ? 'auto' : undefined }}
                    />
                  </div>
                  {msg.score ? (
                    <span className={`text-xs font-bold w-12 text-right ${msg.score.value >= 7 ? 'text-emerald-600' : msg.score.value >= 4 ? 'text-amber-600' : 'text-red-600'}`}>{msg.score.value}/10</span>
                  ) : (
                    <span className="text-xs text-gray-400 w-12 text-right">{msg.sentiment > 0 ? '+' : ''}{msg.sentiment.toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'metrics' && !sim.metrics && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <BarChart2 size={28} className="text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Metrics available after completion</p>
        </div>
      )}

      {/* Graph Tab */}
      {tab === 'graph' && (() => {
        const messagesWithRelations = sim.messages.filter((m) => m.relations && m.relations.length > 0)

        if (messagesWithRelations.length === 0) {
          return (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <Network size={28} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No relation data yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Agents declare relationships in Round 2+. Run a multi-round simulation to see the graph.
              </p>
            </div>
          )
        }

        const graphAgents = sim.agents.map((a) => ({
          id: a.id, name: a.name, emoji: a.emoji, color: a.color,
        }))

        const graphEdges = messagesWithRelations.flatMap((m) =>
          (m.relations ?? []).map((rel) => ({
            sourceId: m.agentId,
            targetId: rel.targetAgentId,
            type: rel.type,
            round: m.round,
          }))
        )

        // Per-round breakdown
        const rounds = [...new Set(messagesWithRelations.map((m) => m.round))].sort()

        return (
          <div className="flex flex-col gap-4">
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Argument Relationship Graph</p>
              <AgentGraph agents={graphAgents} edges={graphEdges} />
            </div>

            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Declared Relations by Round</p>
              <div className="flex flex-col gap-3">
                {rounds.map((round) => {
                  const roundMsgs = messagesWithRelations.filter((m) => m.round === round)
                  return (
                    <div key={round}>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Round {round} — {getRoundLabel(round, sim.rounds)}</p>
                      <div className="flex flex-col gap-1.5">
                        {roundMsgs.flatMap((m) =>
                          (m.relations ?? []).map((rel, ri) => {
                            const REL_CLS = {
                              AGREE:     'bg-green-50 text-green-700 border-green-200',
                              CHALLENGE: 'bg-red-50 text-red-700 border-red-200',
                              NEUTRAL:   'bg-slate-50 text-slate-600 border-slate-200',
                              BUILDS_ON: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            }
                            return (
                              <div key={`${m.agentId}-${ri}`} className="flex items-center gap-2 text-xs">
                                <span>{m.agentEmoji}</span>
                                <span className="font-medium text-gray-700">{m.agentName.replace('The ', '')}</span>
                                <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${REL_CLS[rel.type]}`}>
                                  {rel.type.toLowerCase().replace('_', ' ')}
                                </span>
                                <span className="text-gray-500">{rel.targetAgentName}</span>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Small scorecard sub-components ───────────────────────────────────────────
const COLOR_MAP: Record<string, { bar: string; text: string }> = {
  fuchsia: { bar: 'bg-fuchsia-500', text: 'text-fuchsia-500' },
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-500' },
  violet:  { bar: 'bg-violet-500',  text: 'text-violet-500'  },
  blue:    { bar: 'bg-blue-500',    text: 'text-blue-600'    },
  pink:    { bar: 'bg-pink-500',    text: 'text-pink-500'    },
  purple:  { bar: 'bg-purple-500',  text: 'text-purple-600'  },
  red:     { bar: 'bg-red-500',     text: 'text-red-500'     },
  amber:   { bar: 'bg-amber-500',   text: 'text-amber-500'   },
  green:   { bar: 'bg-green-500',   text: 'text-green-600'   },
}

function ScoreBar({ label, value, color, unit, prefix = '' }: { label: string; value: number; color: string; unit: string; prefix?: string }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue
  return (
    <div className="card p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className={`text-2xl font-bold ${c.text}`}>{prefix}{value}</span>
        <span className="text-xs text-gray-400 mb-0.5">{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
        <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

function LevelBadge({ value }: { value: 'Low' | 'Medium' | 'High' }) {
  const cls = value === 'High' ? 'text-emerald-500' : value === 'Medium' ? 'text-amber-500' : 'text-red-500'
  return <span className={`text-sm font-bold ${cls}`}>{value}</span>
}

function LevelRow({ label, value, invert }: { label: string; value: 'Low' | 'Medium' | 'High'; invert?: boolean }) {
  const order: ('Low' | 'Medium' | 'High')[] = invert ? ['High', 'Medium', 'Low'] : ['Low', 'Medium', 'High']
  const colors = ['text-red-500', 'text-amber-500', 'text-emerald-500']
  const idx = order.indexOf(value)
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-bold ${colors[idx] ?? 'text-gray-500'}`}>{value}</span>
    </div>
  )
}
