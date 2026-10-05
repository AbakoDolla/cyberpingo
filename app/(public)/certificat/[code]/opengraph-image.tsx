import { ImageResponse } from "next/og";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { verifyCertificate } from "@/services/gamification.service";

export const alt = "Certificat de réussite officiel CyberPingo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);

  const client = createSupabasePublicClient();
  const cert = client ? await verifyCertificate(code, client).catch(() => null) : null;

  const recipient = cert?.recipient_name || "Apprenant CyberPingo";
  const course = cert?.course_title || "Parcours de formation";
  const percentage = cert?.exam_percentage;
  const certNumber = cert?.certificate_number || `CP-2026-${code.slice(0, 6)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          backgroundColor: "#020817",
          backgroundImage:
            "radial-gradient(circle at 85% 10%, rgba(103, 39, 248, 0.35), transparent 45%), radial-gradient(circle at 10% 90%, rgba(0, 213, 255, 0.25), transparent 40%)",
          fontFamily: "sans-serif",
          color: "#f1f8ff",
          border: "2px solid rgba(0, 213, 255, 0.4)",
        }}
      >
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #00d5ff, #1765f5, #9a64ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#ffffff",
              }}
            >
              🐧
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
                CyberPingo
              </span>
              <span style={{ fontSize: "13px", color: "#8ea3c0", letterSpacing: "0.08em" }}>
                ACADÉMIE DE CYBERSÉCURITÉ
              </span>
            </div>
          </div>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: "999px",
              backgroundColor: "rgba(0, 213, 255, 0.15)",
              border: "1px solid rgba(0, 213, 255, 0.4)",
              color: "#00d5ff",
              fontSize: "14px",
              fontWeight: "700",
              letterSpacing: "0.1em",
            }}
          >
            CERTIFICAT OFFICIEL
          </div>
        </div>

        {/* Center Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
          <div style={{ fontSize: "16px", color: "#8ea3c0", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Décerné avec succès à
          </div>
          <div
            style={{
              fontSize: "52px",
              fontWeight: "900",
              color: "#ffffff",
              lineHeight: 1.1,
              textShadow: "0 4px 20px rgba(0, 213, 255, 0.3)",
            }}
          >
            {recipient}
          </div>
          <div style={{ fontSize: "20px", color: "#b5c5df" }}>
            pour avoir validé l’examen de certification du parcours :
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color: "#00d5ff",
              lineHeight: 1.2,
            }}
          >
            {course}
          </div>
        </div>

        {/* Bottom Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div style={{ display: "flex", gap: "36px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", color: "#8ea3c0", textTransform: "uppercase" }}>N° CERTIFICAT</span>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff", fontFamily: "monospace" }}>
                {certNumber}
              </span>
            </div>
            {percentage ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "11px", color: "#8ea3c0", textTransform: "uppercase" }}>SCORE EXAMEN</span>
                <span style={{ fontSize: "16px", fontWeight: "800", color: "#3efa95" }}>
                  {percentage} % (Réussi)
                </span>
              </div>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "11px", color: "#8ea3c0", textTransform: "uppercase" }}>VÉRIFICATION</span>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff", fontFamily: "monospace" }}>
                {code}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#8ea3c0", fontSize: "14px" }}>
            <span>Vérifiable sur cyberpingo.vercel.app</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
