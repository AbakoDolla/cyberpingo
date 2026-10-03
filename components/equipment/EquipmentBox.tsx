import Image from "next/image";
import Link from "next/link";
import { photoCredit, type Equipment } from "@/data/equipment";

/** One photo with its name, a short line and the attribution the licence asks for. */
export function EquipmentTile({ device, sizes = "(max-width: 700px) 46vw, 220px", priority = false }: { device: Equipment; sizes?: string; priority?: boolean }) {
  return (
    <li className="equip-tile">
      <Link className="equip-tile__media" href={`/materiel#${device.id}`} aria-label={`${device.name} : voir la fiche du matériel`}>
        <Image src={device.photo} alt={device.alt} width={1200} height={900} sizes={sizes} priority={priority} />
      </Link>
      <strong>{device.name}</strong>
      <span>{device.pdfSummary}</span>
      <a className="equip-tile__credit" href={device.credit.pageUrl} target="_blank" rel="noopener noreferrer">{photoCredit(device)}</a>
    </li>
  );
}

/** 1 to 3 photos sit on one row, 4 stay on one row, 5 or 6 make two even rows of three. */
const columnsFor = (count: number): number => (count <= 4 ? count : count <= 6 ? 3 : 4);

/** A titled strip of photos, placed inside a lesson or a lab where the equipment is discussed. */
export default function EquipmentBox({ title, devices, tone = "lesson" }: { title: string; devices: Equipment[]; tone?: "lesson" | "lab" }) {
  if (devices.length === 0) return null;
  return (
    <aside className={`equip-box equip-box--${tone}${devices.length === 1 ? " equip-box--single" : ""}`} aria-label={title}>
      <p className="equip-box__title">{title}</p>
      <ul className="equip-box__grid" style={{ "--equip-cols": columnsFor(devices.length) } as React.CSSProperties}>
        {devices.map((device) => <EquipmentTile key={device.id} device={device} />)}
      </ul>
    </aside>
  );
}
