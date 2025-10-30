import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'change-me';
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'dev-secret';
export const ADMIN_COOKIE_NAME = 'glb_admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function buildSessionSeed() {
  return `${ADMIN_PASSWORD}|${process.env.NODE_ENV ?? 'development'}`;
}

function sessionToken() {
  return crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(buildSessionSeed())
    .digest('hex');
}

export function validatePassword(candidate) {
  return typeof candidate === 'string' && candidate === ADMIN_PASSWORD;
}

export function getSessionToken() {
  return sessionToken();
}

export function verifySession(token) {
  if (typeof token !== 'string') return false;
  const expected = sessionToken();
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return (
    tokenBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
  );
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  };
}
