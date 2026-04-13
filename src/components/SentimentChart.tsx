import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { AgentMessage } from '@/types'

interface Props {
  messages: AgentMessage[]
}

export default function SentimentChart({ messages }: Props) {
  const data = messages.map((m, i) => ({
    name: m.agentName.replace('The ', ''),
    sentiment: Math.round(m.sentiment * 100),
    index: i + 1,
  }))

  if (data.length === 0) return null

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Sentiment Timeline
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[-100, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
          <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 2" />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
            labelStyle={{ color: '#6b7280' }}
            itemStyle={{ color: '#f59e0b' }}
            formatter={(v: number) => [`${v > 0 ? '+' : ''}${v}`, 'Sentiment']}
          />
          <Line
            type="monotone" dataKey="sentiment" stroke="#f59e0b" strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#fbbf24' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
