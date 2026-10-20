import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription gratuite",
  description: "Crée ton compte gratuit sur CyberPingo pour suivre les parcours de cybersécurité, valider les quiz et obtenir tes badges et certificats.",
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
