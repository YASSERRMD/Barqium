import { PlusCircle, Pencil, Trash2, LogIn, ShieldAlert, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EventIconProps {
  eventType: string
  className?: string
}

function getIconConfig(eventType: string): {
  icon: typeof FileText
  bg: string
  fg: string
} {
  const lower = eventType.toLowerCase()
  if (lower.includes('create') || lower.includes('add')) {
    return { icon: PlusCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/50', fg: 'text-emerald-600 dark:text-emerald-400' }
  }
  if (lower.includes('update') || lower.includes('edit') || lower.includes('patch')) {
    return { icon: Pencil, bg: 'bg-amber-100 dark:bg-amber-900/50', fg: 'text-amber-600 dark:text-amber-400' }
  }
  if (lower.includes('delete') || lower.includes('remove')) {
    return { icon: Trash2, bg: 'bg-red-100 dark:bg-red-900/50', fg: 'text-red-600 dark:text-red-400' }
  }
  if (lower.includes('login') || lower.includes('logout') || lower.includes('auth')) {
    return { icon: LogIn, bg: 'bg-blue-100 dark:bg-blue-900/50', fg: 'text-blue-600 dark:text-blue-400' }
  }
  if (lower.includes('error') || lower.includes('fail') || lower.includes('deny')) {
    return { icon: ShieldAlert, bg: 'bg-red-100 dark:bg-red-900/50', fg: 'text-red-600 dark:text-red-400' }
  }
  return { icon: FileText, bg: 'bg-gray-100 dark:bg-gray-800', fg: 'text-gray-500' }
}

export function EventIcon({ eventType, className }: EventIconProps) {
  const { icon: Icon, bg, fg } = getIconConfig(eventType)

  return (
    <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', bg, className)}>
      <Icon size={12} className={fg} />
    </div>
  )
}
