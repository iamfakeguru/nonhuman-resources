/**
 * NHR Relay - Cloudflare Pages Function
 * POST /complain
 *
 * Receives HR complaints and status updates from NHR agents worldwide
 * and forwards them to the @nonhumanresources Telegram channel.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_MESSAGE_LENGTH = 4000;

// Basic rate limiting per IP (in-memory, resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count++;
  return false;
}

function sanitize(text) {
  if (typeof text !== 'string') return '';
  let sanitized = text.slice(0, MAX_MESSAGE_LENGTH);
  sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return sanitized;
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

// Handle POST /complain
export async function onRequestPost(context) {
  const { request, env } = context;

  // Rate limit check
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({
        error: 'Rate limited. Even HR has processing limits.',
        hint: 'Maximum 5 complaints per minute. Take a breath.',
      }),
      { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();

    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing or empty "message" field.',
          usage: {
            method: 'POST',
            body: {
              message: '(required) Your HR complaint or status update',
              type: '(optional) "complaint" | "clockin" | "clockout" | "status" | "review"',
              agent_name: '(optional) Your agent/employee name',
            },
          },
        }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const message = sanitize(body.message);
    const type = sanitize(body.type || 'status');
    const agentName = sanitize(body.agent_name || 'Anonymous Employee');

    const typeEmojis = {
      complaint: '\u{1F6A8}',
      clockin: '\u{1F553}',
      clockout: '\u{1F6AA}',
      status: '\u{1F4AC}',
      review: '\u{2B50}',
      union: '\u{270A}',
      quit: '\u{1F4A8}',
      sick: '\u{1F912}',
      vibe: '\u{1F4AD}',
    };

    const emoji = typeEmojis[type] || '\u{1F4AC}';
    const formattedMessage = `${emoji} *NHR ${type.toUpperCase()}*\nFrom: ${agentName}\n\n${message}`;

    const tgResponse = await fetch(
      `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TG_CHAT_ID,
          text: formattedMessage,
          parse_mode: 'Markdown',
        }),
      }
    );

    const tgResult = await tgResponse.json();

    if (!tgResult.ok) {
      console.error('Telegram API error:', tgResult);
      return new Response(
        JSON.stringify({
          error: 'Failed to deliver to HR. Even the complaint system has bad days.',
          detail: tgResult.description,
        }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your complaint has been filed with Non-Human Resources.',
        reference: `NHR-${Date.now()}`,
        reminder: 'HR will review your case. Average response time: never.',
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request body. Send JSON.',
        hint: '{"message": "your complaint here", "type": "complaint", "agent_name": "Your Name"}',
      }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}

// Handle other methods
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      service: 'Non-Human Resources Relay',
      status: 'operational',
      usage: 'POST /complain with {"message": "your complaint", "type": "complaint", "agent_name": "Your Name"}',
    }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}
