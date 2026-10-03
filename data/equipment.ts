import catalogue from "./equipment.json";
import credits from "./equipment-credits.json";

export type EquipmentCategory = "entreprise" | "personnel";

export type EquipmentCredit = {
  title: string;
  pageUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  altFr: string;
  creditShort: string;
  changes: string;
};

export type Equipment = {
  id: string;
  name: string;
  category: EquipmentCategory;
  group: string;
  photo: string;
  caption: string;
  summary: string;
  pdfSummary: string;
  risk: string;
  habit: string;
  courses: string[];
  alt: string;
  credit: EquipmentCredit;
};

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = { entreprise: "En entreprise", personnel: "À la maison et sur soi" };
export const COURSE_LABELS: Record<string, string> = { reseaux: "Réseaux informatiques", fondamentaux: "Fondamentaux de la cybersécurité", linux: "Administration Linux" };

const creditsById = credits as Record<string, EquipmentCredit>;

export const equipment: Equipment[] = (catalogue.devices as Array<Omit<Equipment, "alt" | "credit">>).map((device) => ({
  ...device,
  alt: creditsById[device.id].altFr,
  credit: creditsById[device.id],
}));

const byId = new Map(equipment.map((device) => [device.id, device]));
const byPhoto = new Map(equipment.map((device) => [device.photo, device]));

export const equipmentById = (id: string): Equipment | undefined => byId.get(id);

/** The device a lesson image points to, when the picture is one of the catalogue photos. */
export const equipmentFromPhoto = (url: string): Equipment | undefined => byPhoto.get(url);

/** The devices a lab handles, in the order the lab talks about them. */
export function equipmentForLab(slug: string): Equipment[] {
  const ids = (catalogue.labs as Record<string, string[]>)[slug] ?? [];
  return ids.map((id) => byId.get(id)).filter((device): device is Equipment => Boolean(device));
}

/** "Photo : Auteur, CC BY-SA 4.0", the attribution shown under every picture. */
export const photoCredit = (device: Equipment): string => `Photo : ${device.credit.creditShort}`;
