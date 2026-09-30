"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { friendlyError, effectiveStreak } from "@/lib/learner-mapping";
import { computeLevel } from "@/lib/learning-progress";
import { cn } from "@/lib/utils";
import type { AdminLearnerRow } from "@/types/database";
import { IconFlame, IconShield } from "@/components/ui/Icon";

function formatDay(value: string | null) {
  if (!value) return "Jamais";
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function LearnersPanel({ currentUserId, onChanged }: { currentUserId: string; onChanged?: () => void }) {
  const [rows, setRows] = useState<AdminLearnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "learner" | "admin">("all");
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await getSupabaseBrowserClient().rpc("admin_learners", { p_limit: 500 });
    if (rpcError) setError(friendlyError(rpcError, "Impossible de charger les apprenants."));
    else setRows(((data ?? []) as AdminLearnerRow[]).map((row) => ({
      ...row,
      lessons_completed: Number(row.lessons_completed),
      quizzes_passed: Number(row.quizzes_passed),
      challenges_solved: Number(row.challenges_solved),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) =>
      (roleFilter === "all" || row.role === roleFilter) &&
      (!needle || [row.display_name, row.username, row.email].some((field) => field?.toLowerCase().includes(needle)))
    );
  }, [rows, query, roleFilter]);

  async function toggleRole(row: AdminLearnerRow) {
    const nextRole = row.role === "admin" ? "learner" : "admin";
    const question = nextRole === "admin"
      ? `Donner l’accès administrateur à ${row.display_name} ? Cette personne pourra publier du contenu, lire les messages et gérer les rôles.`
      : `Retirer l’accès administrateur de ${row.display_name} ?`;
    if (!window.confirm(question)) return;
    setPending(row.id);
    setError(null);
    setNotice(null);
    const { error: rpcError } = await getSupabaseBrowserClient().rpc("admin_set_role", { p_user: row.id, p_role: nextRole });
    setPending(null);
    if (rpcError) {
      setError(friendlyError(rpcError, "Le rôle n’a pas pu être modifié."));
      return;
    }
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, role: nextRole } : item));
    setNotice(nextRole === "admin" ? `${row.display_name} est maintenant administrateur.` : `${row.display_name} est de nouveau apprenant.`);
    onChanged?.();
  }

  return (
    <section className="bg-dark-navy border border-white/5 rounded-xl2 overflow-hidden" aria-labelledby="learners-title">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5 border-b border-white/5">
        <div>
          <h2 id="learners-title" className="font-display font-semibold text-base">Apprenants</h2>
          <p className="text-xs text-white/45 mt-0.5">{loading ? "Chargement…" : `${filtered.length} sur ${rows.length} comptes · classés par XP`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="learner-search">Rechercher un apprenant</label>
          <input
            id="learner-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, pseudo ou e-mail"
            className="w-56 rounded-xl border border-white/10 bg-cyber-black/60 px-3 py-2 text-sm placeholder:text-white/30 focus:border-cyber-blue/60 focus:outline-none"
          />
          <label className="sr-only" htmlFor="learner-role">Filtrer par rôle</label>
          <select
            id="learner-role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
            className="rounded-xl border border-white/10 bg-cyber-black/60 px-3 py-2 text-sm focus:border-cyber-blue/60 focus:outline-none"
          >
            <option value="all">Tous les rôles</option>
            <option value="learner">Apprenants</option>
            <option value="admin">Administrateurs</option>
          </select>
          <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/60 hover:text-white hover:border-white/25 disabled:opacity-50">
            Actualiser
          </button>
        </div>
      </div>

      {(error || notice) && (
        <p role={error ? "alert" : "status"} className={cn("mx-6 mt-4 rounded-xl border px-4 py-3 text-sm", error ? "border-cyber-red/30 bg-cyber-red/10 text-red-100" : "border-cyber-green/25 bg-cyber-green/10 text-green-100")}>
          {error ?? notice}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Liste des comptes, avec progression et rôle</caption>
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-white/45">
              <th scope="col" className="px-6 py-3 font-medium">Compte</th>
              <th scope="col" className="px-3 py-3 font-medium">Niveau</th>
              <th scope="col" className="px-3 py-3 font-medium hidden md:table-cell">Série</th>
              <th scope="col" className="px-3 py-3 font-medium hidden lg:table-cell">Leçons · Quiz · Challenges</th>
              <th scope="col" className="px-3 py-3 font-medium hidden md:table-cell">Dernière activité</th>
              <th scope="col" className="px-6 py-3 font-medium text-right">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index} className="border-b border-white/[0.03]"><td colSpan={6} className="px-6 py-3"><div className="h-8 rounded-lg bg-white/[0.04] animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-white/45">{rows.length ? "Aucun compte ne correspond à ta recherche." : "Aucun compte pour l’instant."}</td></tr>
            ) : filtered.map((row) => {
              const { level } = computeLevel(row.xp);
              const streak = effectiveStreak(row.streak, row.last_activity_date);
              const isSelf = row.id === currentUserId;
              return (
                <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.015]">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-neon-purple/15 border border-neon-purple/20 flex items-center justify-center text-[11px] font-display font-bold text-neon-purple" aria-hidden="true">
                        {row.display_name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.display_name}{isSelf && <span className="ml-1.5 text-[11px] text-white/40">(toi)</span>}</p>
                        <p className="text-[11px] text-white/40 truncate">{row.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="font-medium">Niv. {level}</span>
                    <span className="block text-[11px] text-white/40 tabular-nums">{row.xp.toLocaleString("fr-FR")} XP</span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className={cn("inline-flex items-center gap-1 tabular-nums", streak ? "text-cyber-yellow" : "text-white/35")}>
                      <IconFlame size={13} />{streak} j
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell tabular-nums text-white/70">
                    {row.lessons_completed} · {row.quizzes_passed} · {row.challenges_solved}
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-white/55 whitespace-nowrap">
                    {formatDay(row.last_activity_date)}
                    <span className="block text-[11px] text-white/35">Inscrit le {formatDay(row.created_at)}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void toggleRole(row)}
                      disabled={pending === row.id || (isSelf && row.role === "admin")}
                      title={isSelf && row.role === "admin" ? "Tu ne peux pas retirer ton propre accès." : undefined}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        row.role === "admin" ? "border-cyber-blue/30 bg-cyber-blue/10 text-cyber-blue hover:bg-cyber-blue/20" : "border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                      )}
                    >
                      {row.role === "admin" && <IconShield size={11} />}
                      {pending === row.id ? "…" : row.role === "admin" ? "Admin" : "Apprenant"}
                      <span className="sr-only">{row.role === "admin" ? " — retirer l’accès administrateur" : " — nommer administrateur"}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
