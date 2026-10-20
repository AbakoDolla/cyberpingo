import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/parcours",
          "/parcours/",
          "/ressources",
          "/ressources/",
          "/materiel",
          "/fonctionnalites",
          "/a-propos",
          "/communaute",
          "/faq",
          "/contact",
          "/confidentialite",
          "/conditions",
          "/certificat",
          "/courses",
          "/challenges",
          "/classement",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/dashboard",
          "/parametres",
          "/profile",
          "/notifications",
          "/onboarding",
          "/mot-de-passe-oublie",
          "/reinitialiser-mot-de-passe",
          "/dev/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
