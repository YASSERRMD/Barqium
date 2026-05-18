import { type ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: TooltipPosition
  className?: string
  disabled?: boolean
}

const positionClasses: Record<TooltipPosition, { tooltip: string; arrow: string }> = {
  top:    {
    tooltip: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow:   'top-full left-1/2 -translate-x-1/2 border-t-gray-800 dark:border-t-gray-700 border-x-transparent border-b-transparent',
  },
  bottom: {
    tooltip: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow:   'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 dark:border-b-gray-700 border-x-transparent border-t-transparent',
  },
  left:   {
    tooltip: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow:   'left-full top-1/2 -translate-y-1/2 border-l-gray-800 dark:border-l-gray-700 border-y-transparent border-r-transparent',
  },
  right:  {
    tooltip: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow:   'right-full top-1/2 -translate-y-1/2 border-r-gray-800 dark:border-r-gray-700 border-y-transparent border-l-transparent',
  },
}

export function Tooltip({ content, children, position = 'top', className, disabled = false }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  if (disabled) return <>{children}</>

  const { tooltip, arrow } = positionClasses[position]

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={cn(
            'absolute z-50 whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-white bg-gray-800 dark:bg-gray-700 shadow-lg pointer-events-none',
            tooltip,
          )}
          role="tooltip"
        >
          {content}
          <span className={cn('absolute w-0 h-0 border-4', arrow)} />
        </span>
      )}
    </span>
  )
}
