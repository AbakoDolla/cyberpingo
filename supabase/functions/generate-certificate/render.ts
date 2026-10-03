// Rendu du certificat de réussite CyberPingo : A4 paysage, aux couleurs de la marque (logo, mascotte, polices Space Grotesk,
// Inter et JetBrains Mono) avec un QR code qui mène à la page de vérification. Aucun fichier ni appel réseau : le logo et
// les polices viennent de brand.ts (généré par scripts/build-certificate-brand.cjs).
//
// Si les polices de marque ne peuvent pas être chargées, le certificat est produit quand même avec les polices standard :
// un apprenant ne doit jamais rester sans son PDF à cause d'un détail de mise en page.
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
} from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
// @ts-ignore The package declares a global `qrcode` function instead of a module: tsc and Deno read its types differently.
import qrcodeGenerator from "npm:qrcode-generator@1.4.4";
import {
  EMBLEM_PNG,
  FONT_GROTESK_BOLD,
  FONT_GROTESK_MEDIUM,
  FONT_INTER_REGULAR,
  FONT_INTER_SEMI_BOLD,
  FONT_MONO_MEDIUM,
  WORDMARK_PNG,
} from "./brand.ts";

export type CertificateData = {
  certificate_number: string;
  verification_code: string;
  recipient_name: string;
  course_title: string;
  issued_at: string;
};

type Color = ReturnType<typeof rgb>;
type Fonts = { display: PDFFont; displayMedium: PDFFont; text: PDFFont; textBold: PDFFont; mono: PDFFont; branded: boolean };

type QrCode = { addData(text: string): void; make(): void; getModuleCount(): number; isDark(row: number, column: number): boolean };
const qrcode = qrcodeGenerator as unknown as (typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H") => QrCode;

export const PAGE = { width: 842, height: 595 } as const;

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

// Decoded once per instance: a warm Edge Function serves many certificates.
const decoded = new Map<string, Uint8Array>();
const fromBase64 = (value: string): Uint8Array => {
  let bytes = decoded.get(value);
  if (!bytes) {
    bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    decoded.set(value, bytes);
  }
  return bytes;
};

async function loadFonts(pdf: PDFDocument): Promise<Fonts> {
  try {
    pdf.registerFontkit(fontkit);
    const [display, displayMedium, text, textBold, mono] = await Promise.all([
      pdf.embedFont(fromBase64(FONT_GROTESK_BOLD), { subset: true }),
      pdf.embedFont(fromBase64(FONT_GROTESK_MEDIUM), { subset: true }),
      pdf.embedFont(fromBase64(FONT_INTER_REGULAR), { subset: true }),
      pdf.embedFont(fromBase64(FONT_INTER_SEMI_BOLD), { subset: true }),
      pdf.embedFont(fromBase64(FONT_MONO_MEDIUM), { subset: true }),
    ]);
    return { display, displayMedium, text, textBold, mono, branded: true };
  } catch (error) {
    console.error("Polices de marque indisponibles, repli sur les polices standard :", error);
    const [display, text, textBold, mono] = await Promise.all([
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedFont(StandardFonts.Helvetica),
      pdf.embedFont(StandardFonts.HelveticaBold),
      pdf.embedFont(StandardFonts.Courier),
    ]);
    return { display, displayMedium: display, text, textBold, mono, branded: false };
  }
}

// Keeps only the characters the font can draw (an emoji or an ideogram in a name would otherwise show as an empty box).
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

const mix = (a: Color, b: Color, t: number): Color => rgb(a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t);

function gradientBar(page: PDFPage, x: number, y: number, width: number, height: number, stops: Color[], opacity = 1, steps = 64) {
  const slice = width / steps;
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const scaled = t * (stops.length - 1);
    const index = Math.min(stops.length - 2, Math.floor(scaled));
    page.drawRectangle({ x: x + i * slice, y, width: slice + 0.4, height, color: mix(stops[index], stops[index + 1], scaled - index), opacity });
  }
}

// A soft glow: concentric translucent discs, bright at the centre and fading out.
function glow(page: PDFPage, x: number, y: number, radius: number, color: Color, strength: number) {
  const rings = 16;
  for (let i = 0; i < rings; i += 1) page.drawCircle({ x, y, size: radius * (1 - i / rings), color, opacity: strength / rings });
}

