export const dynamic = 'force-dynamic';

export async function GET(req) {
  const country = req.headers.get('x-vercel-ip-country') || null;
  return new Response(JSON.stringify({ country }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
