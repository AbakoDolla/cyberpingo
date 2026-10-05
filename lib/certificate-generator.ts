import * as fs from "fs";
import * as path from "path";
import {
  beginText,
  endText,
  moveText,
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  PDFName,
  PDFString,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setCharacterSpacing,
  setFillingColor,
  setFontAndSize,
  showText,
  StandardFonts,
} from "pdf-lib";
import * as fontkit from "@pdf-lib/fontkit";
// @ts-ignore qrcode-generator typings
import * as qrcodeGenerator from "qrcode-generator";
import {
  EMBLEM_PNG,
  FONT_GROTESK_BOLD,
  FONT_GROTESK_MEDIUM,
  FONT_INTER_REGULAR,
  FONT_INTER_SEMI_BOLD,
  FONT_MONO_MEDIUM,
  WORDMARK_PNG,
} from "@/supabase/functions/generate-certificate/brand";

export interface GenerateCertificateParams {
  recipientName: string;
  courseTitle: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string | Date;
  examPercentage?: number | null;
  verifyUrl: string;
}

type Color = ReturnType<typeof rgb>;
type Fonts = { display: PDFFont; displayMedium: PDFFont; text: PDFFont; textBold: PDFFont; mono: PDFFont; branded: boolean };

type QrCode = { addData(text: string): void; make(): void; getModuleCount(): number; isDark(row: number, column: number): boolean };
const qrcodeFn = (
  typeof qrcodeGenerator === "function"
    ? qrcodeGenerator
    : (qrcodeGenerator as { default?: unknown }).default ?? qrcodeGenerator
) as unknown as (typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H") => QrCode;

export const CERTIFICATE_PAGE = { width: 842, height: 595 } as const;

const INK = rgb(0.886, 0.91, 0.941);
const MUTED = rgb(0.58, 0.64, 0.72);
const BLUE = rgb(0, 0.659, 1);
const CYAN = rgb(0, 0.835, 1);
const PURPLE = rgb(0.545, 0.361, 0.965);
const GREEN = rgb(0.063, 0.878, 0.541);
const NIGHT = rgb(0.02, 0.031, 0.086);
const NAVY = rgb(0.059, 0.09, 0.165);
const WHITE = rgb(1, 1, 1);
const QR_INK = rgb(0.02, 0.031, 0.086);

const fromBase64 = (value: string): Uint8Array => Uint8Array.from(Buffer.from(value, "base64"));

async function loadFonts(pdf: PDFDocument): Promise<Fonts> {
  try {
    const fkInstance = (fontkit as unknown as { default?: unknown }).default ?? fontkit;
    // @ts-ignore fontkit registration
    pdf.registerFontkit(fkInstance);
    const [display, displayMedium, text, textBold, mono] = await Promise.all([
      pdf.embedFont(fromBase64(FONT_GROTESK_BOLD), { subset: true }),
      pdf.embedFont(fromBase64(FONT_GROTESK_MEDIUM), { subset: true }),
      pdf.embedFont(fromBase64(FONT_INTER_REGULAR), { subset: true }),
      pdf.embedFont(fromBase64(FONT_INTER_SEMI_BOLD), { subset: true }),
      pdf.embedFont(fromBase64(FONT_MONO_MEDIUM), { subset: true }),
    ]);
    return { display, displayMedium, text, textBold, mono, branded: true };
  } catch (error) {
    console.error("Polices de marque indisponibles, repli sur polices standard :", error);
    const [display, text, textBold, mono] = await Promise.all([
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedFont(StandardFonts.Helvetica),
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedFont(StandardFonts.Courier),
    ]);
    return { display, displayMedium: display, text, textBold, mono, branded: false };
  }
}

function printable(font: PDFFont, text: string): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text)
    .filter((char) => supported.has(char.codePointAt(0) ?? 0))
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

const mix = (a: Color, b: Color, t: number): Color =>
  rgb(a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t);

