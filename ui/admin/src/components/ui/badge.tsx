import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors select-none',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-navy text-white dark:bg-navy-400',
        gold:        'border-transparent bg-gold text-white',
        outline:     'text-navy border-navy/30 dark:text-gray-200 dark:border-gray-600',
        destructive: 'border-transparent bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        success:     'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
        warning:     'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
        info:        'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        ghost:       'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            variant === 'success' && 'bg-emerald-500',
            variant === 'destructive' && 'bg-red-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'info' && 'bg-blue-500',
            (!variant || variant === 'default') && 'bg-white',
          )}
        />
      )}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
