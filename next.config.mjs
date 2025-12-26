/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/trip-planner/app",
  // Ensure public Supabase env vars are available at build time in all environments.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
