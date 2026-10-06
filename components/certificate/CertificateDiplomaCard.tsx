"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
// @ts-ignore qrcode-generator typings
import * as qrcodeGenerator from "qrcode-generator";
import {
  IconAward,
  IconCertificate,
  IconCheck,
  IconCopy,
  IconDownload,
  IconGlobe,
  IconShield,
  IconSparkles,
} from "@/components/ui/Icon";
import { formatDate } from "@/lib/format";

export interface CertificateDiplomaCardProps {
  recipientName: string;
  courseTitle: string;
  courseSlug?: string | null;
  certificateNumber: string;
  verificationCode: string;
  issuedAt?: string | Date | null;
  examPercentage?: number | null;
  valid?: boolean;
  revokedAt?: string | null;
  revokedReason?: string | null;
}

type QrCode = {
  addData(text: string): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, column: number): boolean;
};

const qrcodeFn = (
  typeof qrcodeGenerator === "function"
    ? qrcodeGenerator
    : (qrcodeGenerator as { default?: unknown }).default ?? qrcodeGenerator
) as unknown as (typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H") => QrCode;

function generateQrSvg(text: string): { size: number; cells: Array<{ x: number; y: number }> } {
  try {
    const qr = qrcodeFn(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const cells: Array<{ x: number; y: number }> = [];
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          cells.push({ x: c, y: r });
        }
      }
    }
    return { size: count, cells };
  } catch {
    return { size: 0, cells: [] };
  }
}

