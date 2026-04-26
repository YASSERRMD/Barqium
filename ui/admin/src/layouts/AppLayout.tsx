import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Network, Route, Building2, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tenants', icon: Building2, label: 'Tenants' },
  { to: '/upstreams', icon: Network, label: 'Upstreams' },
  { to: '/routes', icon: Route, label: 'Routes' },
  { to: '/metrics', icon: Activity, label: 'Metrics' },
]

export function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 font-body">
      <aside className="w-60 flex-shrink-0 flex flex-col bg-navy text-white">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
          <span className="font-heading text-xl font-bold text-gold">Barqium</span>
          <span className="text-xs text-white/50 mt-0.5">Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-gold/20 text-gold font-medium'
                    : 'text-white/70 hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-white/10 text-xs text-white/40">
          Mohamed Yasser | Solutions Architect
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
