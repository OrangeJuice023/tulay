import type { Metadata } from 'next'
import { getTagVocabulary } from '@/lib/community'
import { Journey } from './Journey'

export const metadata: Metadata = {
  title: 'Find your people · Tulay',
}

export default function StartPage() {
  const { offered, needed } = getTagVocabulary()
  return <Journey offeredTags={offered} neededTags={needed} />
}
