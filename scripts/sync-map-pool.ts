/**
 * Sync map rows to scripts/map-pool.ts:
 * inserts missing slugs, updates sort/name, deletes maps no longer in the pool (cascades lineups/callouts).
 */
import { getDb } from "@/lib/db";
import { maps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_MAPS } from "./map-pool";

async function main() {
  const db = getDb();
  const allowedSlugs = new Set(DEFAULT_MAPS.map((m) => m.slug));

  const existingRows = await db.select().from(maps);
  for (const row of existingRows) {
    if (!allowedSlugs.has(row.slug)) {
      await db.delete(maps).where(eq(maps.id, row.id));
      console.log("removed map:", row.slug);
    }
  }

  for (const m of DEFAULT_MAPS) {
    const [found] = await db.select().from(maps).where(eq(maps.slug, m.slug)).limit(1);
    if (found) {
      await db
        .update(maps)
        .set({ name: m.name, sortOrder: m.sortOrder })
        .where(eq(maps.id, found.id));
      console.log("updated map:", m.slug);
    } else {
      await db.insert(maps).values({
        slug: m.slug,
        name: m.name,
        sortOrder: m.sortOrder,
      });
      console.log("added map:", m.slug);
    }
  }

  console.log("map pool sync ok");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
