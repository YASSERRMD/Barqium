import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950',
  error:   'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
  info:    'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
}

const iconClasses: Record<ToastVariant, string> = {
  success: 'text-emerald-500',
  error:   'text-red-500',
  warning: 'text-amber-500',
  info:    'text-blue-500',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const variant = toast.variant ?? 'info'
  const Icon = icons[variant]

  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration ?? 4000)
    return () => clearTimeout(timer)
  }, [toast.duration, onDismiss])

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 w-80 rounded-xl border p-4 shadow-lg animate-slide-up',
        variantClasses[variant],
      )}
    >
      <Icon size={16} className={cn('mt-0.5 flex-shrink-0', iconClasses[variant])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    setToasts(prev => [...prev, { ...t, id: crypto.randomUUID() }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 flex flex-col gap-2"
        style={{ zIndex: 'var(--z-toast)' as never }}
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
