-- CyberPingo · CyberBits : prérequis des parcours
-- Donnée de référence rejouable : le Pentest suppose les bases de la sécurité, Fondamentaux doit être terminé pour le
-- débloquer. Les prix viennent des règles par niveau (cb_rules), rien à poser ici. À appliquer après le déploiement
-- de la migration 20261004000000_cyberbits.
update public.courses c
set prerequisite_course_id = f.id
from public.courses f
where c.slug = 'pentest-intro' and f.slug = 'fondamentaux' and c.prerequisite_course_id is null;
