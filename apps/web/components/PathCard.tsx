import type { PathConfig } from '@/lib/paths'
import { ArrowRight, Briefcase, Leaf, Rocket } from './icons'

const look = {
  career: { Icon: Leaf, tile: 'bg-mist', icon: 'bg-white text-forest' },
  freelance: { Icon: Briefcase, tile: 'bg-peach/70', icon: 'bg-coral text-ink' },
  company: { Icon: Rocket, tile: 'bg-[#e9eef8]', icon: 'bg-white text-[#2f4fa0]' },
} as const

export function PathCard({ path, selected, onSelect }: { path: PathConfig; selected: boolean; onSelect: () => void }) {
  const { Icon, tile, icon } = look[path.id]
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group flex w-full items-start gap-4 rounded-[var(--radius-card)] p-5 text-left transition hover:-translate-y-0.5 active:translate-y-0 ${tile} ${
        selected ? 'ring-3 ring-forest' : 'ring-1 ring-transparent hover:ring-line'
      }`}
    >
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-sm ${icon}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="flex-1">
        <span className="block text-lg font-bold text-ink">{path.title}</span>
        <span className="mt-1 block text-sm text-muted">{path.blurb}</span>
      </span>
      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-forest transition group-hover:translate-x-0.5" />
    </button>
  )
}
