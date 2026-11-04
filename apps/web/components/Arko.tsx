import Image from 'next/image'

export type ArkoState =
  | 'idle'
  | 'greeting'
  | 'thinking'
  | 'curious'
  | 'searching'
  | 'match-found'
  | 'pending'
  | 'connected'
  | 'celebration'
  | 'empty'

// `greeting` and `thinking` are presentation aliases that reuse approved crops
// (see `docs/brand/mascot.md`): no new artwork, no redesign.
const ARKO_ASSET: Record<ArkoState, { src: string; width: number; height: number }> = {
  idle: { src: '/brand/mascot/arko-idle.png', width: 164, height: 128 },
  greeting: { src: '/brand/mascot/arko-curious.png', width: 160, height: 125 },
  thinking: { src: '/brand/mascot/arko-idle.png', width: 164, height: 128 },
  curious: { src: '/brand/mascot/arko-curious.png', width: 160, height: 125 },
  searching: { src: '/brand/mascot/arko-searching.png', width: 164, height: 150 },
  'match-found': { src: '/brand/mascot/arko-match-found.png', width: 156, height: 150 },
  pending: { src: '/brand/mascot/arko-pending.png', width: 176, height: 150 },
  connected: { src: '/brand/mascot/arko-connected.png', width: 168, height: 150 },
  celebration: { src: '/brand/mascot/arko-celebration.png', width: 175, height: 150 },
  empty: { src: '/brand/mascot/arko-empty.png', width: 175, height: 150 },
}

/**
 * Arko, Tulay's bridge-building companion (approved mascot; see
 * `docs/brand/mascot.md`). State-driven: the sprite follows the journey
 * moment, with a subtle bob that disables itself under
 * `prefers-reduced-motion`. Decorative by default; pass `label` to expose it.
 */
export function Arko({
  state = 'idle',
  size = 64,
  label,
  className = '',
}: {
  state?: ArkoState
  size?: number
  label?: string
  className?: string
}) {
  const asset = ARKO_ASSET[state]
  const height = Math.round((size * asset.height) / asset.width)
  return (
    <span
      className={`inline-grid place-items-center ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Image
        src={asset.src}
        alt=""
        width={size}
        height={height}
        className="arko-bob"
        style={{ imageRendering: 'pixelated' }}
      />
    </span>
  )
}
