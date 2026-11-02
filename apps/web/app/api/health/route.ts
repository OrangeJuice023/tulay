import { NextResponse, connection } from 'next/server'
import { DemoProvider, getAIProvider } from '@tulay/ai'
import { CareerGoalSchema } from '@tulay/shared'

/**
 * Wiring check for the monorepo: proves the web app resolves `@tulay/shared`
 * and `@tulay/ai` at build time, and reports whether the app runs in labelled
 * demo mode (no model credentials) per product rule 4.
 */
export async function GET() {
  await connection()
  const provider = getAIProvider()
  const demoMode = provider instanceof DemoProvider
  const contract = CareerGoalSchema.safeParse({ goal: 'Become a UX designer' })

  return NextResponse.json({
    ok: true,
    demoMode,
    provider: demoMode ? 'demo' : 'meta',
    contractOk: contract.success,
  })
}
