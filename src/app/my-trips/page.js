import Link from 'next/link';
import { Lock } from 'lucide-react';
import { listTripsByOwner } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import MyTripsClient from './_components/MyTripsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRIP_IMAGE_BUCKET = 'trip-country-images';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function buildPublicStorageUrl(path) {
  if (!path || !SUPABASE_URL) return null;
  const encoded = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${TRIP_IMAGE_BUCKET}/${encoded}`;
}

export default async function MyTripsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#f7faff] via-white to-[#fff7ef] px-4 py-14 text-neutral-900">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center">
          <div className="w-full rounded-[28px] border border-neutral-200 bg-white px-6 py-12 text-center shadow-xl shadow-orange-100/60 sm:px-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500">
              <Lock className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold text-neutral-900">Sign in to view your trips</h1>
            <p className="mt-3 text-sm text-neutral-600">
              Create an account or sign in to access your personalized travel itineraries and
              bookings.
            </p>
            <Link
              href="/account"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow shadow-orange-200 transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const trips = await listTripsByOwner(user.id);
  const storage = supabase.storage.from(TRIP_IMAGE_BUCKET);
  const tripsWithImages = trips.map((trip) => {
    if (trip.imagePath) {
      const directUrl = buildPublicStorageUrl(trip.imagePath);
      const { data } = storage.getPublicUrl(trip.imagePath);
      const publicUrl = data?.publicUrl || directUrl;
      return { ...trip, imageUrl: publicUrl };
    }
    return { ...trip, imageUrl: null };
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#E9F2FF] via-white to-[#FFF6ED] text-neutral-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <MyTripsClient trips={tripsWithImages} />
      </div>
    </main>
  );
}
