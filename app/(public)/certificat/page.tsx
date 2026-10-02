import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SceneBanner from "@/components/art/SceneBanner";
import CertificateLookupForm from "./CertificateLookupForm";

export const metadata: Metadata = {
  title: "Vérifier un certificat",
  description: "Contrôle l’authenticité d’un certificat CyberPingo à partir de son code de vérification.",
};

export default async function CertificateLookupPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { code } = await searchParams;
  const raw = Array.isArray(code) ? code[0] : code;
  const value = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
  if (value) redirect(`/certificat/${value}`);

  return (
    <div className="public-container inner-page">
      <SceneBanner variant="certificate" anchor="end" className="page-heading page-heading--split">
        <div>
          <h1>Vérifier un certificat CyberPingo.</h1>
          <p>Saisis le code imprimé sur le certificat, ou scanne son QR code. Le résultat est lu en direct dans la base CyberPingo.</p>
        </div>
        <aside className="page-heading-panel cert-trust-panel" aria-label="Garanties de vérification">
          <p>Vérification publique</p>
          <ul>
            <li>Code de 16 caractères.</li>
            <li>Résultat sans connexion.</li>
            <li>Révocation visible immédiatement.</li>
          </ul>
        </aside>
      </SceneBanner>
      <CertificateLookupForm />
    </div>
  );
}
