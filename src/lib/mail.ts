import nodemailer, { type Transporter } from 'nodemailer';
import { fmtDateTime, ticketNo } from './format';
import type { Ticket } from './types';

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/** Sends an email; never throws, so a mail problem cannot block ticket handling. */
export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[mail skipped - SMTP not configured] to=${to} subject="${subject}"`);
    return;
  }
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || `HO Helpdesk <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[mail error]', err);
  }
}

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function layout(title: string, rows: [string, string | null][], footer = ''): string {
  const body = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap">${esc(k)}</td>` +
        `<td style="padding:6px 0;color:#0f172a">${esc(v).replace(/\n/g, '<br>')}</td></tr>`,
    )
    .join('');
  return `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
  <div style="background:#1f5bc4;color:#fff;padding:14px 20px;font-size:16px;font-weight:600">Aquarius House · HO Helpdesk</div>
  <div style="padding:20px">
    <h2 style="margin:0 0 14px;font-size:18px;color:#0f172a">${esc(title)}</h2>
    <table style="border-collapse:collapse;font-size:14px">${body}</table>
    ${footer}
  </div>
  <div style="padding:10px 20px;background:#f8fafc;color:#94a3b8;font-size:12px">This is an automated message. Please do not reply.</div>
</div>`;
}

function location(t: Ticket): string {
  return [t.floor, t.area, t.location_detail].filter(Boolean).join(' – ');
}

export function registeredEmail(t: Ticket): { subject: string; html: string } {
  const no = ticketNo(t.id);
  return {
    subject: `Ticket ${no} registered – ${t.category}`,
    html: layout(
      `Your ${t.type.toLowerCase()} has been registered`,
      [
        ['Ticket No.', no],
        ['Type', t.type],
        ['Location', location(t)],
        ['Category', t.category],
        ['Description', t.description],
        ['Registered on', fmtDateTime(t.created_at)],
      ],
      `<p style="font-size:14px;color:#334155;margin-top:16px">${
        t.type === 'Suggestion'
          ? 'Thank you. HR &amp; Admin will review your suggestion.'
          : 'The housekeeping supervisor has been notified. You will receive an email once it is resolved.'
      }</p>`,
    ),
  };
}

export function closedEmail(t: Ticket, reopenUrl: string | null): { subject: string; html: string } {
  const no = ticketNo(t.id);
  const isSuggestion = t.type === 'Suggestion';
  const footer = reopenUrl
    ? `<p style="font-size:14px;color:#334155;margin-top:18px">Not resolved to your satisfaction?</p>
       <a href="${esc(reopenUrl)}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Reopen this ticket</a>`
    : '';
  return {
    subject: `Ticket ${no} ${isSuggestion ? 'reviewed' : 'resolved'} – ${t.category}`,
    html: layout(
      isSuggestion ? 'Your suggestion has been reviewed' : 'Your complaint has been resolved',
      [
        ['Ticket No.', no],
        ['Location', location(t)],
        ['Your request', t.description],
        [isSuggestion ? 'Remarks' : 'Action taken', t.action_taken],
        ['Attended by', t.attended_by],
        ['Closed by', t.closed_by],
        ['Closed on', fmtDateTime(t.closed_at)],
      ],
      footer,
    ),
  };
}
