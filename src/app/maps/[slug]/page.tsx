import { ZoomableRadarImage } from "@/components/zoomable-radar-image";
import { getDb } from "@/lib/db";
import { maps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function MapDetailPage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();
  const [map] = await db.select().from(maps).where(eq(maps.slug, slug)).limit(1);
  if (!map) notFound();

  const callsSrc = map.calloutsImagePath?.trim();

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link href="/maps" className="text-sm text-stone-500 hover:text-stone-300">
            ← maps
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-stone-100">{map.name}</h1>
        </div>
      </div>

      <section className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          calls
        </h2>
        {callsSrc ? (
          <div className="mt-4">
            <ZoomableRadarImage src={callsSrc} alt={`${map.name} callouts`} />
          </div>
        ) : (
          <p className="mt-4 text-stone-400">
            Nothing yet — dm <span className="text-stone-300">@get_strolled</span> if you want to
            contribute.
          </p>
        )}
      </section>
    </main>
  );
}
