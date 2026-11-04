import { z } from 'zod'
import { SkillTagSchema } from './schemas'
import { ConciergeRelationshipSchema as RelationshipSchema } from './concierge'

/**
 * Ask Arko conversational contracts. The model interprets the visitor's words
 * and drafts replies; it never retrieves candidates (that is `findCandidates`)
 * and never changes consent or collaboration state (those are explicit UI
 * actions validated below and in `concierge.ts`). No I/O in this module.
 */

export const ChatIntentSchema = z.enum([
  'looking-for-people',
  'career-advice',
  'portfolio-feedback',
  'goal-setting',
  'small-talk',
  'unclear',
])
export type ChatIntent = z.infer<typeof ChatIntentSchema>

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'arko']),
  text: z.string().trim().min(1).max(2000),
})
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>

export const ArkoChatContextSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(ChatHistoryMessageSchema).max(10).default([]),
  vocabulary: z.array(SkillTagSchema).max(100).default([]),
  displayName: z.string().trim().max(100).optional(),
})
export type ArkoChatContext = z.infer<typeof ArkoChatContextSchema>
export type ArkoChatContextInput = z.input<typeof ArkoChatContextSchema>

export const ExtractedNeedSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  tags: z.array(SkillTagSchema).max(10).default([]),
})
export type ExtractedNeed = z.infer<typeof ExtractedNeedSchema>

export const ExtractedOfferSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  tags: z.array(SkillTagSchema).max(10).default([]),
})
export type ExtractedOffer = z.infer<typeof ExtractedOfferSchema>

/**
 * Build the history array for one chat turn from prior messages only. Pure
 * and total: takes the last 10, caps text at 2000 chars, and never adds,
 * reorders, or sources messages from anywhere else (no fixtures, no seeds,
 * no other threads). Both the workspace and the tests use this.
 */
export function toChatHistory(messages: { role: 'user' | 'arko'; text: string }[]): ChatHistoryMessage[] {
  return messages.slice(-10).map((message) => ({ role: message.role, text: message.text.slice(0, 2000) }))
}

export const ArkoChatReplySchema = z.object({
  reply: z.string().trim().min(1).max(2000),
  intent: ChatIntentSchema,
  needsClarification: z.boolean(),
  clarifyingQuestion: z.string().trim().min(1).max(500).optional(),
  lookingForPeople: z.boolean(),
  relationship: RelationshipSchema.optional(),
  extractedNeed: ExtractedNeedSchema.optional(),
  extractedOffer: ExtractedOfferSchema.optional(),
  goal: z.string().trim().min(1).max(500).optional(),
})
export type ArkoChatReply = z.infer<typeof ArkoChatReplySchema>
