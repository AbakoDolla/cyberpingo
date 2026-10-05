import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Examen final de certification",
  description: "Passe l'examen final officiel pour obtenir ton certificat CyberPingo certifiant tes compétences.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
