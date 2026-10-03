// generate-certificate · renders the PDF of a certificate the caller owns (or that staff can read),
// stores it in the private `certificates` bucket and records its path.
//
// Body: { certificate_id: uuid }  →  { pdf_path: "<user id>/<certificate number>.v2.pdf" }
//
// The layout lives in render.ts (CyberPingo logo, mascot, brand fonts and a verification QR code). The ".v2" of the file name
// is the design version: a certificate whose stored PDF still has the plain first design is rendered again the next time
// it is downloaded, and the old file is removed.
import { HttpError, readJson, requireCaller, requireUuid, serve, serviceClient, userClient } from "../_shared/http.ts";
import { renderCertificatePdf } from "./render.ts";

type CertificateRow = {
  id: string;
  user_id: string;
  certificate_number: string;
  verification_code: string;
  recipient_name: string;
  course_title: string;
  issued_at: string;
  revoked_at: string | null;
  pdf_path: string | null;
};

const DESIGN_SUFFIX = ".v2.pdf";

serve(async (request) => {
  const caller = userClient(request);
  await requireCaller(caller);
  const body = await readJson(request);
  const certificateId = requireUuid(body.certificate_id, "de certificat");

  // Read through RLS: only the owner (or staff) can see the row, which authorises the generation.
  const { data: certificate, error } = await caller
    .from("certificates")
    .select("id, user_id, certificate_number, verification_code, recipient_name, course_title, issued_at, revoked_at, pdf_path")
    .eq("id", certificateId)
    .maybeSingle<CertificateRow>();
  if (error) throw error;
  if (!certificate) throw new HttpError(404, "Certificat introuvable.");
  if (certificate.revoked_at) throw new HttpError(409, "Ce certificat a été révoqué.");

  const admin = serviceClient();
  if (certificate.pdf_path?.endsWith(DESIGN_SUFFIX)) {
    const folder = certificate.pdf_path.split("/")[0];
    const file = certificate.pdf_path.slice(folder.length + 1);
    const { data: existing } = await admin.storage.from("certificates").list(folder, { search: file, limit: 1 });
    if (existing?.some((entry) => entry.name === file)) return { pdf_path: certificate.pdf_path };
  }

  const site = (Deno.env.get("SITE_URL") ?? "https://cyberpingo.vercel.app").replace(/\/+$/, "");
  const bytes = await renderCertificatePdf(certificate, `${site}/certificat/${certificate.verification_code}`);
  const safeNumber = certificate.certificate_number.replace(/[^A-Za-z0-9._-]/g, "-");
  const path = `${certificate.user_id}/${safeNumber}${DESIGN_SUFFIX}`;

  const { error: uploadError } = await admin.storage.from("certificates").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { error: updateError } = await admin.from("certificates").update({ pdf_path: path }).eq("id", certificate.id);
  if (updateError) throw updateError;

  // The first design is replaced, not kept next to the new one (best effort: a leftover file is harmless).
  if (certificate.pdf_path && certificate.pdf_path !== path) {
    await admin.storage.from("certificates").remove([certificate.pdf_path]).catch(() => undefined);
  }

  return { pdf_path: path };
});