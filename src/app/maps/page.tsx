import { MapThumb } from "@/components/map-thumb";
import { getDb } from "@/lib/db";
import { maps } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MapsPage() {
  const db = getDb();
  const rows = await db.select().from(maps).orderBy(asc(maps.name));

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-100">maps</h1>
        <p className="mt-1 text-sm text-stone-400">active duty pool — pick one.</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-stone-400">
          Nothing yet — dm <span className="text-stone-300">@get_strolled</span> if you want to
          contribute.
        </p>
      ) : (
      <ul className="grid gap-5 sm:grid-cols-2">
        {rows.map((m) => (
          <li key={m.id}>
            <Link
              href={`/maps/${m.slug}`}
              className="block overflow-hidden rounded-xl border border-stone-700 bg-stone-900 shadow-sm transition hover:border-stone-600"
            >
              <MapThumb src={m.imagePath} alt={m.name} />
              <div className="px-4 py-3">
                <span className="font-medium text-stone-100">{m.name}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </main>
  );
}
