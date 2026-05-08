/**
 * Sets each map's imagePath to /maps/{slug}.png (run after downloading thumbs).
 * Images are game-derived thumbnails (see scripts/download-map-images.ps1), not scraped from FACEIT.
 */
import { getDb } from "@/lib/db";
import { maps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SLUGS = [
  "dust2",
  "mirage",
  "inferno",
  "nuke",
  "ancient",
  "anubis",
  "cache",
  "overpass",
];

async function main() {
  const db = getDb();
  for (const slug of SLUGS) {
    await db.update(maps).set({ imagePath: `/maps/${slug}.png` }).where(eq(maps.slug, slug));
    console.log("set image:", slug);
  }
  console.log("done");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
