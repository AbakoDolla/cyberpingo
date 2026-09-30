"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useAsync } from "@/hooks/useAsync";
import { adminUsers } from "@/services/admin.service";
import { AdminEmpty, AdminError, AdminLoading } from "./AdminState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function LearnersPanel({ currentUserId }: { currentUserId?: string; onChanged?: () => void }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "user" | "admin" | "superadmin">("all");
  const { data, loading, error, reload } = useAsync(() => adminUsers({ search: query, role, limit: 100 }), [query, role]);
  const users = useMemo(() => data?.users ?? [], [data]);
  if (loading && !data) return <AdminLoading />;
  if (error) return <AdminError message={error.message} onRetry={reload} />;
  return <section className="rounded-xl2 border border-white/5 bg-dark-navy"><div className="flex flex-wrap items-end gap-3 border-b border-white/5 p-5"><Input label="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, pseudo, e-mail" className="md:w-72" /><Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value as typeof role)} options={[{ value: "all", label: "Tous" }, { value: "user", label: "Apprenants" }, { value: "admin", label: "Admins" }, { value: "superadmin", label: "Superadmins" }]} className="md:w-52" /></div>{users.length === 0 ? <div className="p-5"><AdminEmpty>Aucun compte ne correspond à ta recherche.</AdminEmpty></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-white/45"><tr><th className="px-5 py-3">Compte</th><th className="px-3 py-3">Rôle</th><th className="px-3 py-3">XP</th><th className="px-3 py-3 hidden lg:table-cell">Progression</th><th className="px-5 py-3">Dernière activité</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]"><td className="px-5 py-3"><Link href={`/admin/utilisateurs/${user.id}`} className="font-medium text-white hover:text-cyber-blue">{user.display_name}{currentUserId === user.id ? " (toi)" : ""}</Link><p className="text-xs text-white/42">@{user.username} · {user.email}</p></td><td className="px-3 py-3">{ROLE_LABELS[user.role]}</td><td className="px-3 py-3 tabular-nums">{formatNumber(user.xp)}</td><td className="px-3 py-3 hidden lg:table-cell text-white/60">{user.lessons_completed} leçons · {user.quizzes_passed} quiz · {user.labs_solved} labs</td><td className="px-5 py-3 text-white/55">{user.last_activity_at ? formatDateTime(user.last_activity_at) : "Jamais"}</td></tr>)}</tbody></table></div>}</section>;
}