function roundedRect(page: PDFPage, x: number, y: number, width: number, height: number, radius: number, options: { color?: Color; opacity?: number; borderColor?: Color; borderWidth?: number; borderOpacity?: number }) {
  const r = Math.min(radius, width / 2, height / 2);
  const path = `M ${r} 0 H ${width - r} A ${r} ${r} 0 0 1 ${width} ${r} V ${height - r} A ${r} ${r} 0 0 1 ${width - r} ${height} H ${r} A ${r} ${r} 0 0 1 0 ${height - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  page.drawSvgPath(path, { x, y: y + height, ...options });
}

function spacedWidth(font: PDFFont, text: string, size: number, spacing: number): number {
  return font.widthOfTextAtSize(text, size) + spacing * Math.max(0, Array.from(text).length - 1);
}

// Letter-spaced capitals, for the small labels. The label is one text run with PDF character spacing, not one drawing operation
// per letter: the file stays small and the text keeps its reading order. `anchor` is the left edge, or the centre.
function spaced(page: PDFPage, text: string, options: { anchor: number; y: number; size: number; font: PDFFont; color: Color; spacing: number; center?: boolean }) {
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
    popGraphicsState(),
  );
}

function centered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color: Color, anchor = PAGE.width / 2) {
  page.drawText(text, { x: anchor - font.widthOfTextAtSize(text, size) / 2, y, size, font, color });
}

function drawQr(page: PDFPage, text: string, x: number, y: number, size: number) {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const count = code.getModuleCount();
  const module = size / count;
  for (let row = 0; row < count; row += 1) {
    let column = 0;
    while (column < count) {
      if (!code.isDark(row, column)) { column += 1; continue; }
      const start = column;
      while (column < count && code.isDark(row, column)) column += 1;
      page.drawRectangle({ x: x + start * module, y: y + size - (row + 1) * module, width: (column - start) * module + 0.2, height: module + 0.2, color: QR_INK });
    }
  }
}

function drawBackdrop(page: PDFPage) {
  const { width, height } = PAGE;
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
  const centerX = PAGE.width / 2;
  gradientBar(page, centerX - 150, y, 128, 1.1, [NAVY, BLUE], 0.9, 24);
  gradientBar(page, centerX + 22, y, 128, 1.1, [BLUE, NAVY], 0.9, 24);
  page.drawSvgPath("M 0 -6 L 6 0 L 0 6 L -6 0 Z", { x: centerX, y: y + 0.5, color: CYAN });
}

async function drawBrand(page: PDFPage, wordmark: PDFImage, emblem: PDFImage) {
  const markWidth = 224;
  const mark = wordmark.scale(markWidth / wordmark.width);
  page.drawImage(wordmark, { x: (PAGE.width - mark.width) / 2, y: PAGE.height - 46 - mark.height, width: mark.width, height: mark.height });

  // Seal of the mascot, bottom left.
  const sealX = 112;
  const sealY = 118;
  page.drawCircle({ x: sealX, y: sealY, size: 58, color: NIGHT, opacity: 0.7, borderColor: BLUE, borderWidth: 1.1, borderOpacity: 0.7 });
  page.drawCircle({ x: sealX, y: sealY, size: 52, borderColor: PURPLE, borderWidth: 0.7, borderOpacity: 0.6 });
  const mascot = emblem.scale(80 / emblem.width);
  page.drawImage(emblem, { x: sealX - mascot.width / 2, y: sealY - mascot.height / 2, width: mascot.width, height: mascot.height });
}

export async function renderCertificatePdf(certificate: CertificateData, verifyUrl: string): Promise<Uint8Array> {
  const issued = new Date(certificate.issued_at);
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.setTitle(`Certificat CyberPingo · ${certificate.course_title}`);
  pdf.setAuthor("CyberPingo");
  pdf.setSubject(`Certificat ${certificate.certificate_number}`);
  pdf.setCreator("CyberPingo");
  pdf.setProducer("CyberPingo");
  pdf.setKeywords(["CyberPingo", "certificat", "cybersécurité"]);
  pdf.setCreationDate(issued);
  pdf.setModificationDate(issued);
  pdf.catalog.set(PDFName.of("Lang"), PDFString.of("fr-FR"));
  pdf.catalog.getOrCreateViewerPreferences().setDisplayDocTitle(true);

  const fonts = await loadFonts(pdf);
  const [wordmark, emblem] = await Promise.all([pdf.embedPng(fromBase64(WORDMARK_PNG)), pdf.embedPng(fromBase64(EMBLEM_PNG))]);
  const page = pdf.addPage([PAGE.width, PAGE.height]); // A4 landscape, in points
  const { width } = PAGE;

  drawBackdrop(page);
  await drawBrand(page, wordmark, emblem);

  spaced(page, "CERTIFICAT DE RÉUSSITE", { anchor: width / 2, y: 482, size: 10.5, font: fonts.displayMedium, color: CYAN, spacing: 3.4, center: true });
  drawDivider(page, 465);

  centered(page, "Décerné à", fonts.text, 12.5, 436, MUTED);
  const name = printable(fonts.display, certificate.recipient_name) || "Apprenant CyberPingo";
  const nameMax = width - 160;
  let nameSize = fitSize(fonts.display, name, 46, nameMax, 30);
  const nameLines = fonts.display.widthOfTextAtSize(name, nameSize) > nameMax ? wrap(fonts.display, name, 30, nameMax, 2) : [name];
  if (nameLines.length > 1) nameSize = 30;
  const nameLead = nameSize + 6;
  nameLines.forEach((line, index) => centered(page, line, fonts.display, nameSize, 388 - index * nameLead, INK));
  let y = 388 - (nameLines.length - 1) * nameLead; // baseline of the last line of the name
  gradientBar(page, width / 2 - 130, y - 16, 260, 2.6, [BLUE, PURPLE, GREEN]);

  y -= 48;
  centered(page, "pour avoir terminé avec succès le parcours", fonts.text, 12.5, y, MUTED);
  const title = printable(fonts.textBold, certificate.course_title) || "Parcours CyberPingo";
  const titleSize = fitSize(fonts.textBold, title, 26, width - 220, 16);
  const titleLines = wrap(fonts.textBold, title, titleSize, width - 220);
  y -= 34;
  titleLines.forEach((line, index) => {
    centered(page, line, fonts.textBold, titleSize, y - index * (titleSize + 8), WHITE);
  });
  y -= (titleLines.length - 1) * (titleSize + 8);

  // What the certificate attests, and how to check it: the lines sit under the title, whatever its length,
  // and give way when a long name and a long title leave no room for them.
  const attestY = y - 40;
  if (attestY >= 212) {
    centered(page, "Toutes les leçons du parcours ont été suivies et tous ses quiz réussis.", fonts.text, 10.5, attestY, MUTED);
    centered(page, "Ce certificat se vérifie en ligne à tout moment, avec le code ci-dessous ou le QR code.", fonts.text, 10.5, attestY - 16, MUTED);
  }

  gradientBar(page, 62, 196, width - 124, 0.8, [PURPLE, BLUE, PURPLE], 0.35, 40);

  const issuedText = printable(
    fonts.text,
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(issued),
  );
  const columns: Array<{ label: string; value: string; font: PDFFont; x: number }> = [
    { label: "DÉLIVRÉ LE", value: issuedText, font: fonts.textBold, x: 196 },
    { label: "N° DE CERTIFICAT", value: certificate.certificate_number, font: fonts.mono, x: 346 },
    { label: "CODE DE VÉRIFICATION", value: certificate.verification_code, font: fonts.mono, x: 506 },
  ];
  for (const column of columns) {
    spaced(page, column.label, { anchor: column.x, y: 140, size: 7.4, font: fonts.textBold, color: MUTED, spacing: 1.5 });
    page.drawText(column.value, { x: column.x, y: 120, size: 12.5, font: column.font, color: INK });
  }
  page.drawText(printable(fonts.text, `Vérifier l’authenticité : ${verifyUrl}`), { x: 196, y: 84, size: 8.6, font: fonts.text, color: BLUE });

  // QR code on a white card (it needs a light quiet zone to be read from a screen or a printout).
  const cardX = width - 56 - 96;
  roundedRect(page, cardX, 62, 96, 96, 9, { color: WHITE });
  drawQr(page, verifyUrl, cardX + 8, 70, 80);
  centered(page, "Scanne pour vérifier", fonts.text, 7.4, 49, MUTED, cardX + 48);

  centered(page, "cyberpingo.vercel.app  ·  Apprends. Comprends. Réussis.", fonts.text, 7.6, 40, MUTED);
  gradientBar(page, 0, 0, width, 3, [BLUE, PURPLE, GREEN], 0.9);

  return pdf.save();
}
