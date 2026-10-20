import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Catalogue des cours de cybersécurité",
  description: "Accède aux cours interactifs de cybersécurité CyberPingo : fondamentaux, réseaux, Linux, sécurité web, analyse de logs et pentest éthique.",
  path: "/courses",
  image: "/images/banners/banner-courses.webp",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
