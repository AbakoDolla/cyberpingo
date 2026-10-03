import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS, COURSE_LABELS, equipment, photoCredit, type Equipment, type EquipmentCategory } from "@/data/equipment";

export const metadata: Metadata = {
  title: "Le matériel en photos",
  description: "Switch, routeur, pare-feu, serveur, NAS, portable, smartphone, clé de sécurité : chaque équipement d’une entreprise ou d’un foyer en photo réelle, avec son risque et le bon réflexe.",
};

const SECTIONS: Array<{ id: EquipmentCategory; intro: string }> = [
  { id: "entreprise", intro: "Réseau, serveurs, postes et sécurité physique : ce que tu croises dans une PME, une association ou une école." },
  { id: "personnel", intro: "Ce que tu as sous la main chaque jour : appareils, maison connectée et supports de stockage." },
];

function groupsOf(category: EquipmentCategory): Array<{ name: string; devices: Equipment[] }> {
  const groups = new Map<string, Equipment[]>();
  for (const device of equipment.filter((entry) => entry.category === category)) groups.set(device.group, [...(groups.get(device.group) ?? []), device]);
  return [...groups].map(([name, devices]) => ({ name, devices }));
}

const commonsTitle = (title: string) => title.replace(/^File:/, "").replace(/\.[A-Za-z0-9]+$/, "");

function DeviceCard({ device, priority }: { device: Equipment; priority: boolean }) {
  return (
    <li className="equip-card" id={device.id}>
      <div className="equip-card__photo">
        <Image src={device.photo} alt={device.alt} fill priority={priority} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 340px" />
      </div>
      <div className="equip-card__body">
        <h4>{device.name}</h4>
        <p className="equip-card__summary">{device.summary}</p>
        <dl className="equip-points">
          <div className="equip-point equip-point--risk"><dt>Le risque</dt><dd>{device.risk}</dd></div>
          <div className="equip-point equip-point--habit"><dt>Le bon réflexe</dt><dd>{device.habit}</dd></div>
        </dl>
        <div className="equip-card__foot">
          <ul className="equip-card__courses" aria-label={`Parcours qui parlent de ${device.name}`}>
            {device.courses.map((slug) => <li key={slug}><Link href={`/parcours/${slug}`}>{COURSE_LABELS[slug] ?? slug}</Link></li>)}
          </ul>
          <a className="equip-card__credit" href={device.credit.pageUrl} target="_blank" rel="noopener noreferrer">{photoCredit(device)}</a>
        </div>
      </div>
    </li>
  );
}

export default function EquipmentPage() {
  const counts = Object.fromEntries(SECTIONS.map((section) => [section.id, equipment.filter((device) => device.category === section.id).length])) as Record<EquipmentCategory, number>;
  let first = true;
  return <div className="public-container inner-page">
    <header className="page-hero equip-hero">
      <Image className="page-hero__image" src="/images/equipment/hero.webp" alt="Une mosaïque de photos : commutateur, routeur, serveur, portable, smartphone et clé de sécurité." fill priority sizes="(max-width: 1100px) 100vw, 1392px" />
      <div className="page-hero__shade" aria-hidden="true" />
      <div className="page-hero__copy">
        <p className="page-hero__kicker">Matériel</p>
        <h1>Le matériel,<br /><span>en vrai.</span></h1>
        <p>Un commutateur, un pare-feu, un NAS ou une clé de sécurité ne sont plus des mots : voici leur photo, ce qu’ils font, leur risque principal et le bon réflexe.</p>
        <dl className="page-hero__stats" aria-label="Résumé du catalogue">
          <div><dt>Équipements</dt><dd>{equipment.length}</dd></div>
          <div><dt>Entreprise</dt><dd>{counts.entreprise}</dd></div>
          <div><dt>Maison</dt><dd>{counts.personnel}</dd></div>
        </dl>
      </div>
    </header>

    <nav className="equip-jump" aria-label="Catégories de matériel">
      {SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`}>{CATEGORY_LABELS[section.id]} <small>{counts[section.id]}</small></a>)}
      <a href="#credits">Crédits photo</a>
    </nav>

    {SECTIONS.map((section) => <section className="equip-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-titre`}>
      <div className="equip-section__head">
        <h2 id={`${section.id}-titre`}>{CATEGORY_LABELS[section.id]}</h2>
        <p>{section.intro}</p>
      </div>
      {groupsOf(section.id).map((group) => <div className="equip-group" key={group.name}>
        <h3>{group.name}</h3>
        <ul className="equip-grid">
          {group.devices.map((device) => { const priority = first; first = false; return <DeviceCard key={device.id} device={device} priority={priority} />; })}
        </ul>
      </div>)}
    </section>)}

    <section id="credits" className="equip-section" aria-label="Crédits photographiques">
      <details className="equip-credits">
        <summary>Crédits photographiques</summary>
        <p>Toutes les photos viennent de Wikimedia Commons et sont publiées sous des licences libres (CC0, domaine public, CC BY ou CC BY-SA). Elles ont été recadrées et converties au format WebP. Chaque auteur reste propriétaire de son travail et mérite d’être cité.</p>
        <ul>
          {equipment.map((device) => <li key={device.id}>
            <strong>{device.name}</strong> : « {commonsTitle(device.credit.title)} », {device.credit.author}, {device.credit.licenseUrl ? <a href={device.credit.licenseUrl} target="_blank" rel="noopener noreferrer">{device.credit.license}</a> : device.credit.license}, <a href={device.credit.pageUrl} target="_blank" rel="noopener noreferrer">source sur Wikimedia Commons</a>.
          </li>)}
        </ul>
      </details>
    </section>
  </div>;
}
