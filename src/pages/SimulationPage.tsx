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
  const pos = (text.match(/\b(opportunity|growth|strong|excellent|promising|innovative|effective|success|advantage|positive|benefit|gain|improve|expand|recommend|support|agree|clear|viable|confidence|valid|evidence)\b/gi) || []).length
  const neg = (text.match(/\b(risk|challenge|concern|problem|fail|difficult|weakness|threat|uncertain|costly|complex|barrier|resist|loss|reject|flawed|insufficient|weak|contradict|gap|crisis|decline)\b/gi) || []).length
  const score = (pos - neg) / Math.max(pos + neg, 1)
  return Math.max(-1, Math.min(1, score * 0.6 + bias * 0.4))
}

function scoreToLabel(score: number, thresholds: [number, number] = [0.3, -0.1]): 'High' | 'Medium' | 'Low' {
  return score > thresholds[0] ? 'High' : score > thresholds[1] ? 'Medium' : 'Low'
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
    const previous: { agentName: string; content: string }[] = []

    try {
      for (const agent of sim.agents) {
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

        useSimulationStore.setState((s) => ({
          simulations: s.simulations.map((sm) =>
            sm.id === sim.id
              ? { ...sm, messages: sm.messages.map((m) => m.agentId === agent.id ? { ...m, sentiment } : m) }
              : sm,
          ),
        }))
      }

      // ── Compute final metrics ──────────────────────────────────────────────
      const msgs = useSimulationStore.getState().getSimulation(sim.id)?.messages ?? []
      const sentiments = msgs.map((m) => m.sentiment)
      const avg = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      const positiveCount = sentiments.filter((s) => s > 0.15).length
      const negativeCount = sentiments.filter((s) => s < -0.15).length
      const neutralCount = sentiments.length - positiveCount - negativeCount
      const variance = sentiments.reduce((a, b) => a + Math.abs(b - avg), 0) / sentiments.length
      const consensusLevel = Math.round(Math.max(0, 1 - variance) * 100)

      // ── Fashion metrics ────────────────────────────────────────────────────
      const isFashion = sim.mode === 'fashion'
      const forecasterMsg = msgs.find((m) => m.agentId === 'trend_forecaster')
      const buyerMsg = msgs.find((m) => m.agentId === 'retail_buyer')
      const brandMsg = msgs.find((m) => m.agentId === 'brand_strategist')
      const consumerMsg = msgs.find((m) => m.agentId === 'target_consumer')
      const vmMsg = msgs.find((m) => m.agentId === 'visual_merchandiser')
      const auditorMsg = msgs.find((m) => m.agentId === 'sustainability_auditor')

      const trendScore = isFashion && forecasterMsg ? Math.round(((forecasterMsg.sentiment + 1) / 2) * 100) : undefined
      const sellThroughPrediction = isFashion && buyerMsg && forecasterMsg
        ? Math.round(((buyerMsg.sentiment * 0.6 + forecasterMsg.sentiment * 0.4 + 1) / 2) * 75 + 10)
        : undefined
      const licensingFitScore = isFashion && brandMsg ? Math.round(((brandMsg.sentiment + 1) / 2) * 100) : undefined
      const viralityRaw = isFashion && consumerMsg && vmMsg ? (consumerMsg.sentiment + vmMsg.sentiment) / 2 : null
      const viralityPotential = viralityRaw !== null ? scoreToLabel(viralityRaw, [0.3, -0.1]) : undefined
      const sustainabilityRisk = isFashion && auditorMsg
        ? (auditorMsg.sentiment < -0.3 ? 'High' : auditorMsg.sentiment < 0.1 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low'
        : undefined

      const fashionInsights: string[] = isFashion ? [
        trendScore !== undefined ? `Trend Score: ${trendScore}/100 — ${trendScore >= 70 ? 'strong trend alignment' : trendScore >= 40 ? 'moderate trend relevance' : 'weak trend positioning'}` : null,
        sellThroughPrediction !== undefined ? `Sell-Through Prediction: ~${sellThroughPrediction}% at full price` : null,
        licensingFitScore !== undefined ? `Licensing Fit: ${licensingFitScore}/100 — ${licensingFitScore >= 70 ? 'strong brand alignment' : licensingFitScore >= 40 ? 'moderate fit' : 'questionable fit'}` : null,
        viralityPotential ? `Virality Potential: ${viralityPotential}` : null,
        sustainabilityRisk ? `ESG Risk Level: ${sustainabilityRisk}` : null,
      ].filter(Boolean) as string[] : []

      // ── Consulting metrics ─────────────────────────────────────────────────
      const isConsulting = sim.mode === 'consulting'
      const skepticMsg = msgs.find((m) => m.agentId === 'skeptic')
      const analystMsg = msgs.find((m) => m.agentId === 'analyst')
      const strategistMsg = msgs.find((m) => m.agentId === 'strategist')
      const innovatorMsg = msgs.find((m) => m.agentId === 'innovator')
      const mediatorMsg = msgs.find((m) => m.agentId === 'mediator')

      const riskLevel = isConsulting && skepticMsg
        ? (skepticMsg.sentiment < -0.4 ? 'High' : skepticMsg.sentiment < 0 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low'
        : undefined

      // Implementation complexity: average of analyst + skeptic pessimism
      const complexityRaw = isConsulting && analystMsg
        ? -(analystMsg.sentiment * 0.5 + (skepticMsg?.sentiment ?? 0) * 0.5)
        : null
      const implementationComplexity = complexityRaw !== null
        ? (complexityRaw > 0.2 ? 'High' : complexityRaw > -0.1 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low'
        : undefined

      // Decision score: weighted confidence when mode is 'decide'
      const isDecide = sim.consultingConfig?.goal === 'decide'
      const decisionScore = isConsulting && isDecide && strategistMsg && mediatorMsg
        ? Math.round(((strategistMsg.sentiment * 0.4 + mediatorMsg.sentiment * 0.4 + (innovatorMsg?.sentiment ?? 0) * 0.2 + 1) / 2) * 100)
        : undefined

      const consultingInsights: string[] = isConsulting ? [
        riskLevel ? `Risk Level: ${riskLevel} — ${riskLevel === 'High' ? 'significant execution risks identified' : riskLevel === 'Medium' ? 'moderate risks, manageable with mitigation' : 'risk profile is acceptable'}` : null,
        implementationComplexity ? `Implementation Complexity: ${implementationComplexity}` : null,
        decisionScore !== undefined ? `Decision Confidence Score: ${decisionScore}/100` : null,
        strategistMsg && strategistMsg.sentiment > 0.2 ? 'Strategist sees clear upside opportunity' : null,
        skepticMsg && skepticMsg.sentiment < -0.3 ? 'Skeptic raised significant concerns — review before proceeding' : null,
      ].filter(Boolean) as string[] : []

      // ── Social metrics ─────────────────────────────────────────────────────
      const isSocial = sim.mode === 'social'
      const enthusiastMsg = msgs.find((m) => m.agentId === 'enthusiast')
      const influencerMsg = msgs.find((m) => m.agentId === 'influencer')
      const criticMsg = msgs.find((m) => m.agentId === 'critic')
      const moderatorMsg = msgs.find((m) => m.agentId === 'moderator')

      const viralityScoreRaw = isSocial && enthusiastMsg && influencerMsg
        ? ((enthusiastMsg.sentiment + influencerMsg.sentiment) / 2 + 1) / 2 * 100
        : null
      const viralityScore = viralityScoreRaw !== null ? Math.round(viralityScoreRaw) : undefined

      // Controversy = spread between most positive and most negative agent
      const controversyIndex = isSocial && sentiments.length >= 2
        ? Math.round((Math.max(...sentiments) - Math.min(...sentiments)) / 2 * 100)
        : undefined

      const platformFitRaw = isSocial && moderatorMsg ? moderatorMsg.sentiment : null
      const platformFit = platformFitRaw !== null ? scoreToLabel(platformFitRaw, [0.2, -0.1]) : undefined

      const socialInsights: string[] = isSocial ? [
        viralityScore !== undefined ? `Virality Score: ${viralityScore}/100 — ${viralityScore >= 70 ? 'high viral potential' : viralityScore >= 40 ? 'moderate spread expected' : 'limited organic reach'}` : null,
        controversyIndex !== undefined ? `Controversy Index: ${controversyIndex}/100 — ${controversyIndex >= 60 ? 'highly polarizing topic' : controversyIndex >= 30 ? 'mixed but manageable reactions' : 'broadly neutral reception'}` : null,
        platformFit ? `Platform Fit (${sim.socialConfig?.platform || 'selected'}): ${platformFit}` : null,
        criticMsg && criticMsg.sentiment < -0.4 ? 'Strong criticism detected — prepare a response strategy' : null,
        enthusiastMsg && enthusiastMsg.sentiment > 0.5 ? 'High enthusiasm from early adopters' : null,
      ].filter(Boolean) as string[] : []

      // ── Research metrics ───────────────────────────────────────────────────
      const isResearch = sim.mode === 'research'
      const academicMsg = msgs.find((m) => m.agentId === 'academic')
      const practitionerMsg = msgs.find((m) => m.agentId === 'practitioner')
      const contrainMsg = msgs.find((m) => m.agentId === 'contrarian')
      const synthesizerMsg = msgs.find((m) => m.agentId === 'synthesizer')

      const evidenceStrength = isResearch && academicMsg
        ? Math.round(((academicMsg.sentiment + 1) / 2) * 100)
        : undefined

      const practicalApplicabilityRaw = isResearch && practitionerMsg ? practitionerMsg.sentiment : null
      const practicalApplicability = practicalApplicabilityRaw !== null ? scoreToLabel(practicalApplicabilityRaw, [0.2, -0.1]) : undefined

      // Research gap: how much the contrarian pushes back (high pushback = big gap)
      const researchGapScore = isResearch && contrainMsg
        ? Math.round(((-contrainMsg.sentiment + 1) / 2) * 100)
        : undefined

      // Hypothesis verdict
      const isValidate = sim.researchConfig?.goal === 'validate'
      const hypothesisVerdict = isResearch && isValidate && synthesizerMsg
        ? synthesizerMsg.sentiment > 0.3 ? 'Supported' : synthesizerMsg.sentiment > -0.1 ? 'Partially Supported' : 'Rejected'
        : undefined

      const researchInsights: string[] = isResearch ? [
        evidenceStrength !== undefined ? `Evidence Strength: ${evidenceStrength}/100 — ${evidenceStrength >= 70 ? 'well-supported by available data' : evidenceStrength >= 40 ? 'moderately supported' : 'evidence is weak or insufficient'}` : null,
        practicalApplicability ? `Practical Applicability: ${practicalApplicability}` : null,
        researchGapScore !== undefined ? `Research Gap Score: ${researchGapScore}/100 — ${researchGapScore >= 60 ? 'significant gaps identified' : researchGapScore >= 30 ? 'some gaps present' : 'findings are comprehensive'}` : null,
        hypothesisVerdict ? `Hypothesis Verdict: ${hypothesisVerdict}` : null,
      ].filter(Boolean) as string[] : []

      setMetrics(sim.id, {
        consensusLevel,
        overallSentiment: avg,
        positiveCount,
        negativeCount,
        neutralCount,
        keyInsights: [
          ...fashionInsights,
          ...consultingInsights,
          ...socialInsights,
          ...researchInsights,
          `${positiveCount} of ${sentiments.length} agents hold a positive view`,
          `Consensus level: ${consensusLevel}% agreement`,
          avg > 0.2 ? 'Overall assessment leans positive' : avg < -0.2 ? 'Overall assessment leans negative' : 'Assessment is mixed/neutral',
        ],
        // fashion
        trendScore,
        sellThroughPrediction,
        licensingFitScore,
        viralityPotential: viralityPotential as 'Low' | 'Medium' | 'High' | undefined,
        sustainabilityRisk,
        // consulting
        riskLevel,
        implementationComplexity,
        decisionScore,
        // social
        viralityScore,
        controversyIndex,
        platformFit,
        // research
        evidenceStrength,
        practicalApplicability,
        researchGapScore,
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

  const sentimentLabel = !sim.metrics ? '–' : sim.metrics.overallSentiment > 0.2 ? 'Positive' : sim.metrics.overallSentiment < -0.2 ? 'Negative' : 'Mixed'
  const sentimentAccent = !sim.metrics ? 'slate' : sim.metrics.overallSentiment > 0.2 ? 'green' : sim.metrics.overallSentiment < -0.2 ? 'red' : 'amber'

  // ── Brief card per mode ────────────────────────────────────────────────────
  function renderBriefCard() {
    if (sim!.mode === 'fashion' && sim!.fashionConfig) {
      const fc = sim!.fashionConfig
      const isDiscovery = fc.goal === 'discover_license' || fc.goal === 'discover_own'
      return (
        <div className="card border-fuchsia-500/20 bg-fuchsia-500/5 p-4 mb-6">
          {isDiscovery ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="badge bg-orange-50 text-orange-500 border-orange-200">
                  🔄 Modo Descoberta — {fc.goal === 'discover_license' ? 'Próximo Licenciado' : 'Nova Direção'}
                </span>
              </div>
              <div className="flex flex-col gap-2 text-xs mb-3">
                {fc.decliningItem && <div><span className="text-gray-500">📉 Em queda:</span> <span className="text-gray-800 font-semibold ml-1">{fc.decliningItem}</span></div>}
                {fc.retailer && <div><span className="text-gray-500">Varejista:</span> <span className="text-gray-800 font-medium ml-1">{fc.retailer}</span></div>}
                {fc.targetAge && <div><span className="text-gray-500">Público:</span> <span className="text-gray-800 font-medium ml-1">{fc.targetAge} · {fc.targetGender}</span></div>}
                {fc.priceRange && <div><span className="text-gray-500">Preço:</span> <span className="text-gray-800 font-medium ml-1">{fc.priceRange}</span></div>}
              </div>
              {fc.decliningReason && <p className="text-xs text-gray-500 leading-relaxed border-t border-fuchsia-500/10 pt-3">{fc.decliningReason}</p>}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-fuchsia-500 uppercase tracking-wider mb-3">🧵 Fashion Brief</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-3">
                {fc.licensedBrand && <div><span className="text-gray-500">Licenciado:</span> <span className="text-gray-800 font-medium ml-1">{fc.licensedBrand}</span></div>}
                {fc.collectionName && <div><span className="text-gray-500">Coleção:</span> <span className="text-gray-800 font-medium ml-1">{fc.collectionName}</span></div>}
                {fc.retailer && <div><span className="text-gray-500">Varejista:</span> <span className="text-gray-800 font-medium ml-1">{fc.retailer}</span></div>}
                {fc.season && <div><span className="text-gray-500">Estação:</span> <span className="text-gray-800 font-medium ml-1">{fc.season}</span></div>}
                {fc.targetAge && <div><span className="text-gray-500">Público:</span> <span className="text-gray-800 font-medium ml-1">{fc.targetAge} · {fc.targetGender}</span></div>}
                {fc.priceRange && <div><span className="text-gray-500">Preço:</span> <span className="text-gray-800 font-medium ml-1">{fc.priceRange}</span></div>}
              </div>
              {fc.styleNotes && <p className="text-xs text-gray-500 leading-relaxed border-t border-fuchsia-500/10 pt-3">{fc.styleNotes}</p>}
            </>
          )}
        </div>
      )
    }

    if (sim!.mode === 'consulting' && sim!.consultingConfig) {
      const cc = sim!.consultingConfig
      return (
        <div className="card border-blue-200 bg-blue-50/50 p-4 mb-6">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
            {cc.goal === 'decide' ? '⚖️ Decisão Travada' : '♟️ Análise Estratégica'}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            {cc.company && <div><span className="text-gray-500">Empresa:</span> <span className="text-gray-800 font-medium ml-1">{cc.company}</span></div>}
            {cc.industry && <div><span className="text-gray-500">Setor:</span> <span className="text-gray-800 font-medium ml-1">{cc.industry}</span></div>}
          </div>
          {cc.problem && <p className="text-xs text-gray-600 leading-relaxed mt-3 border-t border-blue-100 pt-3">{cc.problem.slice(0, 200)}{cc.problem.length > 200 ? '…' : ''}</p>}
          {cc.goal === 'decide' && (cc.optionA || cc.optionB) && (
            <div className="mt-3 flex flex-col gap-1 text-xs border-t border-blue-100 pt-3">
              {cc.optionA && <div><span className="text-gray-500">Opção A:</span> <span className="text-gray-700 ml-1">{cc.optionA}</span></div>}
              {cc.optionB && <div><span className="text-gray-500">Opção B:</span> <span className="text-gray-700 ml-1">{cc.optionB}</span></div>}
              {cc.optionC && <div><span className="text-gray-500">Opção C:</span> <span className="text-gray-700 ml-1">{cc.optionC}</span></div>}
            </div>
          )}
        </div>
      )
    }

    if (sim!.mode === 'social' && sim!.socialConfig) {
      const sc = sim!.socialConfig
      return (
        <div className="card border-pink-200 bg-pink-50/50 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`badge text-xs border ${sc.goal === 'crisis' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-pink-50 text-pink-500 border-pink-200'}`}>
              {sc.goal === 'crisis' ? '🚨 Crise de PR' : '📣 Lançamento'} · {sc.platform}
            </span>
            <span className="text-xs text-gray-400">{sc.campaignObjective}</span>
          </div>
          {sc.targetDemo && <p className="text-xs text-gray-500 mb-2">Público: <span className="text-gray-700 font-medium">{sc.targetDemo}</span></p>}
          <p className="text-xs text-gray-600 leading-relaxed border-t border-pink-100 pt-3">{sc.content.slice(0, 200)}{sc.content.length > 200 ? '…' : ''}</p>
        </div>
      )
    }

    if (sim!.mode === 'research' && sim!.researchConfig) {
      const rc = sim!.researchConfig
      return (
        <div className="card border-purple-200 bg-purple-50/50 p-4 mb-6">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">
            {rc.goal === 'validate' ? '🔬 Validação de Hipótese' : '🧬 Síntese de Pesquisa'}
          </p>
          <p className="text-xs text-gray-700 font-medium mb-2">{rc.question}</p>
          <div className="flex gap-3 text-xs text-gray-400">
            {rc.domain && <span>📂 {rc.domain}</span>}
            <span>👥 {rc.audience === 'academic' ? 'Acadêmica' : rc.audience === 'executive' ? 'Executiva' : 'Geral'}</span>
          </div>
          {rc.dataContext && <p className="text-xs text-gray-500 leading-relaxed mt-3 border-t border-purple-100 pt-3">{rc.dataContext.slice(0, 200)}{rc.dataContext.length > 200 ? '…' : ''}</p>}
        </div>
      )
    }

    // Fallback: generic scenario card
    return (
      <div className="card p-4 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scenario</p>
        <p className="text-sm text-gray-600 leading-relaxed">{sim!.scenario}</p>
      </div>
    )
  }

  // ── Mode scorecard ─────────────────────────────────────────────────────────
  function renderModeScorecard() {
    if (!sim!.metrics) return null

    if (sim!.mode === 'fashion') {
      const m = sim!.metrics
      return (
        <div className="card border-fuchsia-200 bg-fuchsia-50/40 p-4">
          <p className="text-xs font-semibold text-fuchsia-500 uppercase tracking-wider mb-3">🧵 Fashion Intelligence Scorecard</p>
          <div className="grid grid-cols-2 gap-3">
            {m.trendScore !== undefined && (
              <div className="card p-3">
                <p className="text-xs text-gray-500 mb-1">Trend Score</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold text-fuchsia-500">{m.trendScore}</span><span className="text-xs text-gray-400 mb-1">/100</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${m.trendScore}%` }} /></div>
              </div>
            )}
            {m.sellThroughPrediction !== undefined && (
              <div className="card p-3">
                <p className="text-xs text-gray-500 mb-1">Sell-Through Est.</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold text-emerald-500">~{m.sellThroughPrediction}%</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${m.sellThroughPrediction}%` }} /></div>
              </div>
            )}
            {m.licensingFitScore !== undefined && (
              <div className="card p-3">
                <p className="text-xs text-gray-500 mb-1">Licensing Fit</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold text-violet-500">{m.licensingFitScore}</span><span className="text-xs text-gray-400 mb-1">/100</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${m.licensingFitScore}%` }} /></div>
              </div>
            )}
            <div className="card p-3 flex flex-col gap-2">
              {m.viralityPotential && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Virality</span>
                  <span className={`text-xs font-bold ${m.viralityPotential === 'High' ? 'text-rose-500' : m.viralityPotential === 'Medium' ? 'text-amber-500' : 'text-gray-400'}`}>{m.viralityPotential}</span>
                </div>
              )}
              {m.sustainabilityRisk && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">ESG Risk</span>
                  <span className={`text-xs font-bold ${m.sustainabilityRisk === 'High' ? 'text-red-500' : m.sustainabilityRisk === 'Medium' ? 'text-amber-500' : 'text-teal-500'}`}>{m.sustainabilityRisk}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (sim!.mode === 'consulting') {
      const m = sim!.metrics
      const isDecide = sim!.consultingConfig?.goal === 'decide'
      return (
        <div className="card border-blue-200 bg-blue-50/40 p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
            {isDecide ? '⚖️ Decision Scorecard' : '♟️ Strategic Analysis Scorecard'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {isDecide && m.decisionScore !== undefined && (
              <div className="card p-3">
                <p className="text-xs text-gray-500 mb-1">Decision Confidence</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold text-blue-600">{m.decisionScore}</span><span className="text-xs text-gray-400 mb-1">/100</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.decisionScore}%` }} /></div>
              </div>
            )}
            <div className="card p-3 flex flex-col gap-2">
              {m.riskLevel && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Risk Level</span>
                  <span className={`text-xs font-bold ${m.riskLevel === 'High' ? 'text-red-500' : m.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}`}>{m.riskLevel}</span>
                </div>
              )}
              {m.implementationComplexity && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Complexity</span>
                  <span className={`text-xs font-bold ${m.implementationComplexity === 'High' ? 'text-red-500' : m.implementationComplexity === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}`}>{m.implementationComplexity}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    if (sim!.mode === 'social') {
      const m = sim!.metrics
      const isCrisis = sim!.socialConfig?.goal === 'crisis'
      return (
        <div className="card border-pink-200 bg-pink-50/40 p-4">
          <p className="text-xs font-semibold text-pink-600 uppercase tracking-wider mb-3">
            {isCrisis ? '🚨 Crisis Analysis Scorecard' : '📣 Campaign Scorecard'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {m.viralityScore !== undefined && (
              <div className="card p-3">
                <p className="text-xs text-gray-500 mb-1">{isCrisis ? 'Crisis Spread' : 'Virality Score'}</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold text-pink-500">{m.viralityScore}</span><span className="text-xs text-gray-400 mb-1">/100</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-pink-500 rounded-full" style={{ width: `${m.viralityScore}%` }} /></div>
              </div>
            )}
            {m.controversyIndex !== undefined && (
              <div className="card p-3">
                <p className="text-xs text-gray-500 mb-1">Controversy Index</p>
                <div className="flex items-end gap-2"><span className={`text-2xl font-bold ${m.controversyIndex >= 60 ? 'text-red-500' : m.controversyIndex >= 30 ? 'text-amber-500' : 'text-emerald-500'}`}>{m.controversyIndex}</span><span className="text-xs text-gray-400 mb-1">/100</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${m.controversyIndex >= 60 ? 'bg-red-500' : m.controversyIndex >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${m.controversyIndex}%` }} />
                </div>
              </div>
            )}
            {m.platformFit && (
              <div className="card p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Platform Fit</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sim!.socialConfig?.platform}</p>
                </div>
                <span className={`text-sm font-bold ${m.platformFit === 'High' ? 'text-emerald-500' : m.platformFit === 'Medium' ? 'text-amber-500' : 'text-red-500'}`}>{m.platformFit}</span>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (sim!.mode === 'research') {
      const m = sim!.metrics
      const isValidate = sim!.researchConfig?.goal === 'validate'
      return (
        <div className="card border-purple-200 bg-purple-50/40 p-4">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-3">
            {isValidate ? '🔬 Hypothesis Verdict' : '🧬 Research Scorecard'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {m.evidenceStrength !== undefined && (
              <div className="card p-3">
                <p className="text-xs text-gray-500 mb-1">Evidence Strength</p>
                <div className="flex items-end gap-2"><span className="text-2xl font-bold text-purple-600">{m.evidenceStrength}</span><span className="text-xs text-gray-400 mb-1">/100</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${m.evidenceStrength}%` }} /></div>
              </div>
            )}
            {m.researchGapScore !== undefined && (
              <div className="card p-3">
                <p className="text-xs text-gray-500 mb-1">Research Gap</p>
                <div className="flex items-end gap-2">
                  <span className={`text-2xl font-bold ${m.researchGapScore >= 60 ? 'text-red-500' : m.researchGapScore >= 30 ? 'text-amber-500' : 'text-emerald-500'}`}>{m.researchGapScore}</span>
                  <span className="text-xs text-gray-400 mb-1">/100</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${m.researchGapScore >= 60 ? 'bg-red-500' : m.researchGapScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${m.researchGapScore}%` }} />
                </div>
              </div>
            )}
            <div className="card p-3 flex flex-col gap-2">
              {m.practicalApplicability && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Applicability</span>
                  <span className={`text-xs font-bold ${m.practicalApplicability === 'High' ? 'text-emerald-500' : m.practicalApplicability === 'Medium' ? 'text-amber-500' : 'text-red-500'}`}>{m.practicalApplicability}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate('/')} className="btn-ghost mt-0.5 p-1.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{sim.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 capitalize">{sim.mode}</span>
            {sim.platform && <><span className="text-gray-300">·</span><span className="text-xs text-gray-400">{sim.platform}</span></>}
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{sim.agents.length} agents</span>
          </div>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5 badge-amber"><Loader2 size={11} className="animate-spin" />Running</div>
        )}
        {isCompleted && (
          <div className="flex items-center gap-1.5 badge-green"><CheckCircle size={11} />Done</div>
        )}
        {isError && (
          <button onClick={() => { setStatus(sim.id, 'idle'); runSimulation() }} className="flex items-center gap-1.5 badge-red cursor-pointer">
            <RefreshCw size={11} />Retry
          </button>
        )}
        {sim.status === 'idle' && (
          <button onClick={runSimulation} className="btn-primary flex items-center gap-1.5"><Play size={14} />Start</button>
        )}
      </div>

      {/* Brief card */}
      {renderBriefCard()}

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
          {sim.messages.map((msg, i) => <AgentBubble key={`${msg.agentId}-${i}`} message={msg} />)}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Metrics Tab */}
      {tab === 'metrics' && sim.metrics && (
        <div className="flex flex-col gap-4">
          {renderModeScorecard()}

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
              {sim.messages.map((msg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base w-6 text-center">{msg.agentEmoji}</span>
                  <span className={`text-xs font-medium w-28 flex-shrink-0 ${msg.agentColor}`}>{msg.agentName.replace('The ', '')}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${msg.sentiment > 0.15 ? 'bg-green-500' : msg.sentiment < -0.15 ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.abs(msg.sentiment) * 100}%`, marginLeft: msg.sentiment < 0 ? 'auto' : undefined }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right">{msg.sentiment > 0 ? '+' : ''}{msg.sentiment.toFixed(2)}</span>
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
    </div>
  )
}
