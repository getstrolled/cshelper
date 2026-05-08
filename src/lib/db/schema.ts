import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const maps = sqliteTable("maps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  imagePath: text("image_path"),
  /** Radar / labeled callouts diagram — shown instead of text chips */
  calloutsImagePath: text("callouts_image_path"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const callouts = sqliteTable("callouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mapId: integer("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const lineups = sqliteTable("lineups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mapId: integer("map_id")
    .notNull()
    .references(() => maps.id, { onDelete: "cascade" }),
  grenadeType: text("grenade_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  /** Self-hosted clip under public/, e.g. /uploads/uuid.mp4 (column was streamable_url). */
  videoPath: text("streamable_url").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  status: text("status").notNull().default("pending"),
  kind: text("kind").notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
});

export const mapsRelations = relations(maps, ({ many }) => ({
  callouts: many(callouts),
  lineups: many(lineups),
}));

export const calloutsRelations = relations(callouts, ({ one }) => ({
  map: one(maps, {
    fields: [callouts.mapId],
    references: [maps.id],
  }),
}));

export const lineupsRelations = relations(lineups, ({ one }) => ({
  map: one(maps, {
    fields: [lineups.mapId],
    references: [maps.id],
  }),
}));
