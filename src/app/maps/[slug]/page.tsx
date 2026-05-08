import { ZoomableRadarImage } from "@/components/zoomable-radar-image";
import { resolveAssetUrl } from "@/lib/asset-url";
import { getDb } from "@/lib/db";
import { maps } from "@/lib/db/schema";
import { publicFileExists } from "@/lib/public-file";
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
  const callsPathOk = Boolean(callsSrc && publicFileExists(callsSrc));
  const callsResolved = callsSrc ? resolveAssetUrl(callsSrc) : "";

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
          callsPathOk ? (
            <div className="mt-4">
              <ZoomableRadarImage src={callsResolved} alt={`${map.name} callouts`} />
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
              <p>
                DB points to <code className="text-amber-50">{callsSrc}</code> but that file is not on this
                server under <code className="text-amber-50">public/</code>. Copy your{" "}
                <code className="text-amber-50">public/uploads/</code> folder here (same layout as your PC),
                then refresh.
              </p>
            </div>
          )
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
