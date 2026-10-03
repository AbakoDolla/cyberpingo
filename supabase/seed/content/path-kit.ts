// Authoring kit shared by the pedagogical paths written after the first Réseaux path: block helpers,
// the lesson template and the list of references authors may cite. Every address below was fetched and
// answered 200 when the list was built; the tests check that lessons only cite addresses from this list.
// Read by scripts/seed-path-builder.cjs through scripts/ts-loader.cjs, so it must stay free of imports.

export type Difficulty = "facile" | "moyen" | "difficile";
export type BlockType = "text" | "heading" | "schema" | "code" | "example" | "callout" | "resource" | "image" | "video";

export interface PathBlock { type: BlockType; content: string; language?: string; url?: string }
export interface PathQuestion {
  type: "single_choice" | "multiple_choice" | "true_false";
  prompt: string;
  options: string[];
  correct: number | number[];
  explanation: string;
  difficulty: Difficulty;
}
export interface PathQuiz { title: string; questions: PathQuestion[] }
export interface NewLesson {
  key: string;
  title: string;
  summary: string;
  minutes: number;
  xp: number;
  blocks: PathBlock[];
  quiz?: PathQuiz;
  /** The lesson already exists as starter content: its text is replaced only while it is still untouched. */
  upgrade?: boolean;
  /**
   * For an upgraded starter lesson that keeps its quiz: `improve[i]` replaces the explanation of the i-th starter
   * question (only while it still carries the starter text) and `add` appends questions after the existing ones.
   */
  quizExtension?: { improve: string[]; add: PathQuestion[] };
}
/** A lesson published earlier that this path only moves to the right module and position (and may give a quiz). */
export interface ExistingLesson { key: string; existing: true; quiz?: PathQuiz }
export type PathLessonEntry = NewLesson | ExistingLesson;
export interface PathModuleEntry {
  key: string;
  position?: number;
  title: string;
  description: string;
  /** The module already exists: it is renamed only while it still carries this title. */
  existing?: { fromTitle: string };
  lessons: PathLessonEntry[];
}

export const isExistingLesson = (entry: PathLessonEntry): entry is ExistingLesson => "existing" in entry;

// --- Blocks -------------------------------------------------------------------------------------

export const text = (content: string): PathBlock => ({ type: "text", content });
export const heading = (content: string): PathBlock => ({ type: "heading", content });
export const schema = (content: string): PathBlock => ({ type: "schema", content });
export const code = (content: string, language = "text"): PathBlock => ({ type: "code", content, language });
export const example = (content: string): PathBlock => ({ type: "example", content });
export const callout = (content: string): PathBlock => ({ type: "callout", content });

// The renderer labels a callout from its first words (see parseCallout in lib/lesson-content.ts).
export const goals = (content: string): PathBlock => callout(`Objectifs : ${content}`);
export const prerequisites = (content: string): PathBlock => callout(`Prérequis : ${content}`);
export const scenario = (content: string): PathBlock => callout(`Mise en situation : ${content}`);
export const mistakes = (content: string): PathBlock => callout(`Erreurs fréquentes : ${content}`);
export const safety = (content: string): PathBlock => callout(`Sécurité : ${content}`);
export const takeaway = (content: string): PathBlock => callout(`À retenir : ${content}`);
export const practice = (content: string): PathBlock => callout(`Pour pratiquer : ${content}`);
/** A video the team has not published yet: the renderer shows an honest "en préparation" frame. */
export const videoSlot = (title: string): PathBlock => callout(`Vidéo à venir : ${title}`);

// --- References ---------------------------------------------------------------------------------

