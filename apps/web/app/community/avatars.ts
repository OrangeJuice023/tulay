/**
 * Illustrated avatars for the sample demo profiles. Original flat-vector
 * illustrations generated for Tulay (forest/ivory/coral system) — explicitly
 * not photographs of real people. Keyed by fixture member id; unknown ids
 * (future real members) get no avatar and fall back to initials.
 */
const AVATAR_BY_MEMBER_ID: Record<string, string> = {
  '11111111-1111-4111-8111-111111111111': '/community/avatars/mara-santos.png',
  '22222222-2222-4222-8222-222222222222': '/community/avatars/ate-liza-ramos.png',
  '33333333-3333-4333-8333-333333333333': '/community/avatars/jun-dela-cruz.png',
  '44444444-4444-4444-8444-444444444444': '/community/avatars/bianca-torres.png',
  '55555555-5555-4555-8555-555555555555': '/community/avatars/rafael-aquino.png',
  '66666666-6666-4666-8666-666666666666': '/community/avatars/sofia-lim.png',
  '77777777-7777-4777-8777-777777777777': '/community/avatars/marco-reyes.png',
  '88888888-8888-4888-8888-888888888888': '/community/avatars/aira-villanueva.jpg',
  '99999999-9999-4999-8999-999999999999': '/community/avatars/paolo-gutierrez.png',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa': '/community/avatars/nadia-cruz.png',
  'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2': '/community/avatars/diego-fernandez.png',
  'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3': '/community/avatars/katrina-uy.png',
  'd4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4': '/community/avatars/enrico-salazar.png',
  'e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5': '/community/avatars/grace-ocampo.png',
}

export function avatarFor(memberId: string | undefined): string | null {
  if (!memberId) return null
  return AVATAR_BY_MEMBER_ID[memberId] ?? null
}
