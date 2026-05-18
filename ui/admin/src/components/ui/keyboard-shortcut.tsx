import { cn } from '@/lib/utils'

interface KbdShortcutProps {
  keys: string[]
  className?: string
}

export function KbdShortcut({ keys, className }: KbdShortcutProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-code text-[10px] font-semibold text-gray-500 dark:text-gray-400 leading-none min-w-[1.5rem]"
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}
