import { getDb } from "@/lib/db";
import { maps } from "@/lib/db/schema";
import { DEFAULT_MAPS } from "./map-pool";

async function main() {
  const db = getDb();
  const existing = await db.select({ id: maps.id }).from(maps).limit(1);
  if (existing.length > 0) {
    console.log("db already has maps, skipping seed");
    process.exit(0);
  }
  for (const m of DEFAULT_MAPS) {
    await db.insert(maps).values({
      slug: m.slug,
      name: m.name,
      sortOrder: m.sortOrder,
    });
  }
  console.log("seeded maps ok");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
