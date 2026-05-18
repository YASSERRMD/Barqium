import { Badge } from '@/components/ui/badge'
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from 'lucide-react'
import type { WasmPlugin } from '@/api/client'

type Trigger = WasmPlugin['trigger']

interface PluginTriggerBadgeProps {
  trigger: Trigger
  className?: string
}

const TRIGGER_CONFIG: Record<Trigger, {
  variant: 'info' | 'warning' | 'success'
  label: string
  icon: typeof ArrowDownToLine
}> = {
  on_request:  { variant: 'info',    label: 'On Request',  icon: ArrowDownToLine  },
  on_response: { variant: 'warning', label: 'On Response', icon: ArrowUpFromLine  },
  both:        { variant: 'success', label: 'Both',        icon: ArrowLeftRight   },
}

export function PluginTriggerBadge({ trigger, className }: PluginTriggerBadgeProps) {
  const { variant, label, icon: Icon } = TRIGGER_CONFIG[trigger] ?? {
    variant: 'ghost',
    label: trigger,
    icon: ArrowLeftRight,
  }

  return (
    <Badge variant={variant} className={className}>
      <Icon size={10} />
      {label}
    </Badge>
  )
}
