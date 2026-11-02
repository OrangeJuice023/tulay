import type { Metadata } from 'next'
import { EmptyState, LinkButton } from '@/components/ui'

export const metadata: Metadata = {
  title: 'Profile · Tulay',
}

// Saved profiles need sign-in and a database (Supabase), which are not built yet.
export default function Profile() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">My profile</h1>
      <div className="mt-8">
        <EmptyState title="Profiles arrive with sign-in" action={<LinkButton href="/start">Try the demo journey</LinkButton>}>
          This prototype does not save profiles yet. In the demo, you describe your goal, need and offer at the start of
          the journey instead.
        </EmptyState>
      </div>
    </div>
  )
}
