import placements from "@/data/lesson-equipment.json";
import { equipmentById, type Equipment } from "@/data/equipment";
import { parseFigure } from "@/lib/figure-spec";
import type { LessonBlock } from "@/types/api";

export type EquipmentBoxData = { title: string; devices: Equipment[] };

type RawPlacement = { after: string; title: string; devices: string[] };

const lessons = placements.lessons as Record<string, { title: string; placements: RawPlacement[] }>;
export const TEXTUAL_BLOCKS = new Set<LessonBlock["type"]>(["text", "schema", "example", "code"]);
const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * The text a photo box can be anchored on: the beginning of a paragraph, of an example or of a code block, and for a drawn
 * schema (a figure) its title, because the stored JSON is not something an author reads.
 */
export function anchorTextOf(block: LessonBlock): string {
  if (!("content" in block) || typeof block.content !== "string") return "";
  if (block.type === "schema") {
    const figure = parseFigure(block.content);
    if (figure) return collapse(figure.title ?? "");
  }
  return collapse(block.content);
}

/**
 * The photo boxes of a lesson, keyed by the index of the block they follow. A box is anchored on the beginning of
 * a paragraph, so it survives a reordering done in the console; if the paragraph was rewritten, the box closes the
 * lesson instead of disappearing.
 */
export function equipmentBoxes(lessonId: string, blocks: readonly LessonBlock[]): Map<number, EquipmentBoxData[]> {
  const result = new Map<number, EquipmentBoxData[]>();
  const entry = lessons[lessonId];
  if (!entry || blocks.length === 0) return result;
  for (const placement of entry.placements) {
    const devices = placement.devices.map(equipmentById).filter((device): device is Equipment => Boolean(device));
    if (devices.length === 0) continue;
    const found = blocks.findIndex((block) => TEXTUAL_BLOCKS.has(block.type) && anchorTextOf(block).startsWith(placement.after));
    const index = found >= 0 ? found : blocks.length - 1;
    result.set(index, [...(result.get(index) ?? []), { title: placement.title, devices }]);
  }
  return result;
}

/** Every anchor of the file, for the tests that check it against the seeded lessons. */
export const lessonEquipmentAnchors = (): Array<{ lessonId: string; title: string; after: string; devices: string[] }> =>
  Object.entries(lessons).flatMap(([lessonId, entry]) => entry.placements.map((placement) => ({ lessonId, title: entry.title, after: placement.after, devices: placement.devices })));
