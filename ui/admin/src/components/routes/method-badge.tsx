import { cn } from '@/lib/utils'

interface MethodBadgeProps {
  method: string
  className?: string
}

const METHOD_STYLES: Record<string, string> = {
  GET:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  POST:   'bg-blue-100   text-blue-700   dark:bg-blue-900   dark:text-blue-300',
  PUT:    'bg-amber-100  text-amber-700  dark:bg-amber-900  dark:text-amber-300',
  DELETE: 'bg-red-100    text-red-700    dark:bg-red-900    dark:text-red-300',
  PATCH:  'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  ANY:    'bg-gray-100   text-gray-600   dark:bg-gray-800   dark:text-gray-400',
  '*':    'bg-gray-100   text-gray-600   dark:bg-gray-800   dark:text-gray-400',
}

function normalizeMethod(method: string): string {
  const upper = method.toUpperCase()
  return upper === '*' ? 'ANY' : upper
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  const label = normalizeMethod(method)
  const styles = METHOD_STYLES[label] ?? METHOD_STYLES['ANY']

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold font-code tracking-wide border border-transparent',
        styles,
        className,
      )}
    >
      {label}
    </span>
  )
}
