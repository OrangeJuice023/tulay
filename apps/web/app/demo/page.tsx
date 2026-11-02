import { redirect } from 'next/navigation'

// /demo is the guided hackathon walkthrough. It runs as the /start journey,
// which already connects onboarding, matching, consent and collaboration.
export default function Demo() {
  redirect('/start')
}
