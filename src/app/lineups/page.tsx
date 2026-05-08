import { LineupVideoPrefetch } from "@/components/lineup-video-prefetch";
import { resolveAssetUrl } from "@/lib/asset-url";
import { getDb } from "@/lib/db";
import { lineups, maps } from "@/lib/db/schema";
import { publicFileExists } from "@/lib/public-file";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const EMPTY_CONTRIBUTE = (
  <>
    Nothing yet — dm <span className="text-stone-300">@get_strolled</span> if you want to contribute.
  </>
);

function LineupClip({
  src,
  title,
  fileMissing,
}: {
  src: string;
  title: string;
  fileMissing?: boolean;
}) {
  if (!src.startsWith("/uploads/")) {
    return (
      <div className="border-t border-stone-800 bg-stone-950 px-4 py-5">
        <p className="text-sm text-amber-200/90">
          This lineup still uses an old external clip URL. Replace it from{" "}
          <Link href="/edit" className="underline hover:text-amber-100">
            edit
          </Link>{" "}
          with an uploaded video path (<code className="text-stone-400">/uploads/…</code>
          ).
        </p>
      </div>
    );
  }

  if (fileMissing) {
    return (
      <div className="border-t border-stone-800 bg-stone-950 px-4 py-5">
        <p className="text-sm text-amber-200/90">
          DB path <code className="text-stone-300">{src}</code> has no matching file under{" "}
          <code className="text-stone-300">public/</code> on this server. Copy{" "}
          <code className="text-stone-300">public/uploads/</code> from your PC (same paths).
        </p>
      </div>
    );
  }

  const streamSrc = resolveAssetUrl(src);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video
        title={`clip — ${title}`}
        src={streamSrc}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

type Props = {
  searchParams: Promise<{ map?: string; q?: string; type?: string }>;
};

const inputSelect =
  "rounded-lg border border-stone-600 bg-stone-950 px-3 py-2 text-stone-100";

export default async function LineupsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const mapParam = (sp.map ?? "").trim();
  const mapIdParsed = mapParam ? Number.parseInt(mapParam, 10) : NaN;
  const mapSelected =
    mapParam !== "" && !Number.isNaN(mapIdParsed) && mapIdParsed > 0;

  const q = (sp.q ?? "").trim().toLowerCase();
  const typeFilter = sp.type?.trim();

  const db = getDb();
  const joined = await db
    .select({
      lineup: lineups,
      mapName: maps.name,
      mapSlug: maps.slug,
    })
    .from(lineups)
    .innerJoin(maps, eq(lineups.mapId, maps.id));

  const mapRows = await db.select().from(maps).orderBy(asc(maps.name));

  let rows = joined;
  if (mapSelected) {
    rows = rows.filter((r) => r.lineup.mapId === mapIdParsed);
  }
  if (typeFilter && ["smoke", "flash", "molly", "he"].includes(typeFilter)) {
    rows = rows.filter((r) => r.lineup.grenadeType === typeFilter);
  }
  if (q) {
    rows = rows.filter(
      (r) =>
        r.lineup.title.toLowerCase().includes(q) ||
        r.lineup.description.toLowerCase().includes(q),
    );
  }

  const prefetchClips = (() => {
    const seen = new Set<string>();
    const out: { url: string; title: string }[] = [];
    for (const r of rows) {
      const p = r.lineup.videoPath;
      if (!p.startsWith("/uploads/")) continue;
      if (!publicFileExists(p)) continue;
      const url = resolveAssetUrl(p);
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ url, title: r.lineup.title });
    }
    return out;
  })();

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-100">lineups</h1>
      </div>

      <form
        className="flex flex-col gap-3 rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
        method="get"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-500">map</span>
          <select
            name="map"
            defaultValue={sp.map ?? ""}
            className={inputSelect}
          >
            <option value="">all maps</option>
            {mapRows.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-500">type</span>
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className={inputSelect}
          >
            <option value="">all</option>
            <option value="smoke">smoke</option>
            <option value="flash">flash</option>
            <option value="molly">molly</option>
            <option value="he">he</option>
          </select>
        </label>
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-stone-500">search</span>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="smoke mid..."
            className={inputSelect}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-stone-100"
        >
          go
        </button>
      </form>

      {joined.length > 0 && rows.length > 0 ? (
        <LineupVideoPrefetch clips={prefetchClips} />
      ) : null}

      {joined.length === 0 ? (
        <p className="text-stone-400">{EMPTY_CONTRIBUTE}</p>
      ) : rows.length === 0 ? (
        <p className="text-stone-400">Nothing matches those filters.</p>
      ) : (
        <ul className="flex flex-col gap-8">
          {rows.map(({ lineup: l, mapName, mapSlug }) => (
            <li
              key={l.id}
              className="overflow-hidden rounded-xl border border-stone-700 bg-stone-900 shadow-sm"
            >
              <div className="border-b border-stone-800 px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-stone-100">{l.title}</span>
                  <span className="rounded bg-stone-800 px-2 py-0.5 text-xs uppercase text-stone-400">
                    {l.grenadeType}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  <Link href={`/maps/${mapSlug}`} className="hover:text-stone-300">
                    {mapName}
                  </Link>
                </p>
                {l.description ? (
                  <p className="mt-2 text-sm text-stone-300">{l.description}</p>
                ) : null}
              </div>
              <LineupClip
                src={l.videoPath}
                title={l.title}
                fileMissing={
                  l.videoPath.startsWith("/uploads/") && !publicFileExists(l.videoPath)
                }
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
