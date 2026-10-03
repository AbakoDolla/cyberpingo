/**
 * File name suffix of the current certificate design. It must stay equal to DESIGN_SUFFIX in
 * supabase/functions/generate-certificate/index.ts (tests/certificate.test.cjs checks it): a stored PDF that does not
 * end with it was drawn with an older design, so the Edge Function is asked to draw it again.
 */
export const CERTIFICATE_DESIGN_SUFFIX = ".v2.pdf";

/** True when the stored PDF already has the current design, so there is nothing to ask the Edge Function. */
export function isCurrentCertificatePdf(path: string | null | undefined): boolean {
  return typeof path === "string" && path.endsWith(CERTIFICATE_DESIGN_SUFFIX);
}
