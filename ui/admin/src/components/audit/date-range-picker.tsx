import { Calendar } from 'lucide-react'

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
  className?: string
}

export function DateRangePicker({ from, to, onFromChange, onToChange, className }: DateRangePickerProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Calendar size={14} className="text-gray-400 flex-shrink-0" />
      <input
        type="date"
        className="input py-1.5 text-sm w-36"
        value={from}
        onChange={e => onFromChange(e.target.value)}
        title="From date"
        aria-label="From date"
      />
      <span className="text-gray-400 text-xs">to</span>
      <input
        type="date"
        className="input py-1.5 text-sm w-36"
        value={to}
        min={from}
        onChange={e => onToChange(e.target.value)}
        title="To date"
        aria-label="To date"
      />
    </div>
  )
}
