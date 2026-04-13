interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: 'amber' | 'green' | 'blue' | 'red' | 'purple' | 'slate'
  icon?: string
}

const ACCENT_MAP = {
  amber: 'text-amber-400 bg-amber-500/10',
  green: 'text-green-400 bg-green-500/10',
  blue: 'text-blue-400 bg-blue-500/10',
  red: 'text-red-400 bg-red-500/10',
  purple: 'text-purple-400 bg-purple-500/10',
  slate: 'text-slate-300 bg-slate-700/30',
}

export default function MetricCard({ label, value, sub, accent = 'amber', icon }: Props) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        {icon && (
          <span className={`text-sm px-1.5 py-0.5 rounded ${ACCENT_MAP[accent]}`}>{icon}</span>
        )}
      </div>
      <p className={`text-2xl font-bold ${ACCENT_MAP[accent].split(' ')[0]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
