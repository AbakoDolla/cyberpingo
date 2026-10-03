export interface PublicPath {
  id: string;
  title: string;
  description: string;
  level: string;
  image?: string;
  tone: "blue" | "purple" | "teal" | "orange";
  courseSlug?: string;
  topics: string[];
}

// Editorial presentation is separate from course availability and learner data.
export const publicPaths: PublicPath[] = [
  {
    id: "foundations",
    title: "Les bases de la cybersécurité",
    description: "Comprends les fondamentaux et adopte les bons réflexes.",
    level: "Débutant",
    image: "covers/course-fondamentaux.webp",
    tone: "blue",
    courseSlug: "fondamentaux",
    topics: ["Comprendre la cybersécurité", "Reconnaître les menaces", "Découvrir les métiers"],
  },
  {
    id: "web",
    title: "Sécurité sur Internet",
    description: "Découvre les menaces du web et les bonnes pratiques défensives.",
    level: "Intermédiaire",
    image: "covers/course-securite-web.webp",
    tone: "purple",
    courseSlug: "securite-web",
    topics: ["Comprendre HTTPS", "Protéger ses comptes", "Reconnaître le phishing"],
  },
  {
    id: "logs",
    courseSlug: "analyse-logs",
    title: "Analyse de logs",
    description: "Apprends à lire les événements et à repérer les anomalies.",
    level: "Intermédiaire",
    image: "covers/course-detection.webp",
    tone: "teal",
    topics: ["Lire un journal système", "Identifier les événements suspects", "Comprendre une alerte"],
  },
  {
    id: "pentest",
    title: "Pentest & Ethical Hacking",
    description: "Découvre les tests d’intrusion dans un cadre éthique et autorisé.",
    level: "Avancé",
    image: "covers/course-pentest.webp",
    tone: "orange",
    courseSlug: "pentest-intro",
    topics: ["Le cadre légal et l’autorisation", "La méthodologie d’audit", "La restitution des résultats"],
  },
  {
    id: "networks",
    title: "Réseaux informatiques",
    description: "Comprends comment les données circulent pour mieux les protéger.",
    level: "Débutant",
    image: "covers/course-reseaux.webp",
    tone: "blue",
    courseSlug: "reseaux",
    topics: ["Adressage IPv4 et IPv6", "VLAN, routage et filtrage", "Dépannage et documentation"],
  },
  {
    id: "linux",
    title: "Administration Linux",
    description: "Prends en main le terminal, les commandes et les permissions.",
    level: "Intermédiaire",
    image: "covers/course-linux.webp",
    tone: "teal",
    courseSlug: "linux",
    topics: ["Les premières commandes", "Les permissions", "Les bons réflexes dans le terminal"],
  },
];

// Replace this explicitly labelled example with consented, verified testimonials.
export const publicTestimonial = {
  quote: "CyberPingo m’a aidé à comprendre la cybersécurité de manière simple et concrète. On apprend un réflexe à la fois !",
  name: "Alex",
  role: "Étudiant",
  isExample: true,
};

export const publicFaq = [
  {
    question: "Je n’y connais rien en cybersécurité. Je peux commencer ?",
    answer: "Oui ! Les parcours débutants commencent sans prérequis. Tu avances à ton rythme avec des leçons courtes, puis des quiz pour vérifier ce que tu as compris.",
  },
  {
    question: "Comment fonctionnent les XP et les badges ?",
    answer: "Les leçons, quiz et défis te permettent de gagner des points d’expérience (XP). Ta progression débloque des niveaux et des badges. Le panneau en haut de cette page est une démonstration : ses points ne sont pas ajoutés à un compte.",
  },
  {
    question: "Tous les parcours sont-ils déjà disponibles ?",
    answer: "Le catalogue affiche uniquement les parcours réellement publiés. Les contenus avancés restent une initiation, pas une certification professionnelle accréditée.",
  },
  {
    question: "Mes données sont-elles synchronisées entre mes appareils ?",
    answer: "Oui. Ta progression est enregistrée sur ton compte CyberPingo : connecte-toi sur ton téléphone ou ton ordinateur et reprends exactement là où tu t’étais arrêté.",
  },
];