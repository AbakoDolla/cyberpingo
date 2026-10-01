// generate-certificate · renders the PDF of a certificate the caller owns (or that staff can read),
// stores it in the private `certificates` bucket and records its path.
//
// Body: { certificate_id: uuid }  →  { pdf_path: "<user id>/<certificate number>.pdf" }
import { PDFDocument, type PDFFont, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import { HttpError, readJson, requireCaller, requireUuid, serve, serviceClient, userClient } from "../_shared/http.ts";

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

const INK = rgb(0.886, 0.91, 0.941);
const MUTED = rgb(0.58, 0.64, 0.72);
const BLUE = rgb(0, 0.659, 1);
const PURPLE = rgb(0.545, 0.361, 0.965);
const GREEN = rgb(0, 1, 0.533);
const NIGHT = rgb(0.02, 0.031, 0.086);
const NAVY = rgb(0.059, 0.09, 0.165);

// The standard PDF fonts only cover WinAnsi; anything else (emoji, CJK…) is dropped rather than crashing.
function printable(font: PDFFont, text: string): string {
  return Array.from(text)
    .filter((char) => {
      try {
        font.encodeText(char);
        return true;
      } catch {
        return false;
      }
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function fitSize(font: PDFFont, text: string, preferred: number, maxWidth: number, min = 14): number {
  let size = preferred;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number, maxLines = 2): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, "")}…`;
    return kept;
  }
  return lines;
}

async function renderPdf(certificate: CertificateRow, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificat CyberPingo · ${certificate.course_title}`);
  pdf.setAuthor("CyberPingo");
  pdf.setSubject(`Certificat ${certificate.certificate_number}`);
  pdf.setCreator("CyberPingo");

  const page = pdf.addPage([842, 595]); // A4 landscape, in points
  const { width, height } = page.getSize();
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width, height, color: NIGHT });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, color: NAVY, borderColor: BLUE, borderWidth: 1.2, borderOpacity: 0.6 });
  page.drawRectangle({ x: 28, y: height - 34, width: (width - 56) / 2, height: 6, color: BLUE });
  page.drawRectangle({ x: width / 2, y: height - 34, width: (width - 56) / 2, height: 6, color: PURPLE });
  page.drawCircle({ x: width - 90, y: 90, size: 150, color: PURPLE, opacity: 0.08 });
  page.drawCircle({ x: 80, y: height - 70, size: 110, color: BLUE, opacity: 0.07 });

  const center = (text: string, font: PDFFont, size: number, y: number, color = INK) => {
    page.drawText(text, { x: (width - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
  };

  center("CYBERPINGO", sansBold, 15, height - 88, GREEN);
  center("CERTIFICAT DE RÉUSSITE", sans, 11, height - 110, MUTED);

  const name = printable(serif, certificate.recipient_name) || "Apprenant CyberPingo";
  center("Décerné à", sans, 13, height - 170, MUTED);
  const nameSize = fitSize(serif, name, 44, width - 180, 22);
  center(name, serif, nameSize, height - 222);
  page.drawRectangle({ x: width / 2 - 120, y: height - 240, width: 240, height: 1.5, color: BLUE, opacity: 0.8 });

  center("pour avoir terminé avec succès le parcours", sans, 13, height - 282, MUTED);
  const title = printable(sansBold, certificate.course_title) || "Parcours CyberPingo";
  const titleSize = fitSize(sansBold, title, 24, width - 200, 16);
  wrap(sansBold, title, titleSize, width - 200).forEach((line, index) => {
    center(line, sansBold, titleSize, height - 322 - index * (titleSize + 8), INK);
  });

  const issued = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })
    .format(new Date(certificate.issued_at));
  const columns: Array<[string, string]> = [
    ["DÉLIVRÉ LE", printable(sans, issued)],
    ["N° DE CERTIFICAT", certificate.certificate_number],
    ["CODE DE VÉRIFICATION", certificate.verification_code],
  ];
  const columnWidth = (width - 160) / columns.length;
  columns.forEach(([label, value], index) => {
    const x = 80 + index * columnWidth;
    page.drawText(label, { x, y: 128, size: 8.5, font: sansBold, color: MUTED });
    page.drawText(value, { x, y: 108, size: 13, font: index === 0 ? sans : mono, color: INK });
  });

  const verifyText = printable(sans, `Vérifier l’authenticité : ${verifyUrl}`);
  page.drawText(verifyText, { x: 80, y: 64, size: 9.5, font: sans, color: BLUE });

  return pdf.save();
}

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
  if (certificate.pdf_path) {
    const folder = certificate.pdf_path.split("/")[0];
    const file = certificate.pdf_path.slice(folder.length + 1);
    const { data: existing } = await admin.storage.from("certificates").list(folder, { search: file, limit: 1 });
    if (existing?.some((entry) => entry.name === file)) return { pdf_path: certificate.pdf_path };
  }

  const site = (Deno.env.get("SITE_URL") ?? "https://cyberpingo.vercel.app").replace(/\/+$/, "");
  const bytes = await renderPdf(certificate, `${site}/certificat/${certificate.verification_code}`);
  const safeNumber = certificate.certificate_number.replace(/[^A-Za-z0-9._-]/g, "-");
  const path = `${certificate.user_id}/${safeNumber}.pdf`;

  const { error: uploadError } = await admin.storage.from("certificates").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { error: updateError } = await admin.from("certificates").update({ pdf_path: path }).eq("id", certificate.id);
  if (updateError) throw updateError;

  return { pdf_path: path };
});
