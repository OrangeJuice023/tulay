import { redirect } from 'next/navigation'

// Onboarding is now the first steps of the /start journey.
export default function Onboarding() {
  redirect('/start')
}
