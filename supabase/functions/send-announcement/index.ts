/**
 * Supabase Edge Function: send-announcement
 *
 * Sends an announcement to all active members via email.
 * Uses Resend (https://resend.com) — swap for SendGrid/Postmark as needed.
 *
 * Deploy:
 *   supabase functions deploy send-announcement
 *
 * Set secrets:
 *   supabase secrets set RESEND_API_KEY=re_xxxx
 *   supabase secrets set FROM_EMAIL=noreply@yourchurch.com
 *
 * Invoke from the app:
 *   const { data, error } = await supabase.functions.invoke('send-announcement', {
 *     body: { announcementId: '...' }
 *   })
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@church.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { announcementId } = await req.json()
    if (!announcementId) {
      return new Response(JSON.stringify({ error: 'announcementId is required' }), { status: 400 })
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch the announcement
    const { data: announcement, error: annErr } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single()

    if (annErr || !announcement) {
      return new Response(JSON.stringify({ error: 'Announcement not found' }), { status: 404 })
    }

    // Fetch all active member emails
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('email, first_name, last_name')
      .eq('membership_status', 'active')
      .not('email', 'is', null)

    if (memErr) throw memErr

    const emails = (members ?? []).map((m: { email: string }) => m.email).filter(Boolean)

    if (emails.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active members found' }), { status: 200 })
    }

    // Send via Resend (batch — one email, all members as BCC)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [FROM_EMAIL],          // send to yourself
        bcc: emails,               // BCC all members
        subject: `[Announcement] ${announcement.title}`,
        html: buildEmailHtml(announcement),
        text: buildEmailText(announcement),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend error: ${err}`)
    }

    return new Response(
      JSON.stringify({ sent: emails.length, message: `Sent to ${emails.length} members` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

function buildEmailHtml(a: Record<string, string>): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px;color:#1c1917;margin-bottom:8px">${a.title}</h1>
      <p style="color:#78716c;font-size:13px;margin-bottom:20px">
        ${a.category?.toUpperCase()} · Priority: ${a.priority?.toUpperCase()}
        ${a.expiry_date ? ` · Valid until ${new Date(a.expiry_date).toLocaleDateString()}` : ''}
      </p>
      <p style="color:#292524;font-size:15px;line-height:1.6">${a.content.replace(/\n/g, '<br>')}</p>
      ${a.contact_name ? `<hr style="margin:24px 0;border-color:#e7e5e4">
      <p style="color:#78716c;font-size:13px">Contact: ${a.contact_name}${a.contact_email ? ` · ${a.contact_email}` : ''}${a.contact_phone ? ` · ${a.contact_phone}` : ''}</p>` : ''}
    </div>
  `
}

function buildEmailText(a: Record<string, string>): string {
  return `${a.title}\n\n${a.content}\n\nCategory: ${a.category} | Priority: ${a.priority}${a.expiry_date ? `\nValid until: ${new Date(a.expiry_date).toLocaleDateString()}` : ''}`
}
