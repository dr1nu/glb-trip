import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, clearCookieOptions } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', clearCookieOptions());
  return response;
}
