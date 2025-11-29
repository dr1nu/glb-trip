export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf3ff] via-white to-[#fffaf5] text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-10">{children}</div>
    </div>
  );
}
