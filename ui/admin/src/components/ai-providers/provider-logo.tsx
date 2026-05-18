import { cn } from '@/lib/utils'

interface ProviderLogoProps {
  slug: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const PROVIDER_BRAND: Record<string, { initials: string; bg: string; text: string }> = {
  openai:    { initials: 'OAI', bg: 'bg-[#10a37f]',    text: 'text-white' },
  anthropic: { initials: 'ANT', bg: 'bg-[#d97706]',    text: 'text-white' },
  groq:      { initials: 'GRQ', bg: 'bg-[#f55036]',    text: 'text-white' },
  ollama:    { initials: 'OLL', bg: 'bg-[#3b82f6]',    text: 'text-white' },
  bedrock:   { initials: 'AWS', bg: 'bg-[#ff9900]',    text: 'text-white' },
  cohere:    { initials: 'COH', bg: 'bg-[#39594d]',    text: 'text-white' },
  mistral:   { initials: 'MIS', bg: 'bg-[#7c3aed]',    text: 'text-white' },
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-[9px]',
  md: 'w-10 h-10 text-[11px]',
  lg: 'w-14 h-14 text-sm',
}

function getBrand(slug: string) {
  const normalized = slug.toLowerCase()
  return PROVIDER_BRAND[normalized] ?? {
    initials: slug.slice(0, 3).toUpperCase(),
    bg: 'bg-navy',
    text: 'text-white',
  }
}

export function ProviderLogo({ slug, size = 'md', className }: ProviderLogoProps) {
  const { initials, bg, text } = getBrand(slug)

  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center font-bold font-code tracking-tight flex-shrink-0',
        SIZE_CLASSES[size],
        bg,
        text,
        className,
      )}
    >
      {initials}
    </div>
  )
}
