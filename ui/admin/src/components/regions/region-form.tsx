import { useState } from 'react'

interface RegionFormValues {
  name: string
  kafka_brokers: string
  is_primary: boolean
}

interface RegionFormProps {
  onSubmit: (values: RegionFormValues) => Promise<void> | void
  onCancel: () => void
  submitLabel?: string
}

export function RegionForm({ onSubmit, onCancel, submitLabel = 'Create Region' }: RegionFormProps) {
  const [name, setName]               = useState('')
  const [kafkaBrokers, setKafkaBrokers] = useState('')
  const [isPrimary, setIsPrimary]     = useState(false)
  const [loading, setLoading]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !kafkaBrokers.trim()) return
    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), kafka_brokers: kafkaBrokers.trim(), is_primary: isPrimary })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="region-name">Region Name</label>
        <input
          id="region-name"
          className="input mt-1"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. us-east-1"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label" htmlFor="region-brokers">Kafka Brokers</label>
        <input
          id="region-brokers"
          className="input mt-1 font-code text-sm"
          value={kafkaBrokers}
          onChange={e => setKafkaBrokers(e.target.value)}
          placeholder="broker1:9092,broker2:9092,broker3:9092"
          required
        />
        <p className="text-xs text-gray-400 mt-1">Comma-separated list of Kafka broker addresses.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isPrimary}
          onClick={() => setIsPrimary(v => !v)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 ${
            isPrimary ? 'bg-gold' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isPrimary ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Primary region</span>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={loading || !name.trim() || !kafkaBrokers.trim()}>
          {loading ? 'Creating…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
