// src/app/admin/login/page.js
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifySession } from '@/lib/auth';
import LoginForm from './LoginForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? null;

  if (verifySession(token)) {
    redirect('/admin');
  }

  return <LoginForm />;
}
