import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  getSessionToken,
  sessionCookieOptions,
  validatePassword,
} from '@/lib/auth';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const password = body?.password;

  if (!validatePassword(password)) {
    return NextResponse.json(
      { error: 'Invalid credentials.' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_COOKIE_NAME,
    getSessionToken(),
    sessionCookieOptions()
  );
  return response;
}