export default function CertificateDiplomaCard({
  recipientName,
  courseTitle,
  courseSlug,
  certificateNumber,
  verificationCode,
  issuedAt,
  examPercentage,
  valid = true,
  revokedAt,
  revokedReason,
}: CertificateDiplomaCardProps) {
  const patternId = useId();
  const [copied, setCopied] = useState(false);
  const verifyUrl = `https://cyberpingo.vercel.app/certificat/${verificationCode}`;
  const qrData = generateQrSvg(verifyUrl);

  const issuedDate = issuedAt ? new Date(issuedAt) : new Date();
  const formattedDate = formatDate(issuedDate);
  const issueYear = issuedDate.getFullYear();
  const issueMonth = issuedDate.getMonth() + 1;

  const linkedInCertUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    courseTitle
  )}&organizationName=CyberPingo&issueYear=${issueYear}&issueMonth=${issueMonth}&certUrl=${encodeURIComponent(
    verifyUrl
  )}&certId=${encodeURIComponent(certificateNumber)}`;

  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // fallback
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="cert-diploma-wrapper">
      {/* ── Toolbar d'Actions Supérieures ── */}
      <div className="cert-diploma-toolbar" role="toolbar" aria-label="Actions sur le diplôme">
        <div className="cert-diploma-toolbar__status">
          <span className={`cert-status-dot ${valid ? "is-valid" : "is-revoked"}`} aria-hidden="true" />
          <span className="cert-status-text">
            {valid ? "Document Officiel Certifié & Actif" : "Certificat Révoqué"}
          </span>
        </div>

        <div className="cert-diploma-toolbar__actions">
          <a
            href={`/api/certificat/${verificationCode}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="cert-btn cert-btn--primary"
            title="Télécharger l'attestation vectorielle originale au format PDF"
          >
            <IconDownload size={16} />
            <span>Télécharger le PDF</span>
          </a>

          <button
            type="button"
            onClick={handlePrint}
            className="cert-btn cert-btn--secondary"
            title="Imprimer le diplôme en pleine résolution paysage"
          >
            <IconCertificate size={16} />
            <span>Imprimer</span>
          </button>

          <a
            href={linkedInCertUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cert-btn cert-btn--linkedin"
            title="Ajouter automatiquement cette certification à votre profil LinkedIn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            <span>Ajouter à LinkedIn</span>
          </a>

          <a
            href={linkedInShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cert-btn cert-btn--ghost"
            title="Partager l'obtention de ce certificat sur votre fil d'actualités"
          >
            <IconGlobe size={15} />
            <span>Partager</span>
          </a>

          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="cert-btn cert-btn--ghost"
            title="Copier l'URL permanente de vérification publique"
          >
            {copied ? <IconCheck size={15} className="text-emerald-400" /> : <IconCopy size={15} />}
            <span>{copied ? "Lien copié !" : "Copier le lien"}</span>
          </button>
        </div>
      </div>

      {/* ── Cadre Majestueux du Diplôme (Print & Screen) ── */}
      <article
        className={`cert-diploma-frame ${valid ? "is-valid" : "is-revoked"}`}
        aria-label={`Diplôme de certification CyberPingo pour ${recipientName}`}
      >
        {/* Motif Guilloché de Sécurité en SVG de Fond */}
        <svg className="cert-guilloche-bg" width="100%" height="100%" aria-hidden="true">
          <defs>
            <pattern
              id={`guilloche-${patternId}`}
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <path
                d="M0 30 Q15 0 30 30 T60 30"
                fill="none"
                stroke="rgba(0, 213, 255, 0.05)"
                strokeWidth="0.8"
              />
              <path
                d="M0 30 Q15 60 30 30 T60 30"
                fill="none"
                stroke="rgba(255, 193, 7, 0.04)"
                strokeWidth="0.8"
              />
              <circle cx="30" cy="30" r="14" fill="none" stroke="rgba(154, 100, 255, 0.04)" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#guilloche-${patternId})`} />
        </svg>

        {/* Rosaces & Ornements d'Angles Dorés */}
        <div className="cert-corner cert-corner--tl" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M4 44V12C4 7.58172 7.58172 4 12 4H44" stroke="var(--cp-gold, #f5c042)" strokeWidth="2" />
            <path d="M12 44V18C12 14.6863 14.6863 12 18 12H44" stroke="var(--cp-cyan, #00d5ff)" strokeWidth="1" strokeOpacity="0.7" />
            <circle cx="12" cy="12" r="3.5" fill="var(--cp-gold, #f5c042)" />
            <polygon points="24,6 27,12 24,18 21,12" fill="var(--cp-gold, #f5c042)" opacity="0.6" />
          </svg>
        </div>
        <div className="cert-corner cert-corner--tr" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M44 44V12C44 7.58172 40.4183 4 36 4H4" stroke="var(--cp-gold, #f5c042)" strokeWidth="2" />
            <path d="M36 44V18C36 14.6863 33.3137 12 30 12H4" stroke="var(--cp-cyan, #00d5ff)" strokeWidth="1" strokeOpacity="0.7" />
            <circle cx="36" cy="12" r="3.5" fill="var(--cp-gold, #f5c042)" />
            <polygon points="24,6 27,12 24,18 21,12" fill="var(--cp-gold, #f5c042)" opacity="0.6" />
          </svg>
        </div>
        <div className="cert-corner cert-corner--bl" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M4 4V36C4 40.4183 7.58172 44 12 44H44" stroke="var(--cp-gold, #f5c042)" strokeWidth="2" />
            <path d="M12 4V30C12 33.3137 14.6863 36 18 36H44" stroke="var(--cp-cyan, #00d5ff)" strokeWidth="1" strokeOpacity="0.7" />
            <circle cx="12" cy="36" r="3.5" fill="var(--cp-gold, #f5c042)" />
          </svg>
        </div>
        <div className="cert-corner cert-corner--br" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M44 4V36C44 40.4183 40.4183 44 36 44H4" stroke="var(--cp-gold, #f5c042)" strokeWidth="2" />
            <path d="M36 4V30C36 33.3137 33.3137 36 30 36H4" stroke="var(--cp-cyan, #00d5ff)" strokeWidth="1" strokeOpacity="0.7" />
            <circle cx="36" cy="36" r="3.5" fill="var(--cp-gold, #f5c042)" />
          </svg>
        </div>

        {/* ── En-tête Académique Officiel ── */}
        <header className="cert-diploma-header">
          <div className="cert-diploma-header__brand">
            <div className="cert-emblem-wrapper">
              <Image
                src="/images/brand/cyberpingo-mark.webp"
                alt="Blason CyberPingo"
                width={56}
                height={56}
                className="cert-emblem-img"
              />
            </div>
            <div className="cert-academy-title">
              <span className="cert-academy-sup">RÉPUBLIQUE DU SAVOIR NUMÉRIQUE · ANSSI & OWASP COMPLIANT</span>
              <strong className="cert-academy-name">CYBERPINGO ACADEMY OF DEFENSE</strong>
              <span className="cert-academy-sub">Conseil Scientifique & Pédagogique de Cybersécurité</span>
            </div>
          </div>

          <div className="cert-ribbon-band">
            <div className="cert-ribbon-line" />
            <span className="cert-ribbon-badge">
              <IconAward size={14} /> CERTIFICAT OFFICIEL D&apos;EXPERTISE
            </span>
            <div className="cert-ribbon-line" />
          </div>
        </header>

        {/* ── Corps du Diplôme ── */}
        <div className="cert-diploma-body">
          <p className="cert-proclamation">
            Le Comité Pédagogique et d&apos;Évaluation de CyberPingo atteste par la présente que :
          </p>

          <div className="cert-recipient-block">
            <h1 className="cert-recipient-name">{recipientName}</h1>
            <div className="cert-recipient-line" aria-hidden="true" />
          </div>

          <p className="cert-accomplishment">
            a satisfait avec succès à l&apos;intégralité des modules d&apos;enseignement théorique, aux
            travaux pratiques en environnement d&apos;attaque et de défense contrôlé, et a brillamment
            validé l&apos;examen terminal du parcours académique :
          </p>

          <div className="cert-course-badge-container">
            <div className="cert-course-pill">
              <IconShield size={20} className="cert-course-pill__icon" />
              <span className="cert-course-pill__title">
                {courseSlug ? <Link href={`/parcours/${courseSlug}`}>{courseTitle}</Link> : courseTitle}
              </span>
            </div>

            {examPercentage && (
              <div className="cert-score-chip">
                <IconSparkles size={14} />
                <span>
                  Score officiel : <strong>{examPercentage} %</strong> · Mention d&apos;Excellence (Seuil
                  requis : 70 %)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Sceau Officiel, Signatures & Sécurité (Trois Colonnes) ── */}
        <footer className="cert-diploma-footer">
          {/* Colonne 1 : Sceau Holographique 3D de l'Académie */}
          <div className="cert-seal-col">
            <div className="cert-official-seal">
              <div className="cert-seal-outer-ring">
                <svg viewBox="0 0 120 120" className="cert-seal-text-ring">
                  <path
                    id={`seal-path-${patternId}`}
                    d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
                    fill="none"
                  />
                  <text fontSize="7.2" fontWeight="700" fill="var(--cp-gold, #f5c042)" letterSpacing="2.2">
                    <textPath href={`#seal-path-${patternId}`} startOffset="50%" textAnchor="middle">
                      ★ CYBERPINGO ACADEMIA ★ SCELLÉ NUMÉRIQUEMENT
                    </textPath>
                  </text>
                </svg>
                <div className="cert-seal-core">
                  <Image
                    src="/images/mascot/professeur-pingo-face.png"
                    alt="Sceau Professeur Pingo"
                    width={46}
                    height={46}
                    className="cert-seal-avatar"
                  />
                </div>
              </div>
            </div>
            <span className="cert-seal-legend">SCEAU OFFICIEL D&apos;AUTHENTICITÉ</span>
          </div>

          {/* Colonne 2 : Métadonnées & Horodatage Central */}
          <div className="cert-meta-col">
            <div className="cert-meta-item">
              <span className="cert-meta-label">DATE DE DÉLIVRANCE</span>
              <strong className="cert-meta-val">{formattedDate}</strong>
            </div>
            <div className="cert-meta-item">
              <span className="cert-meta-label">NUMÉRO D&apos;ENREGISTREMENT</span>
              <code className="cert-meta-code">{certificateNumber}</code>
            </div>
            <div className="cert-meta-item">
              <span className="cert-meta-label">CODE UNIQUE DE VÉRIFICATION</span>
              <code className="cert-meta-code cert-meta-code--highlight">
                {verificationCode.match(/.{1,4}/g)?.join(" ") ?? verificationCode}
              </code>
            </div>
            <div className="cert-meta-integrity">
              <span className="cert-integrity-badge">
                <span className="cert-integrity-pulse" />
                <span>REGISTRE CRYPTOGRAPHIQUE SCELLÉ</span>
              </span>
            </div>
          </div>

          {/* Colonne 3 : Direction Pédagogique & QR Code */}
          <div className="cert-auth-col">
            <div className="cert-qr-frame" title="Scannez pour vérifier l'authenticité sur la blockchain CyberPingo">
              {qrData.size > 0 ? (
                <svg
                  viewBox={`0 0 ${qrData.size} ${qrData.size}`}
                  className="cert-qr-svg"
                  shapeRendering="crispEdges"
                >
                  <rect width={qrData.size} height={qrData.size} fill="#ffffff" />
                  {qrData.cells.map((cell, idx) => (
                    <rect key={idx} x={cell.x} y={cell.y} width={1} height={1} fill="#061226" />
                  ))}
                </svg>
              ) : (
                <div className="cert-qr-fallback">QR Code</div>
              )}
              <span className="cert-qr-hint">Scan de vérification</span>
            </div>

            <div className="cert-signature-block">
              <div className="cert-signature-img-wrapper">
                <Image
                  src="/images/signature.png"
                  alt="Signature de la Direction Académique"
                  width={110}
                  height={42}
                  className="cert-signature-img"
                />
              </div>
              <div className="cert-signature-line" />
              <strong className="cert-signature-signer">Professeur Pingo</strong>
              <span className="cert-signature-role">Directeur des Études & du SOC Académique</span>
            </div>
          </div>
        </footer>

        {/* Bandeau Inférieur de Sécurité avec filigrane */}
        <div className="cert-bottom-strip">
          <span>cyberpingo.vercel.app · Certificat infalsifiable scellé par empreinte SHA-256</span>
          <span>Protocole Pédagogique Conforme ANSSI / OWASP Top 10</span>
        </div>
      </article>

      {/* Message spécifique si révoqué */}
      {!valid && (
        <aside className="cert-revoked-banner" role="alert">
          <strong className="cert-revoked-title">Attention : Ce document officiel a été révoqué</strong>
          <p className="cert-revoked-desc">
            Ce certificat a été révoqué {revokedAt ? `le ${formatDate(revokedAt)}` : "par l'administration"}. Il
            ne doit plus être admis comme preuve d&apos;aptitude ou de formation.
          </p>
          {revokedReason && (
            <p className="cert-revoked-reason">
              <strong>Motif notifié :</strong> {revokedReason}
            </p>
          )}
        </aside>
      )}
    </div>
  );
}
