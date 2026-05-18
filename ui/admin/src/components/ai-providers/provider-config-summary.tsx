import { Globe, Key, CheckCircle2, XCircle } from 'lucide-react'
import type { AiProvider } from '@/api/client'

interface ProviderConfigSummaryProps {
  provider: AiProvider
}

export function ProviderConfigSummary({ provider }: ProviderConfigSummaryProps) {
  const items = [
    {
      icon: Globe,
      label: 'Base URL',
      value: provider.base_url ?? 'Default',
      muted: !provider.base_url,
    },
    {
      icon: Key,
      label: 'API Key',
      value: 'Configured via env',
      muted: false,
    },
    {
      icon: provider.enabled ? CheckCircle2 : XCircle,
      label: 'Status',
      value: provider.enabled ? 'Enabled' : 'Disabled',
      muted: !provider.enabled,
    },
  ]

  return (
    <div className="flex flex-col gap-1.5">
      {items.map(({ icon: Icon, label, value, muted }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <Icon size={11} className={muted ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500'} />
          <span className={muted ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500'}>{label}:</span>
          <span className={`font-code ${muted ? 'text-gray-400 italic' : 'text-gray-700 dark:text-gray-300'}`}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}
