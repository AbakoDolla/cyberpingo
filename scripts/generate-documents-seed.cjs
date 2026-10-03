"use strict";
// Génère supabase/seed/07_lab_documents_pdf.sql : les guides et modèles des labs sont publiés en PDF.
//   node scripts/generate-documents-seed.cjs
//
// La liste des documents vient de scripts/pdf/documents.cjs, la même qui sert à fabriquer les PDF
// (node scripts/build-lab-pdfs.cjs). Seule l'adresse change : titre, description, lab et ordre restent ceux de l'apprenant.
const fs = require("node:fs");
const path = require("node:path");
const DOCUMENTS = require("./pdf/documents.cjs");

const OUTPUT = path.join(__dirname, "..", "supabase", "seed", "07_lab_documents_pdf.sql");

function buildSeed() {
  // Les documents marqués « direct » sont publiés en PDF dès leur seed de programme (08_linux_programme.sql) : rien à convertir ici.
  const converted = DOCUMENTS.filter((doc) => !doc.direct);
  const lines = converted.map(({ file }) => `update public.lab_assets set url = '/labs/${file}.pdf'
where url = '/labs/${file}.md' and kind in ('guide', 'report_template');`);
  return `-- CyberPingo · les guides, aide-mémoire, cahiers des charges et modèles de rapport des labs sont téléchargés en PDF
-- (mise en page, logo, polices et photos du matériel) au lieu de fichiers Markdown.
-- Généré par scripts/generate-documents-seed.cjs d'après scripts/pdf/documents.cjs ; les PDF sont fabriqués par
-- scripts/build-lab-pdfs.cjs et publiés dans public/labs. À charger après 06_fondamentaux_programme.sql.
-- Idempotent : l'adresse n'est changée que tant qu'elle pointe encore vers le fichier .md, et seuls les guides et
-- modèles sont concernés (les journaux, captures et tableaux de données gardent leur format).
-- ${converted.length} documents.

begin;

${lines.join("\n\n")}

commit;
`;
}

if (require.main === module) {
  fs.writeFileSync(OUTPUT, buildSeed(), "utf8");
  console.log(`${DOCUMENTS.filter((doc) => !doc.direct).length} documents convertis écrits dans ${path.relative(path.join(__dirname, ".."), OUTPUT)} (${DOCUMENTS.filter((doc) => doc.direct).length} autres sont publiés en PDF par le seed de leur parcours)`);
}

module.exports = { buildSeed, OUTPUT };
