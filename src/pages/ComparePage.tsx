import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, BarChart2, Play } from 'lucide-react'
import { useSimulationStore } from '@/stores/simulationStore'
import AgentBubble from '@/components/AgentBubble'
import MetricCard from '@/components/MetricCard'

function MiniMetric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

function SimColumn({ simId, label }: { simId: string; label: string }) {
  const sim = useSimulationStore((s) => s.getSimulation(simId))

  if (!sim) return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
      <p className="text-gray-400">Simulation not found</p>
      <p className="text-xs text-gray-300 mt-1">{simId}</p>
    </div>
  )

  const sentimentLabel = !sim.metrics ? '–' : sim.metrics.overallSentiment > 0.2 ? 'Positive' : sim.metrics.overallSentiment < -0.2 ? 'Negative' : 'Mixed'
  const sentimentColor = !sim.metrics ? 'text-gray-400' : sim.metrics.overallSentiment > 0.2 ? 'text-emerald-600' : sim.metrics.overallSentiment < -0.2 ? 'text-red-600' : 'text-amber-600'

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`badge text-xs ${sim.status === 'completed' ? 'badge-green' : sim.status === 'running' ? 'badge-amber' : 'badge-slate'}`}>
            {label}
          </span>
          {sim.status === 'idle' && (
            <Link to={`/simulation/${sim.id}`} className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600">
              <Play size={11} />Start
            </Link>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-800 truncate">{sim.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 capitalize">{sim.mode} · {sim.agents.length} agents · {sim.rounds} round{sim.rounds > 1 ? 's' : ''}</p>

        {sim.metrics && (
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
            <MiniMetric label="Sentiment" value={sentimentLabel} />
            <MiniMetric label="Consensus" value={`${sim.metrics.consensusLevel}%`} />
            <MiniMetric label="Positive" value={`${sim.metrics.positiveCount}/${sim.messages.length}`} sub="agents" />
            <MiniMetric label="Critical" value={`${sim.metrics.negativeCount}/${sim.messages.length}`} sub="agents" />
          </div>
        )}

        {!sim.metrics && sim.status !== 'idle' && (
          <p className="text-xs text-gray-400 mt-3">Metrics will appear after completion.</p>
        )}
        {sim.status === 'idle' && (
          <p className="text-xs text-amber-600 mt-3">⚠ This simulation hasn't run yet. <Link to={`/simulation/${sim.id}`} className="underline">Start it</Link></p>
        )}
      </div>

      {/* Mode-specific metrics */}
      {sim.metrics && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Scorecard</p>
          <div className="flex flex-col gap-2 text-xs">
            {sim.mode === 'consulting' && <>
              {sim.metrics.riskLevel && <div className="flex justify-between"><span className="text-gray-500">Risk Level</span><span className={`font-semibold ${sim.metrics.riskLevel === 'High' ? 'text-red-500' : sim.metrics.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}`}>{sim.metrics.riskLevel}</span></div>}
              {sim.metrics.implementationComplexity && <div className="flex justify-between"><span className="text-gray-500">Complexity</span><span className={`font-semibold ${sim.metrics.implementationComplexity === 'High' ? 'text-red-500' : sim.metrics.implementationComplexity === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}`}>{sim.metrics.implementationComplexity}</span></div>}
              {sim.metrics.decisionScore !== undefined && <div className="flex justify-between"><span className="text-gray-500">Decision Confidence</span><span className="font-semibold text-blue-600">{sim.metrics.decisionScore}/100</span></div>}
            </>}
            {sim.mode === 'social' && <>
              {sim.metrics.viralityScore !== undefined && <div className="flex justify-between"><span className="text-gray-500">Virality Score</span><span className="font-semibold text-pink-600">{sim.metrics.viralityScore}/100</span></div>}
              {sim.metrics.controversyIndex !== undefined && <div className="flex justify-between"><span className="text-gray-500">Controversy</span><span className={`font-semibold ${sim.metrics.controversyIndex >= 60 ? 'text-red-500' : sim.metrics.controversyIndex >= 30 ? 'text-amber-500' : 'text-emerald-500'}`}>{sim.metrics.controversyIndex}/100</span></div>}
              {sim.metrics.platformFit && <div className="flex justify-between"><span className="text-gray-500">Platform Fit</span><span className={`font-semibold ${sim.metrics.platformFit === 'High' ? 'text-emerald-500' : sim.metrics.platformFit === 'Medium' ? 'text-amber-500' : 'text-red-500'}`}>{sim.metrics.platformFit}</span></div>}
            </>}
            {sim.mode === 'research' && <>
              {sim.metrics.evidenceStrength !== undefined && <div className="flex justify-between"><span className="text-gray-500">Evidence Strength</span><span className="font-semibold text-purple-600">{sim.metrics.evidenceStrength}/100</span></div>}
              {sim.metrics.practicalApplicability && <div className="flex justify-between"><span className="text-gray-500">Applicability</span><span className={`font-semibold ${sim.metrics.practicalApplicability === 'High' ? 'text-emerald-500' : sim.metrics.practicalApplicability === 'Medium' ? 'text-amber-500' : 'text-red-500'}`}>{sim.metrics.practicalApplicability}</span></div>}
              {sim.metrics.researchGapScore !== undefined && <div className="flex justify-between"><span className="text-gray-500">Research Gap</span><span className="font-semibold text-purple-600">{sim.metrics.researchGapScore}/100</span></div>}
            </>}
            {sim.mode === 'fashion' && <>
              {sim.metrics.trendScore !== undefined && <div className="flex justify-between"><span className="text-gray-500">Trend Score</span><span className="font-semibold text-fuchsia-600">{sim.metrics.trendScore}/100</span></div>}
              {sim.metrics.sellThroughPrediction !== undefined && <div className="flex justify-between"><span className="text-gray-500">Sell-Through Est.</span><span className="font-semibold text-emerald-600">~{sim.metrics.sellThroughPrediction}%</span></div>}
              {sim.metrics.licensingFitScore !== undefined && <div className="flex justify-between"><span className="text-gray-500">Licensing Fit</span><span className="font-semibold text-violet-600">{sim.metrics.licensingFitScore}/100</span></div>}
            </>}
          </div>
        </div>
      )}

      {/* Key insights */}
      {sim.metrics?.keyInsights && sim.metrics.keyInsights.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Key Insights</p>
          <ul className="flex flex-col gap-2">
            {sim.metrics.keyInsights.slice(0, 6).map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="text-brand-400 mt-0.5 flex-shrink-0">→</span>{insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Debate */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Debate</p>
          <Link to={`/simulation/${sim.id}`} className="text-xs text-brand-500 hover:text-brand-600">View full →</Link>
        </div>
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {sim.messages.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No messages yet</p>
          ) : (
            sim.messages.slice(0, 8).map((msg, i) => <AgentBubble key={`${msg.agentId}-${i}`} message={msg} />)
          )}
          {sim.messages.length > 8 && (
            <p className="text-xs text-gray-400 text-center py-2">+{sim.messages.length - 8} more messages — <Link to={`/simulation/${sim.id}`} className="text-brand-500">view full debate</Link></p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ComparePage() {
  const { id1, id2 } = useParams<{ id1: string; id2: string }>()
  const simulations = useSimulationStore((s) => s.simulations)

  const sim1 = simulations.find((s) => s.id === id1)
  const sim2 = simulations.find((s) => s.id === id2)

  const isAB = sim1?.linkedSimId === id2

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="btn-ghost p-1.5"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isAB ? 'A/B Provider Comparison' : 'Side-by-Side Comparison'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isAB
              ? 'Two providers ran the same scenario — compare results'
              : 'Comparing two simulations side by side'}
          </p>
        </div>
      </div>

      {/* Side-by-side */}
      <div className="flex gap-4 items-start">
        {id1 && <SimColumn simId={id1} label={isAB ? 'A — Primary' : 'Simulation A'} />}
        <div className="w-px bg-gray-200 self-stretch flex-shrink-0 mt-16" />
        {id2 && <SimColumn simId={id2} label={isAB ? 'B — Comparison' : 'Simulation B'} />}
      </div>
    </div>
  )
}
