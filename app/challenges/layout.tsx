import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Défis et laboratoires pratiques de cybersécurité",
  description: "Entraîne-toi sur des laboratoires et défis réalistes en cybersécurité : investigation de logs, captures réseau PCAP, audit Linux, sécurité web et OSINT.",
  path: "/challenges",
  image: "/images/banners/banner-challenges.webp",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
