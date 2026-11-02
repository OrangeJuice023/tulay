import { redirect } from 'next/navigation'

// Finding help now happens inside the /start journey, using the real matching function.
export default function FindHelp() {
  redirect('/start')
}
