import { cn } from '@/lib/utils'

interface RoutePathDisplayProps {
  pathPrefix: string
  host?: string
  className?: string
}

export function RoutePathDisplay({ pathPrefix, host, className }: RoutePathDisplayProps) {
  const segments = pathPrefix.split('/').filter(Boolean)

  return (
    <div className={cn('inline-flex flex-col gap-0.5', className)}>
      <span className="font-code text-xs text-navy dark:text-white">
        <span className="text-gold font-bold">/</span>
        {segments.map((seg, i) => (
          <span key={i}>
            {i > 0 && <span className="text-gold font-bold">/</span>}
            <span className={seg.startsWith(':') ? 'text-blue-500' : 'text-navy dark:text-gray-200'}>
              {seg}
            </span>
          </span>
        ))}
        {pathPrefix === '/' && <span className="text-gray-400 italic text-xs ml-1">(root)</span>}
      </span>
      {host && (
        <span className="text-xs text-gray-400 font-code">{host}</span>
      )}
    </div>
  )
}
