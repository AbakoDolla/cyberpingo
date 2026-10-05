import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Boutique CyberBits",
  description: "Débloque des parcours et des laboratoires de cybersécurité grâce à tes CyberBits gagnés en apprenant.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
