import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { unwrap } from "@/lib/errors";
import type { CbCatalog, CbItemKind, CbRule, CbTransaction, CbUnlockResult, CbWallet } from "@/types/cyberbits";

/** Prices, unlock state and prerequisites of every published course and lab. Readable without an account. */
export async function getCatalog(): Promise<CbCatalog> {
  return unwrap(await getSupabaseBrowserClient().rpc("get_cb_catalog"), "Impossible de charger la boutique.") as unknown as CbCatalog;
}

export async function getWallet(): Promise<CbWallet> {
  return unwrap(await getSupabaseBrowserClient().rpc("get_my_wallet"), "Impossible de charger ton solde.") as unknown as CbWallet;
}

/** Newest first, with the balance after each movement. Pass the id of the last row to get the next page. */
export async function getHistory(limit = 30, before?: number): Promise<CbTransaction[]> {
  const result = unwrap(
    await getSupabaseBrowserClient().rpc("get_my_cb_history", { p_limit: limit, ...(before ? { p_before: before } : {}) }),
    "Impossible de charger ton historique.",
  ) as unknown as { transactions: CbTransaction[] };
  return result.transactions;
}

/** Debit and unlock happen in one transaction on the server; nothing is debited when a check fails. */
export async function unlockItem(kind: CbItemKind, id: string): Promise<CbUnlockResult> {
  const supabase = getSupabaseBrowserClient();
  const fallback = "Le déblocage a échoué. Tu n’as rien perdu, réessaie.";
  const result = kind === "course"
    ? unwrap(await supabase.rpc("unlock_course", { p_course_id: id }), fallback)
    : unwrap(await supabase.rpc("unlock_lab", { p_lab_id: id }), fallback);
  return result as unknown as CbUnlockResult;
}

/** The public price list and reward table. */
export async function listRules(): Promise<CbRule[]> {
  const rows = unwrap(
    await getSupabaseBrowserClient().from("cb_rules").select("key, kind, label, description, amount, is_active, position").order("position"),
    "Impossible de charger le barème.",
  ) ?? [];
  return rows.map((row) => ({ ...row, kind: row.kind as CbRule["kind"] }));
}
