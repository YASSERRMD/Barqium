import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
const borderMap = { xs: 'border', sm: 'border-2', md: 'border-2', lg: 'border-[3px]' }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block rounded-full border-current border-r-transparent animate-spin',
        sizeMap[size],
        borderMap[size],
        className,
      )}
    />
  )
}

export function LoadingOverlay({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-inherit animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-navy dark:text-gold" />
        <p className="text-sm text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" className="text-navy dark:text-gold" />
    </div>
  )
}
