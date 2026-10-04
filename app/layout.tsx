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
import "./art.css";
import "./academy.css";
import "./equipment.css";
import "./figures.css";
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
  metadataBase: new URL("https://cyberpingo.vercel.app"),
  openGraph: {
    type: "website",
    siteName: "CyberPingo",
    locale: "fr_FR",
    title: "CyberPingo, apprends, comprends, réussis",
    description: "Apprends la cybersécurité pas à pas, avec des leçons courtes, des labs et des badges.",
    images: [{ url: "/images/og-cyberpingo.jpg", width: 1200, height: 630, alt: "CyberPingo, apprends, comprends, réussis" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CyberPingo, apprends, comprends, réussis",
    description: "Apprends la cybersécurité pas à pas, avec des leçons courtes, des labs et des badges.",
    images: ["/images/og-cyberpingo.jpg"],
  },
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
