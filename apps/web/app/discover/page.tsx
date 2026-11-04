import type { Metadata } from 'next'
import { getDirectoryStats, getPublicDirectory } from '@/lib/directory'
import { DiscoverBrowser } from './DiscoverBrowser'

export const metadata: Metadata = {
  title: 'Discover people · Tulay',
  description: 'Browse the Tulay community directory and find people whose skills complement yours.',
}

export default function Discover() {
  const members = getPublicDirectory()
  const stats = getDirectoryStats()
  return <DiscoverBrowser members={members} allDemo={stats.allDemo} />
}
