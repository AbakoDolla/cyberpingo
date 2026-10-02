import type { Json } from "@/types/database.types";
import type { LessonBlock } from "@/types/api";

const TEXT_TYPES = new Set(["text", "heading", "schema", "example", "callout"]);
const MEDIA_TYPES = new Set(["video", "image", "resource"]);

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isHttpUrl = (value: unknown): value is string => typeof value === "string" && /^https:\/\/\S+$/.test(value);

/**
 * Reads lessons.content ({"blocks": [...]}) defensively. The database already validates the shape
 * on write; this keeps the UI safe if an unknown block type is added later (it is skipped).
 */
export function parseLessonBlocks(content: Json | null | undefined): LessonBlock[] {
  if (!isRecord(content) || !Array.isArray(content.blocks)) return [];
  const blocks: LessonBlock[] = [];
  for (const raw of content.blocks) {
    if (!isRecord(raw) || typeof raw.type !== "string") continue;
    if (raw.type === "code" && typeof raw.content === "string") {
      blocks.push({ type: "code", content: raw.content, language: typeof raw.language === "string" ? raw.language : undefined });
    } else if (TEXT_TYPES.has(raw.type) && typeof raw.content === "string") {
      blocks.push({ type: raw.type as "text", content: raw.content });
    } else if (MEDIA_TYPES.has(raw.type) && isHttpUrl(raw.url)) {
      blocks.push({ type: raw.type as "video", url: raw.url, content: typeof raw.content === "string" ? raw.content : undefined });
    }
  }
  return blocks;
}

/** Turns a YouTube/Vimeo page URL into its embeddable URL; other https URLs are played as files. */
export function videoEmbed(url: string): { kind: "iframe" | "file"; src: string } {
  const youtube = url.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,20})/);
  if (youtube) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${youtube[1]}` };
  const vimeo = url.match(/^https:\/\/(?:www\.)?vimeo\.com\/(\d{4,12})/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { kind: "file", src: url };
}

const VIDEO_PENDING = /^Vidéo à venir\s*:\s*(.+)$/u;

/** A callout written as "Vidéo à venir : titre" marks a video the team has not published yet. */
export function pendingVideoTitle(content: string): string | null {
  return VIDEO_PENDING.exec(content.trim())?.[1]?.trim() || null;
}