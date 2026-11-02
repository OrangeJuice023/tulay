import type { Metadata } from 'next'
import { CollaborationList } from './CollaborationList'

export const metadata: Metadata = {
  title: 'My collaborations · Tulay',
}

export default function Collaborations() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">My collaborations</h1>
      <p className="mt-2 text-muted">Introductions that turned into a next step, and whether they helped.</p>
      <div className="mt-8">
        <CollaborationList />
      </div>
    </div>
  )
}