function gradientBar(page: PDFPage, x: number, y: number, width: number, height: number, stops: Color[], opacity = 1, steps = 64) {
  const slice = width / steps;
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const scaled = t * (stops.length - 1);
    const index = Math.min(stops.length - 2, Math.floor(scaled));
    page.drawRectangle({
      x: x + i * slice,
      y,
      width: slice + 0.4,
      height,
      color: mix(stops[index], stops[index + 1], scaled - index),
      opacity,
    });
  }
}

function glow(page: PDFPage, x: number, y: number, radius: number, color: Color, strength: number) {
  const rings = 16;
  for (let i = 0; i < rings; i += 1) page.drawCircle({ x, y, size: radius * (1 - i / rings), color, opacity: strength / rings });
}

function roundedRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  options: { color?: Color; opacity?: number; borderColor?: Color; borderWidth?: number; borderOpacity?: number }
) {
  const r = Math.min(radius, width / 2, height / 2);
  const pathData = `M ${r} 0 H ${width - r} A ${r} ${r} 0 0 1 ${width} ${r} V ${height - r} A ${r} ${r} 0 0 1 ${width - r} ${height} H ${r} A ${r} ${r} 0 0 1 0 ${height - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  page.drawSvgPath(pathData, { x, y: y + height, ...options });
}

function spacedWidth(font: PDFFont, text: string, size: number, spacing: number): number {
  return font.widthOfTextAtSize(text, size) + spacing * Math.max(0, Array.from(text).length - 1);
}

function spaced(
  page: PDFPage,
  text: string,
  options: { anchor: number; y: number; size: number; font: PDFFont; color: Color; spacing: number; center?: boolean }
) {
  const x = options.center ? options.anchor - spacedWidth(options.font, text, options.size, options.spacing) / 2 : options.anchor;
  const fontKey = page.node.newFontDictionary(options.font.name, options.font.ref);
  page.pushOperators(
    pushGraphicsState(),
    setFillingColor(options.color),
    beginText(),
    setFontAndSize(fontKey, options.size),
    setCharacterSpacing(options.spacing),
    moveText(x, options.y),
    showText(options.font.encodeText(text)),
    endText(),
    popGraphicsState()
  );
}

function centered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color: Color, anchor = CERTIFICATE_PAGE.width / 2) {
  page.drawText(text, { x: anchor - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
}

function drawQr(page: PDFPage, text: string, x: number, y: number, size: number) {
  const code = qrcodeFn(0, "M");
  code.addData(text);
  code.make();
  const count = code.getModuleCount();
  const cellSize = size / count;
  for (let row = 0; row < count; row += 1) {
    let column = 0;
    while (column < count) {
      if (!code.isDark(row, column)) {
        column += 1;
        continue;
      }
      const start = column;
      while (column < count && code.isDark(row, column)) column += 1;
      page.drawRectangle({
        x: x + start * cellSize,
        y: y + size - (row + 1) * cellSize,
        width: (column - start) * cellSize + 0.2,
        height: cellSize + 0.2,
        color: QR_INK,
      });
    }
  }
}

function drawBackdrop(page: PDFPage) {
  const { width, height } = CERTIFICATE_PAGE;
  page.drawRectangle({ x: 0, y: 0, width, height, color: NIGHT });
  glow(page, width - 70, height - 40, 330, BLUE, 0.4);
  glow(page, 50, 40, 300, PURPLE, 0.42);
  for (let x = 28; x < width; x += 28) page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: 0.4, color: WHITE, opacity: 0.032 });
  for (let y = 28; y < height; y += 28) page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: 0.4, color: WHITE, opacity: 0.032 });
  page.drawCircle({ x: width - 40, y: height + 10, size: 150, borderColor: CYAN, borderWidth: 0.9, borderOpacity: 0.22 });
  page.drawCircle({ x: width - 40, y: height + 10, size: 118, borderColor: PURPLE, borderWidth: 0.6, borderOpacity: 0.28 });
  page.drawCircle({ x: 30, y: 0, size: 130, borderColor: PURPLE, borderWidth: 0.9, borderOpacity: 0.26 });
  gradientBar(page, 0, height - 6, width, 6, [BLUE, PURPLE, GREEN]);
  roundedRect(page, 22, 22, width - 44, height - 50, 22, { color: NAVY, opacity: 0.55, borderColor: BLUE, borderWidth: 1.2, borderOpacity: 0.6 });
  roundedRect(page, 31, 31, width - 62, height - 68, 15, { borderColor: PURPLE, borderWidth: 0.6, borderOpacity: 0.32 });
}

function drawDivider(page: PDFPage, y: number) {
  const centerX = CERTIFICATE_PAGE.width / 2;
  gradientBar(page, centerX - 150, y, 128, 1.1, [NAVY, BLUE], 0.9, 24);
  gradientBar(page, centerX + 22, y, 128, 1.1, [BLUE, NAVY], 0.9, 24);
  page.drawSvgPath("M 0 -6 L 6 0 L 0 6 L -6 0 Z", { x: centerX, y: y + 0.5, color: CYAN });
}

export async function generateCertificatePdf(params: GenerateCertificateParams): Promise<Uint8Array> {
  const issued = new Date(params.issuedAt);
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setTitle(`Certificat CyberPingo · ${params.courseTitle}`);
  pdf.setAuthor("CyberPingo");
  pdf.setSubject(`Certificat ${params.certificateNumber}`);
  pdf.setCreator("CyberPingo");
  pdf.setProducer("CyberPingo");
  pdf.setKeywords(["CyberPingo", "certificat", "cybersécurité", "examen"]);
  pdf.setCreationDate(issued);
  pdf.setModificationDate(issued);
  pdf.catalog.set(PDFName.of("Lang"), PDFString.of("fr-FR"));
  pdf.catalog.getOrCreateViewerPreferences().setDisplayDocTitle(true);

  const fonts = await loadFonts(pdf);
  const [wordmark, emblem] = await Promise.all([
    pdf.embedPng(fromBase64(WORDMARK_PNG)),
    pdf.embedPng(fromBase64(EMBLEM_PNG)),
  ]);

  // Load authentic signature if available
  let signatureImg: PDFImage | null = null;
  try {
    const sigPath = path.join(process.cwd(), "public", "images", "signature.png");
    if (fs.existsSync(sigPath)) {
      signatureImg = await pdf.embedPng(fs.readFileSync(sigPath));
    }
  } catch (e) {
    console.warn("Signature non chargée :", e);
  }

  const page = pdf.addPage([CERTIFICATE_PAGE.width, CERTIFICATE_PAGE.height]);
  const { width } = CERTIFICATE_PAGE;

  drawBackdrop(page);

  // Brand top header
  const markWidth = 224;
  const mark = wordmark.scale(markWidth / wordmark.width);
  page.drawImage(wordmark, { x: (width - mark.width) / 2, y: CERTIFICATE_PAGE.height - 46 - mark.height, width: mark.width, height: mark.height });

  // Mascot seal on bottom left
  const sealX = 106;
  const sealY = 114;
  page.drawCircle({ x: sealX, y: sealY, size: 56, color: NIGHT, opacity: 0.7, borderColor: BLUE, borderWidth: 1.1, borderOpacity: 0.7 });
  page.drawCircle({ x: sealX, y: sealY, size: 50, borderColor: PURPLE, borderWidth: 0.7, borderOpacity: 0.6 });
  const mascot = emblem.scale(76 / emblem.width);
  page.drawImage(emblem, { x: sealX - mascot.width / 2, y: sealY - mascot.height / 2, width: mascot.width, height: mascot.height });

  spaced(page, "CERTIFICAT DE RÉUSSITE", { anchor: width / 2, y: 482, size: 10.5, font: fonts.displayMedium, color: CYAN, spacing: 3.4, center: true });
  drawDivider(page, 465);

  centered(page, "Décerné à", fonts.text, 12.5, 436, MUTED);
  const name = printable(fonts.display, params.recipientName) || "Apprenant CyberPingo";
  const nameMax = width - 160;
  let nameSize = fitSize(fonts.display, name, 44, nameMax, 28);
  const nameLines = fonts.display.widthOfTextAtSize(name, nameSize) > nameMax ? wrap(fonts.display, name, 28, nameMax, 2) : [name];
  if (nameLines.length > 1) nameSize = 28;
  const nameLead = nameSize + 6;
  nameLines.forEach((line, index) => centered(page, line, fonts.display, nameSize, 388 - index * nameLead, INK));
  let y = 388 - (nameLines.length - 1) * nameLead;
  gradientBar(page, width / 2 - 130, y - 16, 260, 2.6, [BLUE, PURPLE, GREEN]);

  y -= 46;
  centered(page, "pour avoir terminé avec succès le parcours", fonts.text, 12.5, y, MUTED);
  const title = printable(fonts.textBold, params.courseTitle) || "Parcours CyberPingo";
  const titleSize = fitSize(fonts.textBold, title, 25, width - 220, 16);
  const titleLines = wrap(fonts.textBold, title, titleSize, width - 220);
  y -= 32;
  titleLines.forEach((line, index) => {
    centered(page, line, fonts.textBold, titleSize, y - index * (titleSize + 8), WHITE);
  });
  y -= (titleLines.length - 1) * (titleSize + 8);

  // Attestation line: mentioning the 70% exam pass
  const attestY = y - 38;
  const examText = params.examPercentage
    ? `Examen final validé avec un score officiel de ${params.examPercentage} % (seuil de réussite : 70 %).`
    : "Toutes les leçons du parcours ont été suivies et l'examen final a été validé avec succès.";
  centered(page, examText, fonts.text, 10.5, attestY, INK);
  centered(page, "Ce certificat officiel se vérifie en ligne à tout moment avec le code ci-dessous ou le QR code.", fonts.text, 9.5, attestY - 16, MUTED);

  gradientBar(page, 58, 188, width - 116, 0.8, [PURPLE, BLUE, PURPLE], 0.35, 40);

  const issuedText = printable(
    fonts.text,
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(issued)
  );

  // Metadata columns
  const columns: Array<{ label: string; value: string; font: PDFFont; x: number }> = [
    { label: "DÉLIVRÉ LE", value: issuedText, font: fonts.textBold, x: 182 },
    { label: "N° DE CERTIFICAT", value: params.certificateNumber, font: fonts.mono, x: 312 },
    { label: "CODE DE VÉRIFICATION", value: params.verificationCode, font: fonts.mono, x: 448 },
  ];
  for (const column of columns) {
    spaced(page, column.label, { anchor: column.x, y: 140, size: 7.2, font: fonts.textBold, color: MUTED, spacing: 1.4 });
    page.drawText(column.value, { x: column.x, y: 120, size: 11.5, font: column.font, color: INK });
  }
  page.drawText(printable(fonts.text, `Vérification : ${params.verifyUrl}`), { x: 182, y: 78, size: 8.2, font: fonts.text, color: BLUE });

  // Signature Block
  const sigX = 574;
  const sigY = 82;
  if (signatureImg) {
    const sigDims = signatureImg.scale(0.24);
    page.drawImage(signatureImg, {
      x: sigX,
      y: sigY,
      width: Math.min(120, sigDims.width),
      height: Math.min(48, sigDims.height),
    });
  }
  gradientBar(page, sigX - 6, sigY - 4, 116, 0.8, [BLUE, CYAN], 0.6, 20);
  spaced(page, "DIRECTION PÉDAGOGIQUE", { anchor: sigX - 6, y: sigY - 14, size: 6.8, font: fonts.textBold, color: MUTED, spacing: 1.2 });
  page.drawText("CyberPingo", { x: sigX - 6, y: sigY - 24, size: 7.8, font: fonts.textBold, color: CYAN });

  // QR Code on right card
  const cardX = width - 48 - 88;
  roundedRect(page, cardX, 58, 88, 88, 8, { color: WHITE });
  drawQr(page, params.verifyUrl, cardX + 7, 65, 74);
  centered(page, "Scanne pour vérifier", fonts.text, 6.8, 47, MUTED, cardX + 44);

  centered(page, "cyberpingo.vercel.app  ·  Apprends. Pratique. Protège.", fonts.text, 7.5, 34, MUTED);
  gradientBar(page, 0, 0, width, 3, [BLUE, PURPLE, GREEN], 0.9);

  return pdf.save();
}
