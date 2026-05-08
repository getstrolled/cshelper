import { eq } from "drizzle-orm";
import { z } from "zod";
import type { getDb } from "@/lib/db";
import { callouts, lineups, maps } from "@/lib/db/schema";
import { lineupVideoPathSchema } from "@/lib/lineup-video";

const grenades = z.enum(["smoke", "flash", "molly", "he"]);

const lineupCreate = z.object({
  kind: z.literal("lineup_create"),
  mapId: z.number().int(),
  grenadeType: grenades,
  title: z.string().min(1).max(200),
  description: z.string().max(4000),
  videoPath: lineupVideoPathSchema,
});

const lineupUpdate = z.object({
  kind: z.literal("lineup_update"),
  id: z.number().int(),
  mapId: z.number().int(),
  grenadeType: grenades,
  title: z.string().min(1).max(200),
  description: z.string().max(4000),
  videoPath: lineupVideoPathSchema,
});

const lineupDelete = z.object({
  kind: z.literal("lineup_delete"),
  id: z.number().int(),
});

const calloutCreate = z.object({
  kind: z.literal("callout_create"),
  mapId: z.number().int(),
  name: z.string().min(1).max(120),
});

const calloutDelete = z.object({
  kind: z.literal("callout_delete"),
  id: z.number().int(),
});

export const submissionPayloadSchema = z.discriminatedUnion("kind", [
  lineupCreate,
  lineupUpdate,
  lineupDelete,
  calloutCreate,
  calloutDelete,
]);

export type SubmissionPayload = z.infer<typeof submissionPayloadSchema>;

export async function applySubmissionPayload(
  db: ReturnType<typeof getDb>,
  raw: unknown,
): Promise<void> {
  const payload = submissionPayloadSchema.parse(raw);

  switch (payload.kind) {
    case "lineup_create": {
      const path = payload.videoPath;
      await db.insert(lineups).values({
        mapId: payload.mapId,
        grenadeType: payload.grenadeType,
        title: payload.title.trim(),
        description: payload.description.trim(),
        videoPath: path,
      });
      break;
    }
    case "lineup_update": {
      const path = payload.videoPath;
      await db
        .update(lineups)
        .set({
          mapId: payload.mapId,
          grenadeType: payload.grenadeType,
          title: payload.title.trim(),
          description: payload.description.trim(),
          videoPath: path,
        })
        .where(eq(lineups.id, payload.id));
      break;
    }
    case "lineup_delete": {
      await db.delete(lineups).where(eq(lineups.id, payload.id));
      break;
    }
    case "callout_create": {
      await db.insert(callouts).values({
        mapId: payload.mapId,
        name: payload.name.trim(),
      });
      break;
    }
    case "callout_delete": {
      await db.delete(callouts).where(eq(callouts.id, payload.id));
      break;
    }
  }
}

const mapCreate = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
});

export async function createMap(db: ReturnType<typeof getDb>, input: unknown) {
  const parsed = mapCreate.parse(input);
  await db.insert(maps).values({
    slug: parsed.slug,
    name: parsed.name.trim(),
    sortOrder: parsed.sortOrder ?? 0,
  });
}
