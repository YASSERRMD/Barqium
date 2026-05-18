import { useState } from 'react'
import { Copy, CheckCheck, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import type { Consumer } from '@/api/client'

interface ApiKeyGenerateModalProps {
  consumer: Consumer
  onClose: () => void
  // In a real implementation, this would call an API endpoint to generate a key.
  // For now, we simulate it since the API client does not expose a key generation endpoint.
  generatedKey?: string
}

export function ApiKeyGenerateModal({ consumer, onClose, generatedKey }: ApiKeyGenerateModalProps) {
  const [copied, setCopied] = useState(false)

  // Simulate a generated key for UI demonstration
  const key = generatedKey ?? `bq_${consumer.id.slice(0, 8)}_${'x'.repeat(32)}`

  const copy = () => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="API Key Generated"
      description={`New API key for consumer "${consumer.name}"`}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This key will only be shown once. Copy it now and store it securely — you cannot retrieve it later.
          </p>
        </div>

        <div>
          <p className="label mb-2">API Key</p>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
            <span className="font-code text-xs text-gray-800 dark:text-gray-200 flex-1 break-all select-all">
              {key}
            </span>
            <button
              onClick={copy}
              className="flex-shrink-0 btn-ghost btn-xs"
              title="Copy API key"
            >
              {copied
                ? <CheckCheck size={14} className="text-emerald-500" />
                : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            className={copied ? 'btn-primary' : 'btn-secondary'}
            onClick={onClose}
          >
            {copied ? 'Done' : 'I have copied the key'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
