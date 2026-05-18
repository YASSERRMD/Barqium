import { type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

interface SelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
  wrapperClassName?: string
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  label,
  disabled = false,
  className,
  wrapperClassName,
}: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'input appearance-none pr-9 cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed',
            className,
          )}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>
    </div>
  )
}

interface FilterSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
}

export function FilterSelectV2({ label, value, onChange, options, className }: FilterSelectProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="text-xs font-medium text-gray-500">{label}:</span>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-2.5 pr-7 text-xs font-medium text-navy dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/50"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  )
}

// Re-export a children-based variant for flexibility
interface SelectGroupProps {
  id?: string
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
  children: ReactNode
}

export function SelectGroup({ id, value, onChange, label, className, children }: SelectGroupProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input appearance-none pr-9"
        >
          {children}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  )
}
