import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Classement et ligues de cybersécurité",
  description: "Découvre le classement hebdomadaire et mensuel des apprenants CyberPingo, les ligues XP et les récompenses CyberBits.",
  path: "/classement",
  image: "/images/banners/banner-progression.webp",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
