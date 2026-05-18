import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CommandPalette } from '@/components/command-palette/command-palette'
import { useCommandPalette } from '@/components/command-palette/use-command-palette'
import {
  LayoutDashboard, Network, Route, Building2, Activity,
  Brain, Shield, Puzzle, Users, ClipboardList,
  Globe, GitBranch, ChevronLeft, Sun, Moon, Monitor,
  Zap, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/ui/theme-provider'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/metrics', icon: Activity,        label: 'Metrics'   },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/tenants',   icon: Building2, label: 'Tenants'   },
      { to: '/upstreams', icon: Network,   label: 'Upstreams' },
      { to: '/routes',    icon: Route,     label: 'Routes'    },
      { to: '/consumers', icon: Users,     label: 'Consumers' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/ai-providers', icon: Brain,  label: 'AI Providers' },
      { to: '/rate-limits',  icon: Zap,    label: 'Rate Limits'  },
      { to: '/wasm-plugins', icon: Puzzle, label: 'WASM Plugins' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/audit',       icon: ClipboardList, label: 'Audit Log'    },
      { to: '/checkpoints', icon: GitBranch,     label: 'Checkpoints'  },
      { to: '/regions',     icon: Globe,         label: 'Regions'      },
      { to: '/policies',    icon: Shield,        label: 'Policies'     },
    ],
  },
]

const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; icon: React.ElementType; label: string }> = [
  { value: 'light',  icon: Sun,     label: 'Light'  },
  { value: 'dark',   icon: Moon,    label: 'Dark'   },
  { value: 'system', icon: Monitor, label: 'System' },
]

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const { open: paletteOpen, openPalette, closePalette } = useCommandPalette()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden font-body">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex-shrink-0 flex flex-col bg-navy dark:bg-gray-900 text-white transition-all duration-250',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center border-b border-white/10 h-14 transition-all',
          collapsed ? 'justify-center px-0' : 'px-5 gap-2',
        )}>
          {!collapsed && (
            <>
              <span className="font-heading text-xl font-bold text-gold">Barqium</span>
              <span className="text-[10px] text-white/40 mt-0.5 font-body">ADMIN</span>
            </>
          )}
          {collapsed && <span className="font-heading text-lg font-bold text-gold">B</span>}
        </div>

        {/* Search / Command Palette button */}
        {!collapsed ? (
          <button
            onClick={openPalette}
            className="mx-3 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/40 bg-white/5 hover:bg-white/10 hover:text-white/70 transition-colors w-[calc(100%-1.5rem)]"
          >
            <Search size={13} className="flex-shrink-0" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-[9px] rounded border border-white/20 px-1 py-0.5 font-code">⌘K</kbd>
          </button>
        ) : (
          <button
            onClick={openPalette}
            title="Search (⌘K)"
            className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors"
          >
            <Search size={15} />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg text-sm transition-colors',
                        collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 py-2',
                        isActive
                          ? 'bg-gold/20 text-gold font-medium'
                          : 'text-white/60 hover:bg-white/8 hover:text-white',
                      )
                    }
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {!collapsed && label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom bar */}
        <div className={cn(
          'border-t border-white/10 py-3 space-y-2',
          collapsed ? 'px-1 flex flex-col items-center' : 'px-3',
        )}>
          {/* Theme switcher */}
          {!collapsed ? (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/8">
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex-1 flex items-center justify-center h-7 rounded-md transition-colors',
                    theme === value ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70',
                  )}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}

          {!collapsed && (
            <p className="px-1 text-[10px] text-white/30">
              v0.1.0 · Barqium Admin
            </p>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            'w-full h-9 flex items-center border-t border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors',
            collapsed ? 'justify-center' : 'justify-end px-4',
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={15}
            className={cn('transition-transform duration-250', collapsed && 'rotate-180')}
          />
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Command Palette (rendered at root level) */}
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  )
}
