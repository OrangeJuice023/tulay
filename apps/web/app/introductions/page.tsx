import type { Metadata } from 'next'
import { getSessionUser } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { listIntroductionsAction } from './actions'
import { IntroductionsView } from './IntroductionsView'

export const metadata: Metadata = {
  title: 'Introductions · Tulay',
  description: 'Introduction requests you sent and received. Nothing is shared until both sides accept.',
}

export default async function Introductions() {
  const authed = isSupabaseConfigured() && (await getSessionUser()) !== null
  const initial = authed ? await listIntroductionsAction() : null
  return (
    <IntroductionsView
      mode={authed ? 'authed' : 'demo'}
      initial={initial?.ok ? initial.data : []}
      loadError={initial && !initial.ok ? initial.error : null}
    />
  )
}
