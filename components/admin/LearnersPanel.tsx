"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";
import { formatDateTime, formatNumber, formatRelative, levelLabel, plural } from "@/lib/format";
import { useAsync } from "@/hooks/useAsync";
import { adminUsers } from "@/services/admin.service";
import { AdminEmpty, AdminError, AdminLoading } from "./AdminState";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const PAGE_SIZE = 50;
const LEVEL_OPTIONS = [
  { value: "all", label: "Tous les niveaux" },
  { value: "1", label: levelLabel("debutant") },
  { value: "2", label: "Niveau 2" },
  { value: "3", label: "Niveau 3+" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "Toute activité" },
  { value: "active_24h", label: "Actifs 24 h" },
  { value: "inactive", label: "Sans activité récente" },
  { value: "never", label: "Jamais actifs" },
];
const SORT_OPTIONS = [
  { value: "activity", label: "Dernière activité" },
  { value: "xp", label: "XP décroissant" },
  { value: "level", label: "Niveau décroissant" },
  { value: "created", label: "Création récente" },
  { value: "name", label: "Nom A-Z" },
];

function activityStatus(lastActivity: string | null) {
  if (!lastActivity) return "never";
  return Date.now() - new Date(lastActivity).getTime() <= 24 * 60 * 60 * 1000 ? "active_24h" : "inactive";
}

export default function LearnersPanel({ currentUserId }: { currentUserId?: string; onChanged?: () => void }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | "user" | "admin" | "superadmin">("all");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("activity");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, loading, error, reload } = useAsync(() => adminUsers({ search: query, role, limit }), [query, role, limit]);
  useEffect(() => { setLimit(PAGE_SIZE); }, [query, role]);
  const users = useMemo(() => {
    const rows = data?.users ?? [];
    return rows
      .filter((user) => {
        if (status !== "all" && activityStatus(user.last_activity_at) !== status) return false;
        if (level === "all") return true;
        if (level === "3") return user.level >= 3;
        return user.level === Number(level);
      })
      .sort((a, b) => {
        if (sort === "xp") return b.xp - a.xp || a.display_name.localeCompare(b.display_name, "fr");
        if (sort === "level") return b.level - a.level || b.xp - a.xp;
        if (sort === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sort === "name") return a.display_name.localeCompare(b.display_name, "fr");
        return new Date(b.last_activity_at ?? 0).getTime() - new Date(a.last_activity_at ?? 0).getTime();
      });
  }, [data, level, sort, status]);
  if (loading && !data) return <AdminLoading />;
  if (error) return <AdminError message={error.message} onRetry={reload} />;
  const total = data?.total ?? users.length;
  return (
    <section className="adm-panel">
      <div className="adm-toolbar">
        <div className="adm-toolbar__grow">
          <Input label="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, pseudo, e-mail" type="search" autoComplete="off" />
        </div>
        <Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value as typeof role)} options={[{ value: "all", label: "Tous les rôles" }, { value: "user", label: "Apprenants" }, { value: "admin", label: "Admins" }, { value: "superadmin", label: "Superadmins" }]} />
        <Select label="Niveau" value={level} onChange={(e) => setLevel(e.target.value)} options={LEVEL_OPTIONS} />
        <Select label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_OPTIONS} />
        <Select label="Tri" value={sort} onChange={(e) => setSort(e.target.value)} options={SORT_OPTIONS} />
      </div>
      <p className="adm-summary" aria-live="polite">{formatNumber(users.length)} compte{users.length > 1 ? "s" : ""} affiché{users.length > 1 ? "s" : ""} sur {formatNumber(total)}</p>
      {users.length === 0 ? (
        <AdminEmpty>Aucun compte ne correspond à ces filtres.</AdminEmpty>
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="sr-only">Comptes CyberPingo filtrés et triés</caption>
              <thead>
                <tr>
                  <th scope="col">Compte</th>
                  <th scope="col">Rôle</th>
                  <th scope="col">Niveau</th>
                  <th scope="col">XP</th>
                  <th scope="col">Progression</th>
                  <th scope="col">Activité</th>
                  <th scope="col" className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const state = activityStatus(user.last_activity_at);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={user.display_name} size="sm" ringTone="none" />
                          <div className="min-w-0">
                            <Link href={`/admin/utilisateurs/${user.id}`} className="font-semibold text-white hover:text-cyan-100">{user.display_name}{currentUserId === user.id ? " (toi)" : ""}</Link>
                            <p className="adm-muted truncate text-xs">@{user.username} · {user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><Badge tone={user.role === "user" ? "neutral" : user.role === "admin" ? "blue" : "purple"}>{ROLE_LABELS[user.role]}</Badge></td>
                      <td className="tabular-nums">{formatNumber(user.level)}</td>
                      <td className="tabular-nums">{formatNumber(user.xp)}</td>
                      <td className="adm-muted">{formatNumber(user.lessons_completed)} {plural(user.lessons_completed, "leçon")} · {formatNumber(user.quizzes_passed)} quiz · {formatNumber(user.labs_solved)} {plural(user.labs_solved, "lab")}</td>
                      <td>
                        <Badge tone={state === "active_24h" ? "green" : state === "never" ? "neutral" : "amber"}>{state === "active_24h" ? "Actif 24 h" : state === "never" ? "Jamais" : "À relancer"}</Badge>
                        <p className="adm-muted mt-1 text-xs" title={user.last_activity_at ? formatDateTime(user.last_activity_at) : undefined}>{user.last_activity_at ? formatRelative(user.last_activity_at) : `Créé le ${formatDateTime(user.created_at)}`}</p>
                      </td>
                      <td className="text-right"><Link href={`/admin/utilisateurs/${user.id}`} className="adm-action-link">Ouvrir</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data && data.users.length < data.total && (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="ghost" loading={loading} onClick={() => setLimit((value) => value + PAGE_SIZE)}>Charger plus</Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}