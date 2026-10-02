import type { Metadata } from "next";
import Link from "next/link";
import { IconAlert, IconCheck, IconX } from "@/components/ui/Icon";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { formatDate } from "@/lib/format";
import { verifyCertificate } from "@/services/gamification.service";
import type { CertificateVerification } from "@/types/api";
import CertificateLookupForm from "../CertificateLookupForm";

// Revocations must show up immediately, so this page is never served from a cache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vérification de certificat",
  description: "Résultat de la vérification d’un certificat CyberPingo.",
  robots: { index: false, follow: false },
};

type Outcome =
  | { kind: "unconfigured" }
  | { kind: "error" }
  | { kind: "result"; data: CertificateVerification };

async function check(code: string): Promise<Outcome> {
  const client = createSupabasePublicClient();
  if (!client) return { kind: "unconfigured" };
  try {
    return { kind: "result", data: await verifyCertificate(code, client) };
  } catch {
    return { kind: "error" };
  }
}

const grouped = (code: string) => code.match(/.{1,4}/g)?.join(" ") ?? code;

export default async function CertificateVerificationPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
  const outcome = await check(code);

  if (outcome.kind !== "result") {
    return (
      <div className="public-container inner-page">
        <Link className="back-link" href="/certificat">← Vérifier un autre code</Link>
        <section className="cert-verdict" data-state="unknown" aria-live="polite">
          <span className="cert-verdict-icon" aria-hidden="true"><IconAlert size={26} /></span>
          <div>
            <p className="cert-verdict-kicker">Code vérifié : {grouped(code) || "vide"}</p>
            <h1>{outcome.kind === "unconfigured" ? "Vérification indisponible sur ce déploiement." : "La vérification n’a pas abouti."}</h1>
            <p>{outcome.kind === "unconfigured"
              ? "Ce site n’est pas relié à la base CyberPingo. Aucun résultat ne peut être affiché."
              : "Le service de vérification n’a pas répondu. Aucune conclusion ne peut être tirée : réessaie dans un instant."}</p>
            {outcome.kind === "error" && <Link className="inline-link" href={`/certificat/${code}`}>Relancer la vérification</Link>}
          </div>
        </section>
      </div>
    );
  }

  const cert = outcome.data;

  if (!cert.found) {
    return (
      <div className="public-container inner-page">
        <Link className="back-link" href="/certificat">← Vérifier un autre code</Link>
        <section className="cert-verdict" data-state="missing" aria-live="polite">
          <span className="cert-verdict-icon" aria-hidden="true"><IconX size={26} /></span>
          <div>
            <p className="cert-verdict-kicker">Code vérifié : {grouped(code) || "vide"}</p>
            <h1>Aucun certificat ne correspond à ce code.</h1>
            <p>Vérifie chaque caractère : le code compte 16 lettres et chiffres. Si le code est exact, ce document n’a pas été délivré par CyberPingo.</p>
          </div>
        </section>
        <div className="cert-retry">
          <h2>Saisir le code à nouveau</h2>
          <CertificateLookupForm defaultValue={grouped(code)} />
        </div>
      </div>
    );
  }

  const revoked = !cert.valid;
  const verificationCode = cert.verification_code ?? code;
  const recipientName = cert.recipient_name ?? "Titulaire non renseigné";
  const courseTitle = cert.course_title ?? "Parcours non renseigné";

  return (
    <div className="public-container inner-page">
      <Link className="back-link" href="/certificat">← Vérifier un autre code</Link>
      <section className="cert-verdict" data-state={revoked ? "revoked" : "valid"} aria-live="polite">
        <span className="cert-verdict-icon" aria-hidden="true">{revoked ? <IconX size={26} /> : <IconCheck size={26} />}</span>
        <div>
          <p className="cert-verdict-kicker">{revoked ? "Certificat révoqué" : "Certificat authentique"}</p>
          <h1>{revoked
            ? "Ce certificat n’est plus valide."
            : <>{recipientName} a terminé <span>{courseTitle}</span>.</>}</h1>
          <p>{revoked
            ? `CyberPingo a révoqué ce certificat${cert.revoked_at ? ` le ${formatDate(cert.revoked_at)}` : ""}. Il ne doit plus être accepté comme preuve de formation.`
            : "Ce certificat a été délivré par CyberPingo et n’a pas été révoqué à ce jour."}</p>
          {revoked && cert.revoked_reason && <p className="cert-verdict-reason"><strong>Motif :</strong> {cert.revoked_reason}</p>}
        </div>
      </section>

      <dl className="cert-facts">
        <div className="cert-holder"><dt>Titulaire</dt><dd>{recipientName}</dd></div>
        <div>
          <dt>Parcours</dt>
          <dd>{cert.course_slug ? <Link href={`/parcours/${cert.course_slug}`}>{courseTitle}</Link> : courseTitle}</dd>
        </div>
        <div><dt>Délivré le</dt><dd>{cert.issued_at ? formatDate(cert.issued_at) : "Non renseigné"}</dd></div>
        <div><dt>Numéro de certificat</dt><dd className="cert-code">{cert.certificate_number ?? "Non renseigné"}</dd></div>
        <div><dt>Code de vérification</dt><dd className="cert-code">{grouped(verificationCode)}</dd></div>
      </dl>

      <section className="cert-notes">
        <h2>Ce que cette vérification garantit</h2>
        <p>Un certificat CyberPingo n’est délivré qu’une fois toutes les leçons du parcours terminées et tous ses quiz validés. Ces étapes sont contrôlées par le serveur, pas par le navigateur de l’apprenant.</p>
        <p>Les informations ci-dessus sont lues en direct : si un certificat est révoqué, cette page l’indique immédiatement. Elle n’affiche que ce qui figure déjà sur le certificat.</p>
      </section>
    </div>
  );
}
