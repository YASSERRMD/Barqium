import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Network, Route, Building2, Activity,
  Brain, Shield, Puzzle, Users, ClipboardList, Globe, GitBranch, Zap,
} from 'lucide-react'
import { KbdShortcut } from '@/components/ui/keyboard-shortcut'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  label: string
  group: string
  icon: React.ElementType
  href?: string
  action?: () => void
  keywords?: string[]
}

const PAGE_COMMANDS: Command[] = [
  { id: 'goto-dashboard',    label: 'Dashboard',     group: 'Navigate', icon: LayoutDashboard, href: '/',            keywords: ['home'] },
  { id: 'goto-tenants',      label: 'Tenants',       group: 'Navigate', icon: Building2,       href: '/tenants' },
  { id: 'goto-upstreams',    label: 'Upstreams',     group: 'Navigate', icon: Network,         href: '/upstreams' },
  { id: 'goto-routes',       label: 'Routes',        group: 'Navigate', icon: Route,           href: '/routes' },
  { id: 'goto-consumers',    label: 'Consumers',     group: 'Navigate', icon: Users,           href: '/consumers' },
  { id: 'goto-ai-providers', label: 'AI Providers',  group: 'Navigate', icon: Brain,           href: '/ai-providers' },
  { id: 'goto-rate-limits',  label: 'Rate Limits',   group: 'Navigate', icon: Zap,             href: '/rate-limits' },
  { id: 'goto-wasm-plugins', label: 'WASM Plugins',  group: 'Navigate', icon: Puzzle,          href: '/wasm-plugins' },
  { id: 'goto-audit',        label: 'Audit Log',     group: 'Navigate', icon: ClipboardList,   href: '/audit' },
  { id: 'goto-checkpoints',  label: 'Checkpoints',   group: 'Navigate', icon: GitBranch,       href: '/checkpoints' },
  { id: 'goto-regions',      label: 'Regions',       group: 'Navigate', icon: Globe,           href: '/regions' },
  { id: 'goto-metrics',      label: 'Metrics',       group: 'Navigate', icon: Activity,        href: '/metrics' },
  { id: 'goto-policies',     label: 'Policies',      group: 'Navigate', icon: Shield,          href: '/policies' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery]   = useState('')
  const [active, setActive] = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const navigate  = useNavigate()

  const filtered = query.trim() === ''
    ? PAGE_COMMANDS
    : PAGE_COMMANDS.filter(cmd => {
        const q = query.toLowerCase()
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.group.toLowerCase().includes(q) ||
          (cmd.keywords ?? []).some(k => k.includes(q))
        )
      })

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setActive(0) }, [query])

  function runCommand(cmd: Command) {
    onClose()
    if (cmd.href) {
      navigate(cmd.href)
    } else {
      cmd.action?.()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter'      && filtered[active]) runCommand(filtered[active])
    if (e.key === 'Escape')    onClose()
  }

  if (!open) return null

  const groups = Array.from(new Set(filtered.map(c => c.group)))

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[15vh] p-4 animate-fade-in"
      style={{ zIndex: 200 }}
      aria-modal="true"
      role="dialog"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm text-navy dark:text-white placeholder-gray-400 focus:outline-none"
            placeholder="Search pages and actions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <KbdShortcut keys={['Esc']} />
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            groups.map(group => {
              const items = filtered.filter(c => c.group === group)
              return (
                <div key={group}>
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {group}
                  </p>
                  {items.map(cmd => {
                    const globalIdx = filtered.indexOf(cmd)
                    const Icon = cmd.icon
                    return (
                      <button
                        key={cmd.id}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                          globalIdx === active
                            ? 'bg-navy/8 dark:bg-white/8 text-navy dark:text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                        )}
                        onMouseEnter={() => setActive(globalIdx)}
                        onClick={() => runCommand(cmd)}
                      >
                        <Icon size={15} className="flex-shrink-0 text-gray-400" />
                        <span className="flex-1">{cmd.label}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><KbdShortcut keys={['↑', '↓']} /> Navigate</span>
          <span className="flex items-center gap-1"><KbdShortcut keys={['↵']} /> Select</span>
        </div>
      </div>
    </div>
  )
}
