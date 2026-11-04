import type { Metadata } from 'next'
import { getSessionUser } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { AppNav } from '@/components/AppNav'
import { CollaborationList } from './CollaborationList'
import { AuthedCollaborations } from './AuthedCollaborations'
import { JourneyCollaborations } from './JourneyCollaborations'
import { listCollaborationsAction, listNotificationsAction } from './actions'

export const metadata: Metadata = {
  title: 'My collaborations · Tulay',
}

export default async function Collaborations() {
  const authed = isSupabaseConfigured() && (await getSessionUser()) !== null
  const serverCollabs = authed ? await listCollaborationsAction() : null
  const notifications = authed ? await listNotificationsAction() : null
  const unread = notifications?.ok ? notifications.data.filter((item) => !item.read).length : 0

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
      <AppNav pendingIntroductions={0} />
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">My collaborations</h1>
        <p className="mt-1 text-muted">
          Introductions that turned into a next step, and whether they helped.
          {authed && unread > 0 && ` You have ${unread} unread notification${unread === 1 ? '' : 's'} on your home dashboard.`}
        </p>
        <div className="mt-6">
          {authed ? (
            <AuthedCollaborations
              initial={serverCollabs?.ok ? serverCollabs.data : []}
              loadError={serverCollabs && !serverCollabs.ok ? serverCollabs.error : null}
            />
          ) : (
            <div className="space-y-8">
              <JourneyCollaborations />
              <section aria-label="Guided journey collaborations">
                <CollaborationList />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
