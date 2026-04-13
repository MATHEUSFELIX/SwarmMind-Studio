import type { AgentMessage } from '@/types'

const LIGHT_BG: Record<string, string> = {
  'bg-blue-500/10 border-blue-500/20':       'bg-blue-50 border-blue-200',
  'bg-red-500/10 border-red-500/20':         'bg-red-50 border-red-200',
  'bg-green-500/10 border-green-500/20':     'bg-green-50 border-green-200',
  'bg-purple-500/10 border-purple-500/20':   'bg-purple-50 border-purple-200',
  'bg-amber-500/10 border-amber-500/20':     'bg-amber-50 border-amber-200',
  'bg-cyan-500/10 border-cyan-500/20':       'bg-cyan-50 border-cyan-200',
  'bg-orange-500/10 border-orange-500/20':   'bg-orange-50 border-orange-200',
  'bg-pink-500/10 border-pink-500/20':       'bg-pink-50 border-pink-200',
  'bg-slate-700/30 border-slate-600/20':     'bg-gray-50 border-gray-200',
  'bg-fuchsia-500/10 border-fuchsia-500/20': 'bg-fuchsia-50 border-fuchsia-200',
  'bg-emerald-500/10 border-emerald-500/20': 'bg-emerald-50 border-emerald-200',
  'bg-rose-500/10 border-rose-500/20':       'bg-rose-50 border-rose-200',
  'bg-violet-500/10 border-violet-500/20':   'bg-violet-50 border-violet-200',
  'bg-teal-500/10 border-teal-500/20':       'bg-teal-50 border-teal-200',
  'bg-gray-500/10 border-gray-500/20':       'bg-gray-50 border-gray-200',
}

const LIGHT_TEXT: Record<string, string> = {
  'text-blue-400':    'text-blue-600',
  'text-red-400':     'text-red-600',
  'text-green-400':   'text-green-600',
  'text-purple-400':  'text-purple-600',
  'text-amber-400':   'text-amber-600',
  'text-cyan-400':    'text-cyan-600',
  'text-orange-400':  'text-orange-600',
  'text-pink-400':    'text-pink-600',
  'text-slate-300':   'text-gray-600',
  'text-fuchsia-400': 'text-fuchsia-600',
  'text-emerald-400': 'text-emerald-600',
  'text-rose-400':    'text-rose-600',
  'text-violet-400':  'text-violet-600',
  'text-teal-400':    'text-teal-600',
  'text-gray-600':    'text-gray-600',
}

const SCORE_COLOR = (v: number) =>
  v >= 8 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
  : v >= 5 ? 'text-amber-600 bg-amber-50 border-amber-200'
  : 'text-red-600 bg-red-50 border-red-200'

const CONF_DOT = { high: 'bg-emerald-500', medium: 'bg-amber-500', low: 'bg-red-500' }

interface Props {
  message: AgentMessage
}

export default function AgentBubble({ message }: Props) {
  const lightBg   = LIGHT_BG[message.agentBgColor]   ?? 'bg-gray-50 border-gray-200'
  const lightText = LIGHT_TEXT[message.agentColor]    ?? 'text-gray-700'

  return (
    <div className="flex gap-3 animate-slide-up">
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border ${lightBg}`}>
        {message.agentEmoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-sm font-semibold ${lightText}`}>{message.agentName}</span>
          <span className="text-xs text-gray-400">{message.agentRole}</span>
          {message.round > 1 && (
            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
              R{message.round}
            </span>
          )}
        </div>

        <div className={`border rounded-xl p-3 text-sm text-gray-700 leading-relaxed ${lightBg}`}>
          <span className={message.isStreaming ? 'cursor-blink' : ''}>{message.content}</span>
        </div>

        {/* Structured score badge */}
        {message.score && (
          <div className="mt-2 flex items-start gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${SCORE_COLOR(message.score.value)}`}>
              <span>{message.score.value}/10</span>
              <span className={`w-1.5 h-1.5 rounded-full ${CONF_DOT[message.score.confidence]}`} />
              <span className="font-normal opacity-80">{message.score.confidence}</span>
            </span>
            <p className="text-xs text-gray-500 leading-relaxed pt-0.5 flex-1">{message.score.keyPoint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
