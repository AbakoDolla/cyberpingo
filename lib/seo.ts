import type { Metadata } from "next";
import type { Article } from "@/data/public-content";
import type { CourseDetail, CourseSummary } from "@/types/api";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://cyberpingo.vercel.app").replace(/\/+$/, "");
export const SITE_NAME = "CyberPingo";
export const SITE_TAGLINE = "Apprendre la cybersécurité gratuitement en ligne (Cours, Labs & Défis) · CyberPingo";
export const SITE_DESCRIPTION =
  "Apprendre la cybersécurité gratuitement et pas à pas en français : cours interactifs pour débutants et avancés, laboratoires pratiques (Linux, réseaux, sécurité web, analyse de logs SOC, pentest éthique), quiz et défis sur CyberPingo.";
export const DEFAULT_OG_IMAGE = "/images/og-cyberpingo.jpg";

export const SEO_KEYWORDS: string[] = [
  "apprendre la cybersécurité",
  "apprendre la cybersécurité gratuitement",
  "apprendre la cybersécurité en ligne",
  "apprendre la cybersécurité débutant",
  "comment débuter en cybersécurité",
  "cours de cybersécurité gratuit",
  "formation cybersécurité gratuite",
  "cours cybersécurité en français",
  "cybersécurité",
  "sécurité informatique",
  "apprendre le hacking éthique",
  "ethical hacking",
  "pentest",
  "test d'intrusion",
  "sécurité web",
  "OWASP Top 10",
  "ANSSI bonnes pratiques",
  "analyse de logs",
  "SOC analyste",
  "administration Linux",
  "sécurité réseau",
  "phishing prévention",
  "authentification multifacteur MFA",
  "laboratoire cybersécurité",
  "exercices cybersécurité",
  "CyberPingo",
  "cybersécurité Afrique francophone",
];

export interface PageSeoInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  keywords?: string[];
  noIndex?: boolean;
}

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  imageAlt = title,
  type = "website",
  keywords,
  noIndex = false,
}: PageSeoInput): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const mergedKeywords = keywords ? Array.from(new Set([...keywords, ...SEO_KEYWORDS])) : SEO_KEYWORDS;

  return {
    title,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical,
      languages: {
        "fr-FR": canonical,
        fr: canonical,
        "x-default": canonical,
      },
    },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: "fr_FR",
      url: canonical,
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [image],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/images/cyberpingo-official.png"),
          width: 512,
          height: 512,
        },
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        description: SITE_DESCRIPTION,
        inLanguage: ["fr-FR", "en"],
        sameAs: ["https://github.com/AbakoDolla/cyberpingo"],
        knowsAbout: [
          "Cybersécurité",
          "Sécurité des réseaux",
          "Administration système Linux",
          "Sécurité des applications Web (OWASP)",
          "Analyse de journaux SOC et réponse à incident",
          "Tests d'intrusion éthiques (Pentest)",
          "Hygiène numérique et protection des comptes",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "fr-FR",
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/parcours?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildFaqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildCourseListJsonLd(courses: CourseSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Parcours de formation en cybersécurité CyberPingo",
    description: "Catalogue des formations gratuites en cybersécurité disponibles sur CyberPingo.",
    numberOfItems: courses.length,
    itemListElement: courses.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Course",
        name: course.title,
        description: course.short_description || course.description,
        url: absoluteUrl(`/parcours/${course.slug}`),
        inLanguage: "fr-FR",
        educationalLevel: course.level,
        timeRequired: `PT${Math.max(15, course.estimated_duration)}M`,
        isAccessibleForFree: true,
        provider: {
          "@type": "EducationalOrganization",
          name: SITE_NAME,
          sameAs: SITE_URL,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          category: "Free",
        },
      },
    })),
  };
}

export function buildCourseDetailJsonLd(course: CourseDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description || course.short_description,
    url: absoluteUrl(`/parcours/${course.slug}`),
    inLanguage: "fr-FR",
    educationalLevel: course.level,
    timeRequired: `PT${Math.max(15, course.estimated_duration)}M`,
    isAccessibleForFree: true,
    ...(course.certificate_enabled
      ? { educationalCredentialAwarded: `Certificat de réussite CyberPingo — ${course.title}` }
      : {}),
    provider: {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      category: "Free",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      inLanguage: "fr-FR",
    },
    syllabusSections: course.modules.map((mod) => ({
      "@type": "Syllabus",
      name: mod.title,
      description: mod.description || `${mod.lessons.length} leçons pratiques`,
    })),
  };
}

export function buildArticleJsonLd(article: Article, coverImage: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.title,
    description: article.description,
    image: [absoluteUrl(coverImage)],
    url: absoluteUrl(`/ressources/${article.slug}`),
    inLanguage: "fr-FR",
    articleSection: article.category,
    timeRequired: `PT${article.minutes}M`,
    isAccessibleForFree: true,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/images/cyberpingo-official.png"),
      },
    },
    citation: article.source.url,
  };
}
