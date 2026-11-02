import { z } from 'zod'
import { Need, NeedSchema, Offer, OfferSchema, ProfileSchema } from './schemas'

/**
 * Deterministic candidate matching for Journey 2 (see `docs/PRODUCT_SPEC.md`).
 * Pure function, no model calls: given a need, it ranks eligible community members
 * whose active offers are topically relevant to that need.
 *
 * Matching rules (in order):
 * 1. Eligibility: skip members with `discoverable: false`, skip the seeker themself
 *    when both ids are present, and consider only offers with status `active`.
 * 2. Topical relevance (required): at least one shared skill tag (normalized,
 *    exact match) or one shared description keyword must exist, otherwise the
 *    candidate is excluded. Reciprocity alone never creates a match.
 * 3. Scoring: +10 per shared tag, +2 per shared keyword (capped at +10), +5 when
 *    the seeker's own offers share a tag with the candidate's open needs
 *    (reciprocity: "you can help each other").
 * 4. Ranking: score descending, then display name (case-insensitive, code-unit
 *    order), then profile id, then offer id. Any remaining tie keeps input order
 *    (stable sort). At most `limit` matches are returned (default 5).
 * 5. Output: every match carries the shared tags/keywords and plain-language
 *    reasons grounded in the candidate's own data. Contact details are stripped:
 *    matching is discovery, not consent.
 *
 * Input handling: a malformed `need` or a non-array community throws (matching a
 * meaningless query would fabricate relevance). Individual malformed members are
 * skipped so one bad row cannot break discovery. Demo/real scoping is the
 * caller's job: this function never filters on `isDemo`.
 */

export const CommunityMemberSchema = z.object({
  profile: ProfileSchema,
  offers: z.array(OfferSchema).default([]),
  needs: z.array(NeedSchema).default([]),
})
export type CommunityMember = z.infer<typeof CommunityMemberSchema>

const PublicProfileSchema = ProfileSchema.omit({ contactMethod: true })
export type PublicProfile = z.infer<typeof PublicProfileSchema>

export const CandidateMatchSchema = z.object({
  profile: PublicProfileSchema,
  offer: OfferSchema,
  score: z.number().int().nonnegative(),
  sharedTags: z.array(z.string()),
  sharedKeywords: z.array(z.string()),
  reciprocal: z.boolean(),
  reciprocalTags: z.array(z.string()),
  reasons: z.array(z.string().trim().min(1)).min(1),
})
export type CandidateMatch = z.infer<typeof CandidateMatchSchema>

const FindCandidatesOptionsSchema = z.object({
  seekerOffers: z.array(OfferSchema).default([]),
  limit: z.number().int().min(1).max(50).default(5),
})
export type FindCandidatesOptions = z.input<typeof FindCandidatesOptionsSchema>

const POINTS_PER_SHARED_TAG = 10
const POINTS_PER_SHARED_KEYWORD = 2
const MAX_KEYWORD_POINTS = 10
const RECIPROCITY_BONUS = 5

const STOPWORDS = new Set(
  'a,an,and,are,can,could,for,from,had,has,have,help,into,looking,me,my,need,needs,of,or,our,please,seeking,should,that,the,this,to,want,wants,was,were,will,with,would,you,your'.split(
    ',',
  ),
)

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

function keywordsOf(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
  return [...new Set(tokens)].sort()
}

function intersectSorted(a: string[], b: string[]): string[] {
  const inB = new Set(b)
  return [...new Set(a)].filter((item) => inB.has(item)).sort()
}

function unionTags(offers: Pick<Offer, 'tags'>[]): string[] {
  return [...new Set(offers.flatMap((offer) => offer.tags.map(normalizeTag)))]
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function findCandidates(
  need: Need,
  community: CommunityMember[],
  options?: FindCandidatesOptions,
): CandidateMatch[] {
  const validNeed = NeedSchema.parse(need)
  if (!Array.isArray(community)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ['community'],
        message: 'Community must be an array of members',
      },
    ])
  }
  const { seekerOffers, limit } = FindCandidatesOptionsSchema.parse(options ?? {})

  const needTags = validNeed.tags.map(normalizeTag)
  const needKeywords = keywordsOf(validNeed.description)
  const seekerTags = unionTags(seekerOffers)

  const matches: CandidateMatch[] = []

  for (const rawMember of community) {
    const parsed = CommunityMemberSchema.safeParse(rawMember)
    if (!parsed.success) continue
    const member = parsed.data

    if (member.profile.discoverable === false) continue
    if (validNeed.profileId && member.profile.id === validNeed.profileId) continue

    const candidateNeedTags = unionTags(
      member.needs.filter((candidateNeed) => candidateNeed.status === 'open'),
    )
    const reciprocalTags = intersectSorted(seekerTags, candidateNeedTags)

    for (const offer of member.offers) {
      if (offer.status !== 'active') continue

      const sharedTags = intersectSorted(
        needTags,
        offer.tags.map(normalizeTag),
      )
      const sharedKeywords = intersectSorted(needKeywords, keywordsOf(offer.description))
      if (sharedTags.length === 0 && sharedKeywords.length === 0) continue

      let score =
        sharedTags.length * POINTS_PER_SHARED_TAG +
        Math.min(sharedKeywords.length * POINTS_PER_SHARED_KEYWORD, MAX_KEYWORD_POINTS)
      const reciprocal = reciprocalTags.length > 0
      if (reciprocal) score += RECIPROCITY_BONUS

      const reasons: string[] = []
      if (sharedTags.length > 0) {
        reasons.push(`Matching skills: ${sharedTags.join(', ')}`)
      }
      if (sharedKeywords.length > 0) {
        reasons.push(`Also mentions: ${sharedKeywords.join(', ')}`)
      }
      if (reciprocal) {
        reasons.push(
          `You can help each other: your offers match their need for ${reciprocalTags.join(', ')}`,
        )
      }

      const { contactMethod: _omitted, ...publicProfile } = member.profile
      void _omitted
      matches.push({
        profile: publicProfile,
        offer,
        score,
        sharedTags,
        sharedKeywords,
        reciprocal,
        reciprocalTags,
        reasons,
      })
    }
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const byName = compareStrings(
      a.profile.displayName.toLowerCase(),
      b.profile.displayName.toLowerCase(),
    )
    if (byName !== 0) return byName
    const byProfile = compareStrings(a.profile.id ?? '', b.profile.id ?? '')
    if (byProfile !== 0) return byProfile
    return compareStrings(a.offer.id ?? '', b.offer.id ?? '')
  })

  return matches.slice(0, limit)
}
