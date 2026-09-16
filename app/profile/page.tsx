"use client";

import AppShell from "@/components/layout/AppShell";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SkillBar from "@/components/profile/SkillBar";
import BadgesGrid from "@/components/dashboard/BadgesGrid";
import { courses } from "@/data/courses";
import { formatXP } from "@/lib/utils";
import { useUser, useUserActions } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { IconLogout, IconFlame, IconBolt } from "@/components/ui/Icon";

export default function ProfilePage() {
  const { user, getCourseProgress } = useUser();
  const { logout } = useUserActions();
  const router = useRouter();
  const completedCourses = courses.filter(
    (c) => getCourseProgress(c.id) === 100
  ).length;
  const completedChallenges = user.completedChallenges.length;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-dark-navy border border-white/5 rounded-xl2 p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <Avatar name={user.name} size="lg" />
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold">{user.name}</h1>
                <p className="text-white/50">@{user.username}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <IconLogout size={14} />
                Se déconnecter
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-6 justify-center sm:justify-start text-sm">
              <div>
                <p className="text-white/50">Niveau</p>
                <p className="font-display font-semibold">{user.level}</p>
              </div>
              <div>
                <p className="text-white/50">XP</p>
                <p className="font-display font-semibold">{formatXP(user.xp)}</p>
              </div>
              <div>
                <p className="text-white/50">Série</p>
                <p className="font-display font-semibold">
                  <IconFlame size={16} strokeWidth={1.8} className="inline mr-1.5 mb-0.5 text-cyber-yellow" />
                  {user.streak} jours
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="text-center">
            <p className="text-3xl font-display font-bold text-cyber-blue">{completedCourses}</p>
            <p className="text-sm text-white/50 mt-1">Cours terminés</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-display font-bold text-cyber-green">{completedChallenges}</p>
            <p className="text-sm text-white/50 mt-1">Challenges réussis</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-display font-bold text-neon-purple">
              {user.badges.filter((b) => b.earned).length}
            </p>
            <p className="text-sm text-white/50 mt-1">Badges obtenus</p>
          </Card>
        </div>

        <Card>
          <h2 className="font-display font-semibold text-lg mb-5">Mes compétences</h2>
          <div className="space-y-4">
            {user.skills.map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </div>
        </Card>

        <BadgesGrid badges={user.badges} />
      </div>
    </AppShell>
  );
}
