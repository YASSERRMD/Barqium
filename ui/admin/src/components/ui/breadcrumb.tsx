import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItemProps {
  href?: string
  children: ReactNode
  isCurrent?: boolean
}

export function BreadcrumbItem({ href, children, isCurrent = false }: BreadcrumbItemProps) {
  const cls = cn(
    'text-sm',
    isCurrent
      ? 'text-navy dark:text-white font-medium pointer-events-none'
      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors',
  )

  return (
    <li className="flex items-center gap-1.5" aria-current={isCurrent ? 'page' : undefined}>
      {href && !isCurrent ? (
        <Link to={href} className={cls}>{children}</Link>
      ) : (
        <span className={cls}>{children}</span>
      )}
    </li>
  )
}

interface BreadcrumbProps {
  children: ReactNode
  className?: string
}

export function Breadcrumb({ children, className }: BreadcrumbProps) {
  const items = Array.isArray(children) ? children : [children]

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight size={13} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />}
            {item}
          </li>
        ))}
      </ol>
    </nav>
  )
}
