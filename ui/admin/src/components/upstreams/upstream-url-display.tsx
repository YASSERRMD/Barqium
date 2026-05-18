import { useState } from 'react'
import { Copy, CheckCheck, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UpstreamUrlDisplayProps {
  url: string
  maxLength?: number
  className?: string
}

export function UpstreamUrlDisplay({ url, maxLength = 40, className }: UpstreamUrlDisplayProps) {
  const [copied, setCopied] = useState(false)

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const truncated = url.length > maxLength ? url.slice(0, maxLength) + '…' : url

  return (
    <span className={cn('inline-flex items-center gap-1 group', className)}>
      <span className="font-code text-xs text-gray-600 dark:text-gray-400" title={url}>
        {truncated}
      </span>
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        title="Copy URL"
      >
        {copied
          ? <CheckCheck size={11} className="text-emerald-500" />
          : <Copy size={11} />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500"
        title="Open URL"
      >
        <ExternalLink size={11} />
      </a>
    </span>
  )
}
