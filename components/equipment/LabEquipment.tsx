import { equipmentForLab } from "@/data/equipment";
import EquipmentBox from "@/components/equipment/EquipmentBox";

/** The real devices a lab talks about, shown once under the briefing. */
export default function LabEquipment({ slug }: { slug: string }) {
  const devices = equipmentForLab(slug);
  if (devices.length === 0) return null;
  return <EquipmentBox title="Le matériel de ce lab, en vrai" devices={devices} tone="lab" />;
}
