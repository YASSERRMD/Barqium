import { useState } from 'react'
import { Copy, CheckCheck, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiKeyDisplayProps {
  prefix?: string
  fullKey?: string
  className?: string
}

export function ApiKeyDisplay({ prefix, fullKey, className }: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  if (!prefix && !fullKey) {
    return <span className="text-xs text-gray-300 italic">No key</span>
  }

  const displayKey = fullKey
    ? (revealed ? fullKey : `${fullKey.slice(0, 8)}${'•'.repeat(24)}`)
    : `${prefix}${'•'.repeat(20)}`

  const copyValue = fullKey ?? prefix ?? ''

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(copyValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span className={cn('inline-flex items-center gap-1 group', className)}>
      <span className="font-code text-xs text-gray-600 dark:text-gray-400">
        {displayKey}
      </span>
      {fullKey && (
        <button
          onClick={e => { e.stopPropagation(); setRevealed(r => !r) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
          title={revealed ? 'Hide key' : 'Reveal key'}
        >
          {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
      )}
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        title="Copy API key"
      >
        {copied
          ? <CheckCheck size={11} className="text-emerald-500" />
          : <Copy size={11} />}
      </button>
    </span>
  )
}
