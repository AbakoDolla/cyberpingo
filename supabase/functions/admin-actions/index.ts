// admin-actions · operations on Supabase Auth accounts that need the service role.
//
// Body: { action: "ban" | "unban" | "delete_user" | "send_password_reset" | "auth_status",
//         user_id: uuid, reason?: string (≤ 300), ban_hours?: number (1 – 876000) }
// Only admins may call it; accounts of staff members can only be touched by a superadmin,
// and superadmin accounts must be demoted before being banned or deleted.
import { HttpError, readJson, requireCaller, requireUuid, serve, serviceClient, userClient } from "../_shared/http.ts";

type Action = "ban" | "unban" | "delete_user" | "send_password_reset" | "auth_status";
const ACTIONS: Action[] = ["ban", "unban", "delete_user", "send_password_reset", "auth_status"];
const PERMANENT_BAN_HOURS = 876_000;

function siteUrl(request: Request): string {
  const configured = Deno.env.get("SITE_URL");
  if (configured) return configured.replace(/\/+$/, "");
  const origin = request.headers.get("Origin");
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  throw new HttpError(500, "SITE_URL n’est pas configurée pour cette fonction.");
}

async function removeFolder(admin: ReturnType<typeof serviceClient>, bucket: string, folder: string) {
  const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  const paths = (data ?? []).map((file) => `${folder}/${file.name}`);
  if (paths.length > 0) await admin.storage.from(bucket).remove(paths);
}

serve(async (request) => {
  const caller = userClient(request);
  const actor = await requireCaller(caller);

  const { data: isAdmin, error: roleError } = await caller.rpc("is_admin");
  if (roleError) throw roleError;
  if (!isAdmin) throw new HttpError(403, "Accès réservé aux administrateurs.");

  const body = await readJson(request);
  const action = body.action as Action;
  if (!ACTIONS.includes(action)) throw new HttpError(400, "Action inconnue.");
  const targetId = requireUuid(body.user_id, "utilisateur");
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";

  const admin = serviceClient();
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetId);
  if (targetError || !target.user) throw new HttpError(404, "Utilisateur introuvable.");

  if (action === "auth_status") {
    const user = target.user as typeof target.user & { banned_until?: string | null };
    return {
      banned_until: user.banned_until ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
    };
  }

  if (targetId === actor.id && action !== "send_password_reset") {
    throw new HttpError(400, "Tu ne peux pas effectuer cette action sur ton propre compte.");
  }

  const { data: profile } = await admin.from("profiles").select("role, email").eq("id", targetId).maybeSingle();
  const targetRole = (profile?.role as string | undefined) ?? "user";
  if (targetRole !== "user") {
    const { data: isSuperadmin } = await caller.rpc("is_superadmin");
    if (!isSuperadmin) throw new HttpError(403, "Seul un super-administrateur peut agir sur un compte de l’équipe.");
    if (targetRole === "superadmin" && (action === "ban" || action === "delete_user")) {
      throw new HttpError(409, "Retire d’abord le rôle super-administrateur de ce compte.");
    }
  }

  const details: Record<string, unknown> = reason ? { reason } : {};

  switch (action) {
    case "ban": {
      const requested = Number(body.ban_hours ?? PERMANENT_BAN_HOURS);
      const hours = Number.isFinite(requested) ? Math.min(Math.max(Math.round(requested), 1), PERMANENT_BAN_HOURS) : PERMANENT_BAN_HOURS;
      const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: `${hours}h` });
      if (error) throw error;
      details.ban_hours = hours;
      break;
    }
    case "unban": {
      const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: "none" });
      if (error) throw error;
      break;
    }
    case "send_password_reset": {
      const email = target.user.email;
      if (!email) throw new HttpError(409, "Ce compte n’a pas d’adresse e-mail.");
      const redirectTo = `${siteUrl(request)}/auth/callback?next=${encodeURIComponent("/reinitialiser-mot-de-passe")}`;
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw new HttpError(429, "L’e-mail n’a pas pu être envoyé. Réessaie dans quelques minutes.");
      break;
    }
    case "delete_user": {
      details.email = profile?.email ?? target.user.email ?? null;
      await removeFolder(admin, "avatars", targetId);
      await removeFolder(admin, "certificates", targetId);
      // Deleting the auth user cascades to the profile and every learner row.
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) throw error;
      break;
    }
  }

  const { error: logError } = await admin.from("admin_logs").insert({
    actor_id: actor.id,
    action: `auth_${action}`,
    target_type: "user",
    target_id: targetId,
    details,
  });
  if (logError) console.error("admin_logs insert failed", logError);

  return { ok: true };
});
