import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <Zap size={40} className="text-slate-700" />
      <h1 className="text-4xl font-bold text-slate-600">404</h1>
      <p className="text-slate-400">Page not found</p>
      <Link to="/" className="btn-primary mt-2">
        Back to Command Center
      </Link>
    </div>
  )
}
