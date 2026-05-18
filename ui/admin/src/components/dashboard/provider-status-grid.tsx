import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ProviderStatus {
  name: string
  slug: string
  latencyMs?: number
  status: 'ok' | 'degraded' | 'down' | 'unknown'
}

const PROVIDERS: ProviderStatus[] = [
  { name: 'OpenAI',    slug: 'openai',    status: 'unknown' },
  { name: 'Anthropic', slug: 'anthropic', status: 'unknown' },
  { name: 'Groq',      slug: 'groq',      status: 'unknown' },
  { name: 'Ollama',    slug: 'ollama',    status: 'unknown' },
  { name: 'Bedrock',   slug: 'bedrock',   status: 'unknown' },
]

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'ghost'> = {
  ok:       'success',
  degraded: 'warning',
  down:     'destructive',
  unknown:  'ghost',
}

const statusLabel: Record<string, string> = {
  ok: 'OK', degraded: 'Degraded', down: 'Down', unknown: 'Not configured',
}

const providerColors: Record<string, string> = {
  openai:    'bg-[#10a37f]/10 text-[#10a37f]',
  anthropic: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  groq:      'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  ollama:    'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  bedrock:   'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
}

function ProviderCard({ provider }: { provider: ProviderStatus }) {
  return (
    <div className="card p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
          providerColors[provider.slug] ?? 'bg-gray-100 text-gray-600',
        )}>
          {provider.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-navy dark:text-white">{provider.name}</p>
          {provider.latencyMs !== undefined && (
            <p className="text-xs text-gray-400">{provider.latencyMs}ms avg</p>
          )}
        </div>
      </div>
      <Badge variant={statusVariant[provider.status]} dot>
        {statusLabel[provider.status]}
      </Badge>
    </div>
  )
}

interface ProviderStatusGridProps {
  providers?: ProviderStatus[]
}

export function ProviderStatusGrid({ providers = PROVIDERS }: ProviderStatusGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {providers.map(p => (
        <ProviderCard key={p.slug} provider={p} />
      ))}
    </div>
  )
}