export const REFERENCES = {
  // Standards (English).
  rfc791: { title: "RFC 791 : Internet Protocol (IPv4)", url: "https://www.rfc-editor.org/rfc/rfc791", lang: "en" },
  rfc8200: { title: "RFC 8200 : Internet Protocol, Version 6 (IPv6)", url: "https://www.rfc-editor.org/rfc/rfc8200", lang: "en" },
  rfc4291: { title: "RFC 4291 : architecture d’adressage IPv6", url: "https://www.rfc-editor.org/rfc/rfc4291", lang: "en" },
  rfc4861: { title: "RFC 4861 : Neighbor Discovery pour IPv6", url: "https://www.rfc-editor.org/rfc/rfc4861", lang: "en" },
  rfc4862: { title: "RFC 4862 : autoconfiguration d’adresse sans état (SLAAC)", url: "https://www.rfc-editor.org/rfc/rfc4862", lang: "en" },
  rfc5952: { title: "RFC 5952 : écriture recommandée des adresses IPv6", url: "https://www.rfc-editor.org/rfc/rfc5952", lang: "en" },
  rfc8415: { title: "RFC 8415 : DHCPv6", url: "https://www.rfc-editor.org/rfc/rfc8415", lang: "en" },
  rfc1918: { title: "RFC 1918 : adresses IPv4 privées", url: "https://www.rfc-editor.org/rfc/rfc1918", lang: "en" },
  rfc4632: { title: "RFC 4632 : CIDR", url: "https://www.rfc-editor.org/rfc/rfc4632", lang: "en" },
  rfc826: { title: "RFC 826 : Address Resolution Protocol (ARP)", url: "https://www.rfc-editor.org/rfc/rfc826", lang: "en" },
  rfc9293: { title: "RFC 9293 : Transmission Control Protocol (TCP)", url: "https://www.rfc-editor.org/rfc/rfc9293", lang: "en" },
  rfc768: { title: "RFC 768 : User Datagram Protocol (UDP)", url: "https://www.rfc-editor.org/rfc/rfc768", lang: "en" },
  rfc792: { title: "RFC 792 : Internet Control Message Protocol (ICMP)", url: "https://www.rfc-editor.org/rfc/rfc792", lang: "en" },
  rfc4443: { title: "RFC 4443 : ICMPv6", url: "https://www.rfc-editor.org/rfc/rfc4443", lang: "en" },
  rfc1034: { title: "RFC 1034 : concepts du DNS", url: "https://www.rfc-editor.org/rfc/rfc1034", lang: "en" },
  rfc1035: { title: "RFC 1035 : mise en œuvre du DNS", url: "https://www.rfc-editor.org/rfc/rfc1035", lang: "en" },
  rfc2131: { title: "RFC 2131 : Dynamic Host Configuration Protocol (DHCP)", url: "https://www.rfc-editor.org/rfc/rfc2131", lang: "en" },
  rfc3022: { title: "RFC 3022 : NAT traditionnel", url: "https://www.rfc-editor.org/rfc/rfc3022", lang: "en" },
  rfc5905: { title: "RFC 5905 : Network Time Protocol version 4", url: "https://www.rfc-editor.org/rfc/rfc5905", lang: "en" },
  rfc9110: { title: "RFC 9110 : sémantique HTTP", url: "https://www.rfc-editor.org/rfc/rfc9110", lang: "en" },
  rfc8446: { title: "RFC 8446 : TLS 1.3", url: "https://www.rfc-editor.org/rfc/rfc8446", lang: "en" },
  rfc2328: { title: "RFC 2328 : OSPF version 2", url: "https://www.rfc-editor.org/rfc/rfc2328", lang: "en" },
  rfc2453: { title: "RFC 2453 : RIP version 2", url: "https://www.rfc-editor.org/rfc/rfc2453", lang: "en" },
  rfc5424: { title: "RFC 5424 : protocole Syslog", url: "https://www.rfc-editor.org/rfc/rfc5424", lang: "en" },
  rfc2827: { title: "RFC 2827 : filtrage d’entrée contre l’usurpation d’adresse (BCP 38)", url: "https://www.rfc-editor.org/rfc/rfc2827", lang: "en" },
  // Registries.
  ianaPorts: { title: "IANA : registre des noms de service et numéros de port", url: "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml", lang: "en" },
  ianaIpv6: { title: "IANA : espace d’adressage IPv6", url: "https://www.iana.org/assignments/ipv6-address-space/ipv6-address-space.xhtml", lang: "en" },
  ianaIpv4Special: { title: "IANA : adresses IPv4 à usage spécial", url: "https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml", lang: "en" },
  ianaIpv6Special: { title: "IANA : adresses IPv6 à usage spécial", url: "https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml", lang: "en" },
  // Tools and vendor documentation.
  wiresharkGuide: { title: "Wireshark : guide de l’utilisateur", url: "https://www.wireshark.org/docs/wsug_html_chunked/", lang: "en" },
  wiresharkFilters: { title: "Wireshark : référence des filtres d’affichage", url: "https://www.wireshark.org/docs/dfref/", lang: "en" },
  nmapMan: { title: "Nmap : manuel de référence", url: "https://nmap.org/book/man.html", lang: "en" },
  netacad: { title: "Cisco Networking Academy : cours gratuits", url: "https://www.netacad.com/", lang: "fr" },
  packetTracer: { title: "Cisco Packet Tracer : télécharger et apprendre", url: "https://www.netacad.com/cisco-packet-tracer", lang: "fr" },
  pythonIpaddress: { title: "Python : le module ipaddress", url: "https://docs.python.org/fr/3/library/ipaddress.html", lang: "fr" },
  man7Ip: { title: "Linux : manuel de la commande ip", url: "https://man7.org/linux/man-pages/man8/ip.8.html", lang: "en" },
  msIpconfig: { title: "Microsoft : la commande ipconfig", url: "https://learn.microsoft.com/fr-fr/windows-server/administration/windows-commands/ipconfig", lang: "fr" },
  msPing: { title: "Microsoft : la commande ping", url: "https://learn.microsoft.com/fr-fr/windows-server/administration/windows-commands/ping", lang: "fr" },
  msNslookup: { title: "Microsoft : la commande nslookup", url: "https://learn.microsoft.com/fr-fr/windows-server/administration/windows-commands/nslookup", lang: "fr" },
  msTracert: { title: "Microsoft : la commande tracert", url: "https://learn.microsoft.com/fr-fr/windows-server/administration/windows-commands/tracert", lang: "fr" },
  msArp: { title: "Microsoft : la commande arp", url: "https://learn.microsoft.com/fr-fr/windows-server/administration/windows-commands/arp", lang: "fr" },
  // The web.
  mdnHttp: { title: "MDN : aperçu de HTTP", url: "https://developer.mozilla.org/fr/docs/Web/HTTP/Overview", lang: "fr" },
  mdnMethods: { title: "MDN : les méthodes de requête HTTP", url: "https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Methods", lang: "fr" },
  mdnStatus: { title: "MDN : les codes de statut HTTP", url: "https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Status", lang: "fr" },
  mdnHeaders: { title: "MDN : les en-têtes HTTP", url: "https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers", lang: "fr" },
  mdnCookies: { title: "MDN : les cookies HTTP", url: "https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/Cookies", lang: "fr" },
  mdnCors: { title: "MDN : le partage des ressources entre origines (CORS)", url: "https://developer.mozilla.org/fr/docs/Web/HTTP/Guides/CORS", lang: "fr" },
  mdnTls: { title: "MDN : Transport Layer Security", url: "https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Transport_Layer_Security", lang: "en" },
  // Security guidance.
  nistFirewalls: { title: "NIST SP 800-41 : guide des pare-feu et de la politique de filtrage", url: "https://csrc.nist.gov/pubs/sp/800/41/r1/final", lang: "en" },
  nistWlan: { title: "NIST SP 800-153 : sécuriser les réseaux sans fil", url: "https://csrc.nist.gov/pubs/sp/800/153/final", lang: "en" },
  nistNice: { title: "NIST : référentiel NICE des compétences en cybersécurité", url: "https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center", lang: "en" },
  nistCsf: { title: "NIST : cadre de cybersécurité (CSF)", url: "https://www.nist.gov/cyberframework", lang: "en" },
  anssiFiltrage: { title: "ANSSI : définir une politique de filtrage réseau d’un pare-feu", url: "https://messervices.cyber.gouv.fr/guides/recommandations-pour-la-definition-dune-politique-de-filtrage-reseau-dun-pare-feu", lang: "fr" },
  anssiPareFeux: { title: "ANSSI : choisir des pare-feux maîtrisés dans les zones exposées à Internet", url: "https://messervices.cyber.gouv.fr/guides/recommandations-pour-choisir-des-pare-feux-maitrises-dans-les-zones-exposees-internet", lang: "fr" },
  anssiNettoyage: { title: "ANSSI : nettoyer une politique de filtrage réseau", url: "https://messervices.cyber.gouv.fr/guides/recommandations-et-methodologie-pour-le-nettoyage-dune-politique-de-filtrage-reseau", lang: "fr" },
  anssiWifi: { title: "ANSSI : recommandations de sécurité relatives aux réseaux Wi-Fi", url: "https://messervices.cyber.gouv.fr/guides/recommandations-de-securite-relatives-aux-reseaux-wi-fi", lang: "fr" },
  anssiHygiene: { title: "ANSSI : guide d’hygiène informatique", url: "https://cyber.gouv.fr/publications/guide-dhygiene-informatique", lang: "fr" },
  anssiLinux: { title: "ANSSI : recommandations de sécurité relatives à un système GNU/Linux", url: "https://cyber.gouv.fr/publications/recommandations-de-securite-relatives-un-systeme-gnulinux", lang: "fr" },
  // Fondamentaux : hygiène numérique, authentification, données et incidents.
  cybermalveillance: { title: "Cybermalveillance.gouv.fr : prévention et assistance aux victimes", url: "https://www.cybermalveillance.gouv.fr/", lang: "fr" },
  cmHameconnage: { title: "Cybermalveillance.gouv.fr : fiche réflexe contre l’hameçonnage", url: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/fiches-reflexes/hameconnage-phishing", lang: "fr" },
  cmRancongiciels: { title: "Cybermalveillance.gouv.fr : fiche réflexe contre les rançongiciels", url: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/fiches-reflexes/rancongiciels-ransomwares", lang: "fr" },
  cmSauvegardes: { title: "Cybermalveillance.gouv.fr : effectuer des sauvegardes régulières", url: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/sauvegardes", lang: "fr" },
  cmMisesAJour: { title: "Cybermalveillance.gouv.fr : faire les mises à jour de sécurité", url: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/mises-a-jour", lang: "fr" },
  cmMotsDePasse: { title: "Cybermalveillance.gouv.fr : bien gérer ses mots de passe", url: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/mots-de-passe", lang: "fr" },
  cmAntivirus: { title: "Cybermalveillance.gouv.fr : utiliser un antivirus", url: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/antivirus", lang: "fr" },
  cnilMotsDePasse: { title: "CNIL : mots de passe, les recommandations pour maîtriser sa sécurité", url: "https://www.cnil.fr/fr/mots-de-passe-recommandations-pour-maitriser-sa-securite", lang: "fr" },
  cnilPostes: { title: "CNIL : sécuriser les postes de travail", url: "https://www.cnil.fr/fr/securite-securiser-les-postes-de-travail", lang: "fr" },
  cnilViolations: { title: "CNIL : les violations de données personnelles, les règles à suivre", url: "https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre", lang: "fr" },
  cnilRgpd: { title: "CNIL : comprendre le RGPD", url: "https://www.cnil.fr/fr/comprendre-le-rgpd", lang: "fr" },
  cnilRgpdEssentiel: { title: "CNIL : le RGPD, de quoi parle-t-on ?", url: "https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on", lang: "fr" },
  cnilDroits: { title: "CNIL : les droits pour maîtriser ses données personnelles", url: "https://www.cnil.fr/fr/mes-demarches/les-droits-pour-maitriser-vos-donnees-personnelles", lang: "fr" },
  cnilSauvegarder: { title: "CNIL : sécurité, sauvegarder", url: "https://www.cnil.fr/fr/securite-sauvegarder", lang: "fr" },
  cnilAuthentifier: { title: "CNIL : sécurité, authentifier les utilisateurs", url: "https://www.cnil.fr/fr/securite-authentifier-les-utilisateurs", lang: "fr" },
  anssiMfa: { title: "ANSSI : recommandations relatives à l’authentification multifacteur et aux mots de passe", url: "https://messervices.cyber.gouv.fr/guides/recommandations-relatives-lauthentification-multifacteur-et-aux-mots-de-passe", lang: "fr" },
  anssiEbios: { title: "ANSSI : la méthode EBIOS Risk Manager", url: "https://cyber.gouv.fr/securisation/analyse-des-risques/methode-ebios-rm/", lang: "fr" },
  anssiPortail: { title: "ANSSI : le portail de la cybersécurité", url: "https://cyber.gouv.fr/", lang: "fr" },
  effSsd: { title: "EFF : guide d’autodéfense contre la surveillance", url: "https://ssd.eff.org/fr", lang: "fr" },
  hibp: { title: "Have I Been Pwned : vérifier si une adresse figure dans une fuite", url: "https://haveibeenpwned.com/", lang: "en" },
  hibpPasswords: { title: "Have I Been Pwned : vérifier un mot de passe sans le révéler", url: "https://haveibeenpwned.com/Passwords", lang: "en" },
  nistIncident: { title: "NIST SP 800-61 : guide de gestion des incidents de sécurité", url: "https://csrc.nist.gov/pubs/sp/800/61/r2/final", lang: "en" },
  nistAuth: { title: "NIST SP 800-63B : lignes directrices sur l’authentification", url: "https://pages.nist.gov/800-63-3/sp800-63b.html", lang: "en" },
  nistSmallBusiness: { title: "NIST : ressources de cybersécurité pour les petites entreprises", url: "https://www.nist.gov/itl/smallbusinesscyber", lang: "en" },
  auMalabo: { title: "Union africaine : Convention de Malabo sur la cybersécurité et la protection des données personnelles", url: "https://au.int/en/treaties/african-union-convention-cyber-security-and-personal-data-protection", lang: "en" },
  msBitlocker: { title: "Microsoft : BitLocker, chiffrement des disques", url: "https://learn.microsoft.com/fr-fr/windows/security/operating-system-security/data-protection/bitlocker/", lang: "fr" },
  letsEncrypt: { title: "Let’s Encrypt : comment ça marche", url: "https://letsencrypt.org/fr/how-it-works/", lang: "fr" },
  cisaRansomware: { title: "CISA : arrêter les rançongiciels", url: "https://www.cisa.gov/stopransomware", lang: "en" },
  cisaSecureOurWorld: { title: "CISA : Secure Our World, les gestes de base", url: "https://www.cisa.gov/secure-our-world", lang: "en" },
  wikiCesar: { title: "Wikipédia : chiffrement par décalage (César)", url: "https://fr.wikipedia.org/wiki/Chiffrement_par_d%C3%A9calage", lang: "fr" },
  wikiBase64: { title: "Wikipédia : Base64", url: "https://fr.wikipedia.org/wiki/Base64", lang: "fr" },
  wikiSha2: { title: "Wikipédia : SHA-2", url: "https://fr.wikipedia.org/wiki/SHA-2", lang: "fr" },
  wikiDiceware: { title: "Wikipédia : Diceware, des phrases de passe tirées au hasard", url: "https://fr.wikipedia.org/wiki/Diceware", lang: "fr" },
  wikiIngenierieSociale: { title: "Wikipédia : ingénierie sociale", url: "https://fr.wikipedia.org/wiki/Ing%C3%A9nierie_sociale_(s%C3%A9curit%C3%A9_de_l%27information)", lang: "fr" },
  wikiSpf: { title: "Wikipédia : Sender Policy Framework (SPF)", url: "https://fr.wikipedia.org/wiki/Sender_Policy_Framework", lang: "fr" },
  wikiDkim: { title: "Wikipédia : DomainKeys Identified Mail (DKIM)", url: "https://fr.wikipedia.org/wiki/DomainKeys_Identified_Mail", lang: "fr" },
  wikiDmarc: { title: "Wikipédia : DMARC", url: "https://fr.wikipedia.org/wiki/DMARC", lang: "fr" },
  wikiMfa: { title: "Wikipédia : authentification multifacteur", url: "https://fr.wikipedia.org/wiki/Authentification_multifacteur", lang: "fr" },
  wikiPki: { title: "Wikipédia : infrastructure à clés publiques", url: "https://fr.wikipedia.org/wiki/Infrastructure_%C3%A0_cl%C3%A9s_publiques", lang: "fr" },
  rfc7208: { title: "RFC 7208 : Sender Policy Framework (SPF)", url: "https://www.rfc-editor.org/rfc/rfc7208", lang: "en" },
  rfc6376: { title: "RFC 6376 : DomainKeys Identified Mail (DKIM)", url: "https://www.rfc-editor.org/rfc/rfc6376", lang: "en" },
  rfc7489: { title: "RFC 7489 : DMARC", url: "https://www.rfc-editor.org/rfc/rfc7489", lang: "en" },
  rfc5322: { title: "RFC 5322 : format des messages électroniques", url: "https://www.rfc-editor.org/rfc/rfc5322", lang: "en" },
  rfc4648: { title: "RFC 4648 : encodages Base16, Base32 et Base64", url: "https://www.rfc-editor.org/rfc/rfc4648", lang: "en" },
  rfc5280: { title: "RFC 5280 : certificats X.509 et listes de révocation", url: "https://www.rfc-editor.org/rfc/rfc5280", lang: "en" },
  rfc6238: { title: "RFC 6238 : mots de passe à usage unique basés sur le temps (TOTP)", url: "https://www.rfc-editor.org/rfc/rfc6238", lang: "en" },
  rfc4226: { title: "RFC 4226 : mots de passe à usage unique basés sur un compteur (HOTP)", url: "https://www.rfc-editor.org/rfc/rfc4226", lang: "en" },
  webauthnGuide: { title: "WebAuthn.guide : comprendre les clés d’accès et WebAuthn", url: "https://webauthn.guide/", lang: "en" },
  fidoPasskeys: { title: "Alliance FIDO : les clés d’accès (passkeys)", url: "https://fidoalliance.org/passkeys/", lang: "en" },
  mdnWebAuthn: { title: "MDN : l’API Web Authentication", url: "https://developer.mozilla.org/fr/docs/Web/API/Web_Authentication_API", lang: "fr" },
  mdnSecurity: { title: "MDN : la sécurité sur le Web", url: "https://developer.mozilla.org/fr/docs/Web/Security", lang: "fr" },
  owaspPasswordStorage: { title: "OWASP : aide-mémoire sur le stockage des mots de passe", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html", lang: "en" },
  owaspAuthentication: { title: "OWASP : aide-mémoire sur l’authentification", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html", lang: "en" },
  ncscTips: { title: "NCSC : les gestes essentiels pour rester en sécurité en ligne", url: "https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online", lang: "en" },
} as const satisfies Record<string, { title: string; url: string; lang: "fr" | "en" }>;

export type ReferenceKey = keyof typeof REFERENCES;

/** A "Pour aller plus loin" link; the caption says when the source is in English. */
export const reference = (key: ReferenceKey, caption?: string): PathBlock => {
  const entry = REFERENCES[key];
  return { type: "resource", url: entry.url, content: `${caption ?? entry.title}${entry.lang === "en" ? " (en anglais)" : ""}` };
};

// --- Quiz questions -----------------------------------------------------------------------------

export const questions = {
  tf: (prompt: string, truth: boolean, explanation: string, difficulty: Difficulty = "facile"): PathQuestion => ({
    type: "true_false", prompt, options: ["Vrai", "Faux"], correct: truth ? 0 : 1, explanation, difficulty,
  }),
  choice: (prompt: string, options: string[], correct: number, explanation: string, difficulty: Difficulty = "facile"): PathQuestion => ({
    type: "single_choice", prompt, options, correct, explanation, difficulty,
  }),
  /** All the right options must be ticked and no other: a partial answer scores nothing. */
  multi: (prompt: string, options: string[], correct: number[], explanation: string, difficulty: Difficulty = "moyen"): PathQuestion => ({
    type: "multiple_choice", prompt, options, correct, explanation, difficulty,
  }),
};
