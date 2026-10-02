import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./intro.css";
import "./learner.css";
import "./learner-account.css";
import "./learner-study.css";
import "./learner-dashboard.css";
import "./auth.css";
import "./pingo.css";
import "./system.css";
import "./admin.css";
import Providers from "./providers";

const spaceGrotesk = localFont({
  src: "../public/fonts/space-grotesk-latin.woff2",
  weight: "300 700",
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = localFont({
  src: "../public/fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "../public/fonts/jetbrains-mono-latin.woff2",
  weight: "100 800",
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false, // Non critique pour le LCP — chargé à la demande
});

export const metadata: Metadata = {
  title: {
    default: "CyberPingo — Apprends. Pratique. Protège.",
    template: "%s · CyberPingo",
  },
  description:
    "Apprends la cybersécurité pas à pas, comme un jeu. Des leçons courtes, des quiz et des défis pratiques pour développer les bons réflexes avec CyberPingo.",
  icons: { icon: "/images/cyberpingo-transparent.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body bg-cyber-black text-white antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
