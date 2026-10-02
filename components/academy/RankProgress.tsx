import { IconCheck, IconCircle } from "@/components/ui/Icon";
import ProgressBar from "@/components/ui/ProgressBar";
import { rankProgress, requirementLabel } from "@/lib/academy-view";
import type { Academy } from "@/types/api";

/** Current rank and what is still missing for the next one, straight from the server-computed metrics. */
export default function RankProgress({ academy, compact = false }: { academy: Academy; compact?: boolean }) {
  const next = academy.next_rank;
  return (
    <div className={compact ? "rank-progress rank-progress--compact" : "rank-progress"}>
      <div className="rank-progress__current">
        <span className="rank-progress__position" aria-hidden="true">{academy.rank.position}</span>
        <div>
          <p className="rank-progress__label">Grade actuel</p>
          <h3>{academy.rank.name}</h3>
          {!compact && <p className="rank-progress__description">{academy.rank.description}</p>}
        </div>
      </div>
      {next ? (
        <div className="rank-progress__next">
          <p className="rank-progress__label">Prochain grade : {next.name}</p>
          <ProgressBar value={rankProgress(next.requirements)} tone="blue" height="sm" />
          <ul>
            {next.requirements.map((item) => {
              const done = item.current >= item.required;
              return (
                <li key={item.key} className={done ? "is-done" : undefined}>
                  {done ? <IconCheck size={15} /> : <IconCircle size={15} />}
                  <span>{requirementLabel(item.key, item.required)}</span>
                  <small>{Math.min(item.current, item.required)} / {item.required}</small>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="rank-progress__next rank-progress__top">Tu as atteint le plus haut grade disponible.</p>
      )}
    </div>
  );
}