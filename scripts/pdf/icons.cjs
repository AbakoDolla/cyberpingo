"use strict";
// Jeu d’icônes (tracé 24x24) utilisé dans les titres et les encadrés des PDF.
const ICONS = {
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3z"/><path d="m9 12 2 2 4-4"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3M12.5 15H17"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2z"/>',
  checklist: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.3 1.3L7 5M3.5 12l1.3 1.3L7 11M3.5 18l1.3 1.3L7 17"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  magnifier: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  flag: '<path d="M5 21V4M5 5h12l-2 4 2 4H5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
  alert: '<path d="M12 3.5 2.8 19.5h18.4L12 3.5z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  wifi: '<path d="M3 9.5a14 14 0 0 1 18 0M6 13a9.5 9.5 0 0 1 12 0M9 16.5a5 5 0 0 1 6 0"/><path d="M12 20h.01"/>',
};

function icon(name, size = 24) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ICONS.book}</svg>`;
}

const strip = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Choisit l’icône d’un titre d’après ses mots-clés. */
function iconFor(title) {
  const t = strip(title);
  if (/cadre|limite|regle de|prudence|legal|loi|conformite/.test(t)) return "shield";
  if (/commande|terminal|outil|script/.test(t)) return "terminal";
  if (/methode|demarche|etape|procedure|comment/.test(t)) return "compass";
  if (/grille|controle|signal|critere|verif|tester|test|checklist|score/.test(t)) return "checklist";
  if (/materiel|equipement|inventaire|poste|serveur/.test(t)) return "server";
  if (/rendre|rapport|rendu|livrable|produi|synthese|resume/.test(t)) return "pencil";
  if (/besoin|contexte|scenario|objectif|cahier|espace|mission/.test(t)) return "target";
  if (/reflexe|repere|astuce|conseil|a retenir/.test(t)) return "bulb";
  if (/journa|lire|lecture|analys|chronolog|constat/.test(t)) return "magnifier";
  if (/filtrage|reseau|wi-fi|wifi|service|adressage|vlan/.test(t)) return "wifi";
  if (/risque|incident|alerte|attention|danger/.test(t)) return "alert";
  if (/mot de passe|authentif|acces|droit|chiffr/.test(t)) return "lock";
  if (/priorit|plan d.action|action/.test(t)) return "flag";
  return "layers";
}

module.exports = { icon, iconFor, ICONS };
