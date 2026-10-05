"use client";

import Link from "next/link";
import EmptyArt from "@/components/art/EmptyArt";
import SceneBanner from "@/components/art/SceneBanner";
import RankProgress from "@/components/academy/RankProgress";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { IconAlert, IconCheck, IconCircle, IconLock } from "@/components/ui/Icon";
import SlugIcon from "@/components/ui/SlugIcon";
import { useLearner } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { useTranslation } from "@/lib/i18n";
import {
  SKILL_STATE_LABELS,
  SKILL_STATE_STEP_COUNT,
  groupSkillsByDomain,
  linkHref,
  linkKindLabel,
  localizeLinkKind,
  localizeSkillState,
  skillStateStep,
  skillStateTone,
} from "@/lib/academy-view";
import { getMyAcademy } from "@/services/academy.service";
import type { Skill } from "@/types/api";

function SkillCard({ skill, lang }: { skill: Skill; lang: "fr" | "en" }) {
  const step = skillStateStep(skill.state);
  return (
    <article className="skill-card" data-state={skill.state}>
      <header>
        <h4>{skill.name}</h4>
        <Badge tone={skillStateTone(skill.state)}>{localizeSkillState(skill.state, lang)}</Badge>
      </header>
      <p>{skill.description}</p>
      <div className="skill-card__meter" role="img" aria-label={`Étape ${step} sur ${SKILL_STATE_STEP_COUNT} : ${localizeSkillState(skill.state, lang)}`}>
        {Array.from({ length: SKILL_STATE_STEP_COUNT }, (_, index) => <span key={index} className={index < step ? "is-on" : undefined} />)}
      </div>
      {skill.links.length > 0 && (
        <ul className="skill-card__links">
          {skill.links.map((link) => {
            const href = linkHref(link);
            const content = (
              <>
                {link.done ? <IconCheck size={15} /> : <IconCircle size={15} />}
                <span>{link.title}</span>
                <small>{linkKindLabel(link.kind, lang)}</small>
              </>
            );
            return (
              <li key={`${link.kind}-${link.id}`} className={link.done ? "is-done" : undefined}>
                {href ? <Link href={href}>{content}</Link> : <span className="skill-card__static">{content}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

function CompetencesContent() {
  const { lang, t } = useTranslation();
  const isEn = lang === "en";
  const { profile } = useLearner();
  const { data, error, loading, reload } = useAsync(getMyAcademy, [profile.id]);

  if (loading) {
    return (
      <div className="competences-page" role="status" aria-label={isEn ? "Loading your skills" : "Chargement de tes compétences"}>
        <div className="ui-skeleton ui-skeleton--title" />
        <div className="ui-skeleton ui-skeleton--card" />
        <div className="ui-skeleton ui-skeleton--card" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="competences-page">
        <section className="prog-state prog-state-error" role="alert">
          <IconAlert size={22} />
          <h1>{isEn ? "Unable to load your skills." : "Impossible de charger tes compétences."}</h1>
          <p>{error?.message ?? (isEn ? "No data received." : "Aucune donnée reçue.")}</p>
          <Button type="button" variant="secondary" onClick={() => void reload()}>{t("action.retry")}</Button>
        </section>
      </div>
    );
  }

  const groups = groupSkillsByDomain(data.domains, data.skills);
  const validated = data.skills.filter((skill) => skill.state === "validated").length;

  return (
    <div className="competences-page">
      <header>
        <SceneBanner variant="progression" className="prog-hero">
          <div>
            <h1>{t("skills.title")}</h1>
            <p>
              {data.skills.length === 0
                ? (isEn ? "Skills will appear here as soon as a track is published." : "Les compétences apparaissent ici dès qu’un parcours est publié.")
                : (isEn ? `${validated} of ${data.skills.length} skills validated through hands-on evaluation.` : `${validated} sur ${data.skills.length} compétences validées par une évaluation pratique.`)}
            </p>
          </div>
          <Link href="/courses" className="study-button study-button--ghost">{isEn ? "Choose a track" : "Choisir un parcours"}</Link>
        </SceneBanner>
      </header>

      <section className="competences-rank" aria-labelledby="competences-rank-title">
        <h2 id="competences-rank-title">{t("skills.rank")}</h2>
        <RankProgress academy={data} />
      </section>

      {groups.length === 0 ? (
        <section className="prog-empty-card">
          <EmptyArt kind="courses" />
          <h2>{t("skills.empty")}</h2>
          <p>{isEn ? "As soon as tracks and skills are published, you can monitor your mastery here." : "Dès que l’équipe publie un parcours avec ses compétences, tu pourras suivre ta maîtrise ici."}</p>
          <Link href="/courses" className="study-button">{t("skills.see_courses")}</Link>
        </section>
      ) : (
        groups.map(({ domain, skills }) => (
          <section key={domain.id} className="competences-domain" aria-labelledby={`domain-${domain.slug}`}>
            <div className="competences-domain__head">
              <span aria-hidden="true"><SlugIcon name={domain.icon} size={20} /></span>
              <div>
                <h2 id={`domain-${domain.slug}`}>{domain.name}</h2>
                <p>{domain.description}</p>
              </div>
            </div>
            <div className="competences-grid">
              {skills.map((skill) => <SkillCard key={skill.id} skill={skill} lang={lang} />)}
            </div>
          </section>
        ))
      )}

      <section className="competences-ladder" aria-labelledby="competences-ladder-title">
        <h2 id="competences-ladder-title">{t("skills.ladder")}</h2>
        <ol>
          {data.ranks.map((rank) => {
            const current = rank.slug === data.rank.slug;
            return (
              <li key={rank.slug} className={rank.achieved ? "is-done" : current ? "is-current" : undefined}>
                <span className="competences-ladder__dot">{rank.achieved ? <IconCheck size={14} /> : rank.position}</span>
                <div>
                  <strong>{rank.name}</strong>
                  <small>{rank.description}</small>
                </div>
                {!rank.achieved && !current && <IconLock size={14} />}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

export default function CompetencesPage() {
  return <AppShell><CompetencesContent /></AppShell>;
}