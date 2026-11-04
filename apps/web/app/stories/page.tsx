import { redirect } from 'next/navigation'

// /stories now lives inside /community as "Illustrative stories". The
// /stories/[slug] detail pages stay reachable from there.
export default function Stories() {
  redirect('/community')
}
