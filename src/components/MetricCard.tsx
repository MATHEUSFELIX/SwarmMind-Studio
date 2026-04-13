interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: 'amber' | 'green' | 'blue' | 'red' | 'purple' | 'slate'
  icon?: string
}

const ACCENT_MAP = {
  amber:  { text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100' },
  green:  { text: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
  blue:   { text: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100'  },
  red:    { text: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100'   },
  purple: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100'},
  slate:  { text: 'text-gray-600',   bg: 'bg-gray-100',  border: 'border-gray-200'  },
}

export default function MetricCard({ label, value, sub, accent = 'amber', icon }: Props) {
  const a = ACCENT_MAP[accent]
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        {icon && (
          <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${a.bg} ${a.text} border ${a.border}`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${a.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
