"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { IconAI, IconSparkles, IconCheck, IconTrophy, IconVolume, IconVolumeOff } from "@/components/ui/Icon";
import { gradeTPWithAgent } from "@/services/mentor";
import { getThinkingStepsForMode, type AgentDomain, type TPGradeResult } from "@/lib/ai-agent/engine";
import ThinkingStepsIndicator from "@/components/ai-agent/ThinkingStepsIndicator";
import PacedAgentResponse from "@/components/ai-agent/PacedAgentResponse";
import type { MentorMessage } from "@/types";

interface LabAIAuditorProps {
  labTitle: string;
  labCategory: string;
  defaultContent?: string;
  compact?: boolean;
}

export default function LabAIAuditor({
  labTitle,
  labCategory,
  defaultContent = "",
  compact = false,
}: LabAIAuditorProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(defaultContent);
  const [analyzing, setAnalyzing] = useState(false);
  const [tpResult, setTpResult] = useState<TPGradeResult | null>(null);
  const [rawResponse, setRawResponse] = useState<MentorMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const domainMap: Record<string, AgentDomain> = {
    reseau: "reseau",
    linux: "linux",
    web: "web",
    pentest: "pentest",
    crypto: "crypto",
    forensique: "soc",
    logs: "soc",
  };

  const domain = domainMap[labCategory] || "general";
  const thinkingSteps = getThinkingStepsForMode("tp_grader");

  async function handleAudit() {
    const textToAudit = input.trim() || defaultContent.trim();
    if (!textToAudit) {
      setError("Indique ce que tu as fait, testé ou formulé avant de lancer l'audit.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setTpResult(null);
    setRawResponse(null);

    try {
      const response = await gradeTPWithAgent(textToAudit, labTitle, domain);
      if (response.tpData) {
        setTpResult(response.tpData);
      }
      setRawResponse({
        id: response.id,
        role: "mentor",
        content: response.content,
        createdAt: response.createdAt,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "L'audit n'a pas pu aboutir.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handlePreset(text: string) {
    setInput((prev) => (prev ? `${prev}\n\n${text}` : text));
  }

  return (
    <section className="lab-panel lab-ai-auditor" aria-labelledby="ai-auditor-title">
      <div className="lab-ai-auditor__header">
        <div className="lab-ai-auditor__title-group">
          <div className="lab-ai-auditor__icon" aria-hidden="true">
            <IconAI size={20} />
          </div>
          <div>
            <h2 id="ai-auditor-title">
              Pré-Correction & Audit IA · Professeur Pingo
            </h2>
            <p>
              Fais relire ta démarche, tes commandes ou ton compte-rendu pour recevoir un barème académique et des conseils avant validation définitive.
            </p>
          </div>
        </div>
        <div className="lab-ai-auditor__badges">
          <Badge tone="purple">
            <IconSparkles size={12} />
            Super-Auditeur IA
          </Badge>
          <Button
            size="sm"
            variant={open ? "secondary" : "primary"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Masquer l’auditeur" : "Ouvrir l’atelier d’audit"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="lab-ai-auditor__body">
          <div className="lab-ai-auditor__presets" aria-label="Suggestions d'audit">
            <span className="lab-ai-auditor__presets-label">Ajouter une question d’audit :</span>
            <button
              type="button"
              className="lab-ai-auditor__preset-pill"
              onClick={() => handlePreset("Contrôle mes commandes et ma logique de résolution :")}
            >
              🛠️ Commandes & Méthode
            </button>
            <button
              type="button"
              className="lab-ai-auditor__preset-pill"
              onClick={() => handlePreset("Vérifie les mesures de remédiation et la sécurité défensive :")}
            >
              🛡️ Remédiations de sécurité
            </button>
            <button
              type="button"
              className="lab-ai-auditor__preset-pill"
              onClick={() => handlePreset("Donne-moi un indice méthodologique sans spoiler le flag :")}
            >
              💡 Indice sans spoiler
            </button>
          </div>

          <div className="lab-ai-auditor__input-wrap">
            <label htmlFor="ai-audit-input" className="sr-only">
              Texte, commandes ou rapport à auditer
            </label>
            <textarea
              id="ai-audit-input"
              className="ui-input lab-ai-auditor__textarea"
              rows={5}
              placeholder="Exemple : J'ai scanné le port 80 avec nmap, intercepté la requête avec Burp, identifié le paramètre vulnérable et testé une charge paramétrée..."
              value={input}
              disabled={analyzing}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
            />
          </div>

          <div className="lab-ai-auditor__footer">
            <Button
              variant="primary"
              loading={analyzing}
              disabled={analyzing || (!input.trim() && !defaultContent.trim())}
              onClick={() => void handleAudit()}
            >
              {analyzing ? "Audit en cours…" : "Lancer l’audit avec le Professeur Pingo"}
            </Button>
            <small className="lab-ai-auditor__hint">
              Analyse réfléchie selon les standards ANSSI & OWASP. Respecte un rythme pédagogique.
            </small>
          </div>

          {error && (
            <p className="ui-field__error mt-3" role="alert">
              {error}
            </p>
          )}

          {analyzing && (
            <div className="mt-4">
              <ThinkingStepsIndicator steps={thinkingSteps} active={analyzing} />
            </div>
          )}

          {tpResult && (
            <div className="lab-ai-auditor__result-card mt-4" role="region" aria-label="Résultat de l’audit">
              <div className="lab-ai-auditor__score-banner">
                <div className="lab-ai-auditor__score-ring">
                  <span className="lab-ai-auditor__score-num">{tpResult.score}</span>
                  <span className="lab-ai-auditor__score-denom">/20</span>
                </div>
                <div className="lab-ai-auditor__score-details">
                  <strong>{tpResult.gradeLabel}</strong>
                  <p>{tpResult.summary}</p>
                </div>
              </div>

              <div className="lab-ai-auditor__columns">
                <div className="lab-ai-auditor__col">
                  <h3>
                    <IconCheck size={16} /> Points forts acquis
                  </h3>
                  <ul>
                    {tpResult.strengths.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                </div>
                <div className="lab-ai-auditor__col">
                  <h3>
                    <IconSparkles size={16} /> Axes d’amélioration
                  </h3>
                  <ul>
                    {tpResult.weaknesses.map((wk, idx) => (
                      <li key={idx}>{wk}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lab-ai-auditor__advice">
                <blockquote>
                  <strong>Conseil du Professeur Pingo :</strong>
                  <p>{tpResult.pingoAdvice}</p>
                </blockquote>
              </div>
            </div>
          )}

          {rawResponse && (
            <div className="mt-4">
              <PacedAgentResponse message={rawResponse} isPaced={true} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
