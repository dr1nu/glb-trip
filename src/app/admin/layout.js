export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-4 py-10">{children}</div>
    </div>
  );
}
