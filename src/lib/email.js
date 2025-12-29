const RESEND_API_URL = 'https://api.resend.com/emails';

function resolveAppUrl(request) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  try {
    const host =
      request?.headers?.get('x-forwarded-host') ||
      request?.headers?.get('host');
    const proto = request?.headers?.get('x-forwarded-proto') || 'http';
    if (host) return `${proto}://${host}`;
    return new URL(request.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

function formatTravelerCount(contact) {
  if (!contact) return null;
  const adults = Number.isFinite(contact.adults) ? contact.adults : 0;
  const children = Number.isFinite(contact.children) ? contact.children : 0;
  const total = adults + children;
  if (total <= 0) return null;
  return `${total} traveler${total === 1 ? '' : 's'}`;
}

function buildTripPublishedEmail({ trip, appUrl }) {
  const contact = trip?.contact || {};
  const firstName =
    contact.firstName ||
    (typeof contact.name === 'string' ? contact.name.split(' ')[0] : '') ||
    'there';
  const destination = trip?.destinationCountry || 'your destination';
  const tripDays =
    Number.isFinite(trip?.tripLengthDays) && trip.tripLengthDays > 0
      ? `${trip.tripLengthDays} days`
      : null;
  const travelerCount = formatTravelerCount(contact);
  const tripLink = `${appUrl}/trip/${trip.id}`;
  const paymentRequired = trip?.billingStatus === 'pending';

  const summaryParts = [destination, tripDays, travelerCount].filter(Boolean);
  const summary = summaryParts.length > 0 ? summaryParts.join(' · ') : null;
  const subject = `Your trip itinerary is ready`;

  const preheader = paymentRequired
    ? 'Your itinerary is ready. Complete payment to unlock full details.'
    : 'Your itinerary is ready to view.';

  const paymentLine = paymentRequired
    ? `<p style="margin:0 0 12px;color:#5b4b2a;">
        Payment is still pending. You can complete payment from the trip page to unlock full details.
      </p>`
    : '';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f6f2ea;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
      <tr>
        <td style="padding:32px 12px;">
          <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0e7d8;">
            <tr>
              <td style="padding:28px 32px 12px;background:#fff6e8;">
                <div style="font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#b45309;">Gloab</div>
                <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;color:#111827;">Your itinerary is ready</h1>
                <p style="margin:0;color:#6b7280;font-size:15px;">Hi ${firstName}, your trip is ready for viewing.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;">
                ${
                  summary
                    ? `<p style="margin:0 0 12px;color:#111827;font-size:15px;"><strong>${summary}</strong></p>`
                    : ''
                }
                <p style="margin:0 0 12px;color:#374151;">
                  We have put together your plan with flights, stays, and a day-by-day timeline.
                </p>
                ${paymentLine}
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0 8px;">
                  <tr>
                    <td style="background:#f97316;border-radius:999px;">
                      <a href="${tripLink}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">View your trip</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">
                  If the button does not work, copy and paste this link into your browser:
                  <br />
                  <a href="${tripLink}" style="color:#f97316;text-decoration:none;">${tripLink}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 28px;border-top:1px solid #f1e6d2;">
                <p style="margin:0;color:#6b7280;font-size:12px;">
                  Need help? Reply to this email and we will take care of it.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;text-align:center;color:#a8a29e;font-size:11px;">
            This is a transactional email about your trip request.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    `Hi ${firstName},`,
    '',
    'Your itinerary is ready.',
    summary ? `Trip: ${summary}` : null,
    paymentRequired
      ? 'Payment is still pending. You can complete payment from the trip page to unlock full details.'
      : null,
    '',
    `View your trip: ${tripLink}`,
    '',
    'Need help? Reply to this email and we will take care of it.',
  ].filter(Boolean);

  return {
    subject,
    html,
    text: textLines.join('\n'),
  };
}

export async function sendTripPublishedEmail({ trip, request }) {
  const recipient = trip?.contact?.email;
  if (!recipient || typeof recipient !== 'string') {
    return { skipped: true, reason: 'missing_recipient' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { skipped: true, reason: 'missing_email_config' };
  }

  const appUrl = resolveAppUrl(request);
  const { subject, html, text } = buildTripPublishedEmail({ trip, appUrl });

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to send email: ${response.status} ${body}`);
  }

  return { ok: true };
}
