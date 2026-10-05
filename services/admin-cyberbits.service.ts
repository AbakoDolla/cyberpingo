import { unwrap } from "@/lib/errors";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";
import type {
  AdminCbOverview,
  AdminCbTransaction,
  AdminCbWallet,
  CbCatalog,
  CbReason,
} from "@/types/cyberbits";

type WalletsPage = { total: number; wallets: AdminCbWallet[] };
type TransactionsPage = { total: number; transactions: AdminCbTransaction[] };
type AdjustResult = { balance: number };

function supabase() {
  return getSupabaseBrowserClient();
}

function rpcJson<T>(value: Json | null, fallback: T): T {
  if (value === null) return fallback;
  return value as unknown as T;
}

export async function adminCbOverview(): Promise<AdminCbOverview> {
  return rpcJson(unwrap(await supabase().rpc("admin_cb_overview"), "Impossible de charger la vue CyberBits."), {} as AdminCbOverview);
}

export async function adminCbWallets(params: { search?: string; limit?: number; offset?: number } = {}): Promise<WalletsPage> {
  const data = unwrap(await supabase().rpc("admin_cb_wallets", {
    p_search: params.search || undefined,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  }), "Impossible de charger les portefeuilles CyberBits.");
  return rpcJson(data, { total: 0, wallets: [] });
}

export async function adminCbTransactions(params: { userId?: string; reason?: CbReason; limit?: number; offset?: number } = {}): Promise<TransactionsPage> {
  const data = unwrap(await supabase().rpc("admin_cb_transactions", {
    p_user: params.userId || undefined,
    p_reason: params.reason || undefined,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  }), "Impossible de charger les mouvements CyberBits.");
  return rpcJson(data, { total: 0, transactions: [] });
}

export async function getCbCatalog(): Promise<CbCatalog> {
  return rpcJson(unwrap(await supabase().rpc("get_cb_catalog"), "Impossible de charger le catalogue CyberBits."), {} as CbCatalog);
}

export async function adminSetCbRule(input: { key: string; amount: number; active: boolean; reason: string }): Promise<void> {
  unwrap(await supabase().rpc("admin_set_cb_rule", {
    p_key: input.key,
    p_amount: input.amount,
    p_active: input.active,
    p_reason: input.reason,
  }), "Le barème CyberBits n’a pas pu être enregistré.");
}

export async function adminSetCbPrice(input: { kind: "course" | "lab"; id: string; price: number | null; reason: string }): Promise<void> {
  unwrap(await supabase().rpc("admin_set_cb_price", {
    p_kind: input.kind,
    p_id: input.id,
    p_price: input.price as unknown as number,
    p_reason: input.reason,
  }), "Le prix CyberBits n’a pas pu être enregistré.");
}

export async function adminSetCbPrerequisite(input: { courseId: string; prerequisiteId: string | null; reason: string }): Promise<void> {
  unwrap(await supabase().rpc("admin_set_cb_prerequisite", {
    p_course_id: input.courseId,
    p_prerequisite_id: input.prerequisiteId as unknown as string,
    p_reason: input.reason,
  }), "Le prérequis CyberBits n’a pas pu être enregistré.");
}

export async function adminSetCbSettings(input: {
  rewards?: boolean | null;
  purchases?: boolean | null;
  gating?: boolean | null;
  pausedReason?: string | null;
  reason: string;
}): Promise<void> {
  unwrap(await supabase().rpc("admin_set_cb_settings", {
    p_rewards: input.rewards as unknown as boolean,
    p_purchases: input.purchases as unknown as boolean,
    p_gating: input.gating as unknown as boolean,
    p_paused_reason: input.pausedReason as unknown as string,
    p_reason: input.reason,
  }), "Les réglages CyberBits n’ont pas pu être enregistrés.");
}

export async function adminAdjustCb(input: { userId: string; amount: number; reason: string }): Promise<AdjustResult> {
  return rpcJson(unwrap(await supabase().rpc("admin_adjust_cb", {
    p_user: input.userId,
    p_amount: input.amount,
    p_reason: input.reason,
  }), "L’ajustement CyberBits a échoué."), { balance: 0 });
}

export async function adminGrantCbUnlock(input: { kind: "course" | "lab"; id: string; userId: string; reason: string }): Promise<void> {
  unwrap(await supabase().rpc("admin_grant_unlock", {
    p_kind: input.kind,
    p_id: input.id,
    p_user: input.userId,
    p_reason: input.reason,
  }), "L’accès offert n’a pas pu être enregistré.");
}
