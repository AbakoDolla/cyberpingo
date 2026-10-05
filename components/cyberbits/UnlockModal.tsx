"use client";

import { useState } from "react";
import Link from "next/link";
import CoinIcon from "./CoinIcon";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { IconAlert, IconCheck, IconCourses, IconLock, IconShield } from "@/components/ui/Icon";
import { useUser, useUserActions } from "@/context/UserContext";
import { formatNumber, levelLabel } from "@/lib/format";
import { unlockItem } from "@/services/cyberbits.service";
import { errorMessage } from "@/lib/errors";
import type { CbItemKind, CbPrerequisite, CbUnlockResult } from "@/types/cyberbits";

export interface UnlockTarget {
  kind: CbItemKind;
  id: string;
  slug?: string;
  title: string;
  price: number;
  level?: string;
  category?: string;
  prerequisite?: CbPrerequisite | null;
}

interface UnlockModalProps {
  open: boolean;
  onClose: () => void;
  target: UnlockTarget | null;
  onSuccess?: (result: CbUnlockResult) => void;
}

export default function UnlockModal({ open, onClose, target, onSuccess }: UnlockModalProps) {
  const { cbBalance, isAuthenticated } = useUser();
  const { setCbBalance } = useUserActions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!target) return null;

  const isCourse = target.kind === "course";
  const price = target.price;
  const missing = Math.max(0, price - cbBalance);
  const hasPrereqBlock = Boolean(target.prerequisite && !target.prerequisite.completed);
  const canUnlock = !hasPrereqBlock && missing === 0 && !success;

  async function handleUnlock() {
    if (!target || !canUnlock || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await unlockItem(target.kind, target.id);
      setCbBalance(result.balance);
      setSuccess(true);
      if (onSuccess) onSuccess(result);
    } catch (cause) {
      setError(errorMessage(cause, "Le déblocage n’a pas pu aboutir. Tes CyberBits sont intacts."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={success ? "Déblocage réussi !" : `Débloquer ce ${isCourse ? "parcours" : "laboratoire"}`}>
      <div className="cb-unlock-modal">
        {/* Header Preview of Item */}
        <div className="cb-unlock-modal__item">
          <span className="cb-unlock-modal__icon" aria-hidden="true">
            {isCourse ? <IconCourses size={24} /> : <IconShield size={24} />}
          </span>
          <div className="cb-unlock-modal__details">
            <div className="cb-unlock-modal__badges">
              {target.level && <Badge tone="blue">{levelLabel(target.level)}</Badge>}
              {target.category && <Badge tone="neutral">{target.category}</Badge>}
            </div>
            <h3>{target.title}</h3>
          </div>
        </div>

        {/* Success View */}
        {success ? (
          <div className="cb-unlock-modal__success" role="status">
            <span className="cb-unlock-modal__success-icon">
              <IconCheck size={28} />
            </span>
            <p>
              L’accès à <strong>{target.title}</strong> est désormais débloqué définitivement.
            </p>
            <div className="cb-unlock-modal__actions">
              {target.slug ? (
                <Link
                  href={isCourse ? `/courses/${target.slug}` : `/challenges/${target.slug}`}
                  className="study-button"
                  onClick={handleClose}
                >
                  Ouvrir maintenant
                </Link>
              ) : (
                <Button variant="primary" onClick={handleClose}>
                  Continuer
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Prerequisite blocker */}
            {hasPrereqBlock && target.prerequisite && (
              <div className="cb-unlock-modal__alert is-warning" role="alert">
                <IconAlert size={20} />
                <div>
                  <strong>Prérequis nécessaire</strong>
                  <p>
                    Termine d’abord le parcours « {target.prerequisite.title} » avant de pouvoir débloquer cette étape.
                  </p>
                  <Link href={`/courses/${target.prerequisite.slug}`} className="study-link text-xs mt-1" onClick={handleClose}>
                    Voir le prérequis →
                  </Link>
                </div>
              </div>
            )}

            {/* Price & Balance calculation */}
            <div className="cb-unlock-modal__receipt">
              <div className="cb-unlock-modal__row">
                <span>Coût en CyberBits</span>
                <strong className="cb-price-text">
                  <CoinIcon size={16} /> {formatNumber(price)} CB
                </strong>
              </div>
              <div className="cb-unlock-modal__row">
                <span>Ton solde actuel</span>
                <span>
                  {isAuthenticated ? `${formatNumber(cbBalance)} CB` : "Connexion requise"}
                </span>
              </div>
              {isAuthenticated && missing === 0 && (
                <div className="cb-unlock-modal__row is-total">
                  <span>Solde après déblocage</span>
                  <strong className="text-cyber-green">{formatNumber(cbBalance - price)} CB</strong>
                </div>
              )}
            </div>

            {/* Missing funds explanation */}
            {isAuthenticated && missing > 0 && (
              <div className="cb-unlock-modal__alert is-info">
                <CoinIcon size={20} />
                <div>
                  <strong>Il te manque {formatNumber(missing)} CB</strong>
                  <p>
                    Gagne des CyberBits en terminant des leçons (+10 CB), en validant des quiz (+5 CB) ou en réussissant des défis hebdomadaires (+40 CB).
                  </p>
                  <Link href="/courses" className="study-link text-xs mt-1" onClick={handleClose}>
                    Continuer à apprendre pour gagner des CB →
                  </Link>
                </div>
              </div>
            )}

            {!isAuthenticated && (
              <div className="cb-unlock-modal__alert is-info">
                <IconLock size={20} />
                <div>
                  <p>Connecte-toi à ton compte CyberPingo pour débloquer ce contenu et conserver tes accès.</p>
                </div>
              </div>
            )}

            {error && (
              <p className="settings-status is-error" role="alert">
                {error}
              </p>
            )}

            <div className="cb-unlock-modal__actions">
              {!isAuthenticated ? (
                <Link href="/login" className="study-button" onClick={handleClose}>
                  Se connecter
                </Link>
              ) : canUnlock ? (
                <Button variant="success" loading={submitting} onClick={() => void handleUnlock()}>
                  Confirmer le déblocage (-{formatNumber(price)} CB)
                </Button>
              ) : (
                <Button variant="secondary" onClick={handleClose}>
                  Fermer
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
