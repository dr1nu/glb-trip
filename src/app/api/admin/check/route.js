import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth';

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: 'Access forbidden' }, { status: 403 });
  }
  return NextResponse.json({ ok: true, email: adminUser.email ?? null });
}
