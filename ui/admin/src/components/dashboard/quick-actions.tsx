import { Link } from 'react-router-dom'
import { Building2, Network, Route, Brain, ArrowRight } from 'lucide-react'

interface QuickAction {
  label: string
  description: string
  to: string
  icon: React.ElementType
  color: string
}

const ACTIONS: QuickAction[] = [
  { label: 'New Tenant',    description: 'Onboard a new tenant',       to: '/tenants',      icon: Building2, color: 'bg-navy/8 text-navy dark:bg-white/8 dark:text-white' },
  { label: 'New Upstream',  description: 'Register a backend service', to: '/upstreams',    icon: Network,   color: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
  { label: 'New Route',     description: 'Map a path to an upstream',  to: '/routes',       icon: Route,     color: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400' },
  { label: 'AI Provider',   description: 'Connect an LLM provider',    to: '/ai-providers', icon: Brain,     color: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
]

export function QuickActionsBar() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {ACTIONS.map(a => (
        <Link
          key={a.to}
          to={a.to}
          className="card p-4 flex items-start gap-3 hover:shadow-md transition-all group"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
            <a.icon size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy dark:text-white">{a.label}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{a.description}</p>
          </div>
          <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5" />
        </Link>
      ))}
    </div>
  )
}
