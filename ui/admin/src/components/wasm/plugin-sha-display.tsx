import { useState } from 'react'
import { Copy, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PluginShaDisplayProps {
  sha256: string
  className?: string
}

export function PluginShaDisplay({ sha256, className }: PluginShaDisplayProps) {
  const [copied, setCopied] = useState(false)

  if (!sha256) {
    return <span className="text-xs text-gray-300 italic">—</span>
  }

  const short = `${sha256.slice(0, 8)}…${sha256.slice(-8)}`

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(sha256)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span className={cn('inline-flex items-center gap-1 group', className)}>
      <span className="font-code text-xs text-gray-600 dark:text-gray-400" title={sha256}>
        {short}
      </span>
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        title="Copy full SHA256"
      >
        {copied
          ? <CheckCheck size={11} className="text-emerald-500" />
          : <Copy size={11} />}
      </button>
    </span>
  )
}
