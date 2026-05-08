import { z } from "zod";

export const lineupVideoPathSchema = z
  .string()
  .trim()
  .regex(
    /^\/uploads\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(mp4|webm|mov|mkv|m4v)$/i,
    "use an uploaded path like /uploads/<uuid>.mp4",
  );

export function parseLineupVideoPath(raw: string): string {
  return lineupVideoPathSchema.parse(raw);
}
