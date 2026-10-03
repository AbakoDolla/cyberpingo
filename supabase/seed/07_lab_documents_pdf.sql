-- CyberPingo · les guides, aide-mémoire, cahiers des charges et modèles de rapport des labs sont téléchargés en PDF
-- (mise en page, logo, polices et photos du matériel) au lieu de fichiers Markdown.
-- Généré par scripts/generate-documents-seed.cjs d'après scripts/pdf/documents.cjs ; les PDF sont fabriqués par
-- scripts/build-lab-pdfs.cjs et publiés dans public/labs. À charger après 06_fondamentaux_programme.sql.
-- Idempotent : l'adresse n'est changée que tant qu'elle pointe encore vers le fichier .md, et seuls les guides et
-- modèles sont concernés (les journaux, captures et tableaux de données gardent leur format).
-- 22 documents.

begin;

update public.lab_assets set url = '/labs/tp1-guide.pdf'
where url = '/labs/tp1-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/tp2-guide.pdf'
where url = '/labs/tp2-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/tp3-guide.pdf'
where url = '/labs/tp3-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/packet-tracer-guide.pdf'
where url = '/labs/packet-tracer-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/modele-rapport-reseau.pdf'
where url = '/labs/modele-rapport-reseau.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/projet-kora-cahier-des-charges.pdf'
where url = '/labs/projet-kora-cahier-des-charges.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/projet-kora-inventaire-a-verifier.pdf'
where url = '/labs/projet-kora-inventaire-a-verifier.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/projet-kora-modele-documentation.pdf'
where url = '/labs/projet-kora-modele-documentation.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/guide-wireshark.pdf'
where url = '/labs/guide-wireshark.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-tp1-guide.pdf'
where url = '/labs/fond-tp1-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-tp2-guide.pdf'
where url = '/labs/fond-tp2-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-tp3-guide.pdf'
where url = '/labs/fond-tp3-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-tp4-guide.pdf'
where url = '/labs/fond-tp4-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-tp5-guide.pdf'
where url = '/labs/fond-tp5-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-incident-guide.pdf'
where url = '/labs/fond-incident-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-incident-chronologie.pdf'
where url = '/labs/fond-incident-chronologie.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-projet-guide.pdf'
where url = '/labs/fond-projet-guide.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-projet-grille-audit.pdf'
where url = '/labs/fond-projet-grille-audit.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/fond-projet-modele-rapport.pdf'
where url = '/labs/fond-projet-modele-rapport.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/guide-audit-linux.pdf'
where url = '/labs/guide-audit-linux.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/guide-lecture-journaux.pdf'
where url = '/labs/guide-lecture-journaux.md' and kind in ('guide', 'report_template');

update public.lab_assets set url = '/labs/modele-rapport-incident.pdf'
where url = '/labs/modele-rapport-incident.md' and kind in ('guide', 'report_template');

commit;
