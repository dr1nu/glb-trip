export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-900">{children}</div>
  );
}
