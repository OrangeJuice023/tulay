import type { IntroductionRequest, NotificationType } from '@tulay/shared'
import { getAppUrl, getEmailEnv } from '../supabase/config'
import { sendEmail } from './resend'
import type { SupabaseCommunityRepository } from '../supabase/repository'

/**
 * Server-only delivery for introduction and collaboration events. Every event
 * writes a Supabase in-app notification (service role) and, only when email
 * is configured AND the recipient has a real auth email, sends one
 * transactional email. Demo members structurally cannot receive email: they
 * have no auth user, so the address lookup returns null and delivery is
 * skipped. Logs carry event ids and outcomes only — never addresses, names
 * or message contents.
 */

export type DeliveryOutcome = {
  notified: boolean
  emailed: 'sent' | 'skipped' | 'failed'
  emailId?: string
}

type EmailContent = { subject: string; text: string; idempotencyKey: string }

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function htmlShell(paragraphs: string[], cta: { label: string; href: string }): string {
  const body = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
  return `<div><p>Hi there,</p>${body}<p><a href="${escapeHtml(cta.href)}">${escapeHtml(cta.label)}</a></p><p>— The Tulay team</p></div>`
}

async function deliver(
  repo: SupabaseCommunityRepository,
  recipientProfileId: string,
  type: NotificationType,
  title: string,
  body: string,
  link: string,
  email: EmailContent | null,
  logLabel: string,
): Promise<DeliveryOutcome> {
  let notified = false
  try {
    notified = (await repo.insertNotification({ recipientProfileId, type, title, body, link, read: false })) !== null
  } catch {
    notified = false
  }

  let emailed: DeliveryOutcome['emailed'] = 'skipped'
  let emailId: string | undefined
  if (email) {
    const env = getEmailEnv()
    const address = env ? await repo.getRecipientEmail(recipientProfileId) : null
    if (env && address) {
      try {
        emailId = await sendEmail(env.apiKey, env.from, {
          to: address,
          subject: email.subject,
          text: email.text,
          html: htmlShell(
            email.text.split('\n\n'),
            { label: 'Open Tulay', href: `${getAppUrl()}${link}` },
          ),
          idempotencyKey: email.idempotencyKey,
        })
        emailed = 'sent'
      } catch {
        emailed = 'failed'
      }
    }
  }

  console.info(`[tulay][notify] ${logLabel} notified=${notified} emailed=${emailed}`)
  return { notified, emailed, emailId }
}

export async function notifyIntroductionReceived(
  repo: SupabaseCommunityRepository,
  intro: IntroductionRequest,
  senderName: string,
  needDescription: string,
): Promise<DeliveryOutcome> {
  const link = '/introductions'
  const title = `${senderName} would like an introduction`
  const body = `About: ${needDescription.slice(0, 200)} Sign in to accept or decline — nothing is shared until you accept.`
  return deliver(repo, intro.toProfileId, 'intro_received', title, body, link, {
    subject: `${senderName} would like to meet you on Tulay`,
    text: `${senderName} asked for an introduction on Tulay.\n\nAbout: ${needDescription}\n\nSign in to read their message and accept or decline. Your contact details stay private until you accept.\n\nOpen Tulay: ${getAppUrl()}${link}`,
    idempotencyKey: `tulay/intro-received/${intro.id ?? 'unknown'}`,
  }, `intro-received:${intro.id ?? 'unknown'}`)
}

export async function notifyIntroductionDecided(
  repo: SupabaseCommunityRepository,
  intro: IntroductionRequest,
  recipientName: string,
): Promise<DeliveryOutcome> {
  const link = intro.status === 'accepted' ? '/collaborations' : '/introductions'
  const accepted = intro.status === 'accepted'
  const title = accepted
    ? `${recipientName} accepted your introduction`
    : `${recipientName} can't meet right now`
  const body = accepted
    ? 'You can now see each other\'s contact method. Agree on one small next step together.'
    : 'No reason needed — try someone else in the directory, or refine your need with Arko.'
  return deliver(repo, intro.fromProfileId, accepted ? 'intro_accepted' : 'intro_declined', title, body, link, {
    subject: accepted
      ? `${recipientName} accepted your Tulay introduction`
      : `An update on your Tulay introduction`,
    text: accepted
      ? `${recipientName} accepted your introduction on Tulay.\n\nSign in to agree on one small next step together.\n\nOpen Tulay: ${getAppUrl()}${link}`
      : `${recipientName} can't meet right now. No reason is shared — try someone else in the directory.\n\nOpen Tulay: ${getAppUrl()}${link}`,
    idempotencyKey: `tulay/intro-decided/${intro.id ?? 'unknown'}`,
  }, `intro-decided:${intro.id ?? 'unknown'}`)
}

export async function notifyCollaborationUpdate(
  repo: SupabaseCommunityRepository,
  otherProfileId: string,
  collaborationId: string,
  actorName: string,
  summary: string,
): Promise<DeliveryOutcome> {
  const link = '/collaborations'
  return deliver(repo, otherProfileId, 'collab_update', `${actorName} updated your collaboration`, summary.slice(0, 400), link, {
    subject: `${actorName} updated your Tulay collaboration`,
    text: `${actorName} updated your collaboration on Tulay.\n\n${summary}\n\nOpen Tulay: ${getAppUrl()}${link}`,
    idempotencyKey: `tulay/collab-update/${collaborationId}/${Date.now()}`,
  }, `collab-update:${collaborationId}`)
}

export async function notifyOutcomeSubmitted(
  repo: SupabaseCommunityRepository,
  otherProfileId: string,
  collaborationId: string,
  actorName: string,
  helped: string,
): Promise<DeliveryOutcome> {
  const link = '/collaborations'
  const body = `${actorName} recorded their outcome (${helped}). Add yours so you both remember what worked.`
  return deliver(repo, otherProfileId, 'outcome_submitted', 'Your collaborator recorded an outcome', body, link, null, `outcome:${collaborationId}`)
}
