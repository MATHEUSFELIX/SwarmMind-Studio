import type { AgentMessage } from '@/types'

interface Props {
  message: AgentMessage
}

export default function AgentBubble({ message }: Props) {
  return (
    <div className="flex gap-3 animate-slide-up">
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border ${message.agentBgColor}`}
      >
        {message.agentEmoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-sm font-semibold ${message.agentColor}`}>
            {message.agentName}
          </span>
          <span className="text-xs text-slate-600">{message.agentRole}</span>
        </div>

        <div className={`card p-3 text-sm text-slate-300 leading-relaxed ${message.agentBgColor}`}>
          <span className={message.isStreaming ? 'cursor-blink' : ''}>{message.content}</span>
        </div>
      </div>
    </div>
  )
}
