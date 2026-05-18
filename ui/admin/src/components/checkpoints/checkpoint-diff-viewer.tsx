import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Checkpoint } from '@/api/client'

interface CheckpointDiffViewerProps {
  current: Checkpoint
  previous: Checkpoint | null
}

export function CheckpointDiffViewer({ current, previous }: CheckpointDiffViewerProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span>Snapshot diff (#{previous?.sequence ?? '—'} → #{current.sequence})</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
          {/* Before */}
          <div>
            <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                Before{previous ? ` (#${previous.sequence})` : ' (none)'}
              </span>
            </div>
            <pre className="px-3 py-3 text-xs font-code text-gray-600 dark:text-gray-400 overflow-auto max-h-52 bg-white dark:bg-gray-900 whitespace-pre-wrap break-all">
              {previous
                ? JSON.stringify(previous.snapshot, null, 2)
                : '— No previous checkpoint —'}
            </pre>
          </div>

          {/* After */}
          <div>
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                After (#{current.sequence})
              </span>
            </div>
            <pre className="px-3 py-3 text-xs font-code text-gray-600 dark:text-gray-400 overflow-auto max-h-52 bg-white dark:bg-gray-900 whitespace-pre-wrap break-all">
              {JSON.stringify(current.snapshot, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
