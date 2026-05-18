import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

export interface ProviderCost {
  provider: string
  estimatedCost: number
  tokens: number
  deltaPercent: number
}

interface ProviderCostSummaryProps {
  providers: ProviderCost[]
}

export function ProviderCostSummary({ providers }: ProviderCostSummaryProps) {
  const totalCost = providers.reduce((sum, p) => sum + p.estimatedCost, 0)

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <DollarSign size={15} className="text-gold" />
          <span className="text-sm font-semibold text-navy dark:text-white">Estimated Total</span>
        </div>
        <span className="font-code text-lg font-bold text-navy dark:text-white">
          ${totalCost.toFixed(4)}
        </span>
      </div>

      {/* Per-provider cards */}
      <div className="grid grid-cols-1 gap-3">
        {providers.map(p => (
          <div key={p.provider} className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-navy dark:text-white">{p.provider}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.tokens.toLocaleString()} tokens</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="font-code text-sm font-bold text-navy dark:text-white">
                ${p.estimatedCost.toFixed(4)}
              </span>
              {p.deltaPercent !== 0 && (
                <span className={`flex items-center text-xs ${p.deltaPercent > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {p.deltaPercent > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(p.deltaPercent).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Costs are estimated based on published provider pricing. Actuals may differ.
      </p>
    </div>
  )
}
