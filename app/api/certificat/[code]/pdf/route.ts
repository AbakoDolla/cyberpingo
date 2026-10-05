import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { verifyCertificate } from "@/services/gamification.service";
import { generateCertificatePdf } from "@/lib/certificate-generator";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);

  const client = createSupabasePublicClient();
  if (!client) {
    return NextResponse.json({ error: "Service de certificat indisponible." }, { status: 503 });
  }

  const cert = await verifyCertificate(code, client);
  if (!cert.found || !cert.certificate_number || !cert.course_title || !cert.recipient_name) {
    return NextResponse.json({ error: "Certificat introuvable." }, { status: 404 });
  }

  const verifyUrl = `https://cyberpingo.vercel.app/certificat/${cert.verification_code ?? code}`;

  try {
    const pdfBytes = await generateCertificatePdf({
      certificateNumber: cert.certificate_number,
      verificationCode: cert.verification_code ?? code,
      recipientName: cert.recipient_name,
      courseTitle: cert.course_title,
      issuedAt: cert.issued_at ?? new Date(),
      examPercentage: cert.exam_percentage ?? null,
      verifyUrl,
    });

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Certificat-CyberPingo-${cert.verification_code ?? code}.pdf"`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("Erreur génération PDF certificat :", err);
    return NextResponse.json({ error: "Échec de génération du PDF." }, { status: 500 });
  }
}
