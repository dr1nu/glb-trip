// src/app/admin/login/page.js
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const adminUser = await getAdminUser();
  if (adminUser) {
    redirect('/admin');
  }

  return <LoginForm />;
}
