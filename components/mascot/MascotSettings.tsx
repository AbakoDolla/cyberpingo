"use client";

import { useMascotPrefs } from "@/components/mascot/useMascotPrefs";

/** The learner's control over Pingo: nothing here is ever required to follow a lesson. */
export default function MascotSettings({ idPrefix = "mascot" }: { idPrefix?: string }) {
  const [prefs, update] = useMascotPrefs();
  return (
    <div className="mascot-settings">
      <label className="mascot-settings__row" htmlFor={`${idPrefix}-auto`}>
        <input id={`${idPrefix}-auto`} type="checkbox" checked={prefs.auto} onChange={(event) => update({ auto: event.target.checked })} />
        <span><strong>Interventions de Pingo</strong><small>Il réagit à tes réussites, tes badges et tes passages de niveau.</small></span>
      </label>
      <label className="mascot-settings__row" htmlFor={`${idPrefix}-voice`}>
        <input id={`${idPrefix}-voice`} type="checkbox" checked={prefs.voice} disabled={!prefs.auto} onChange={(event) => update({ voice: event.target.checked })} />
        <span><strong>Voix</strong><small>Joue les enregistrements quand il y en a. Sans audio, le texte s’affiche seul.</small></span>
      </label>
      <label className="mascot-settings__row" htmlFor={`${idPrefix}-subtitles`}>
        <input id={`${idPrefix}-subtitles`} type="checkbox" checked={prefs.subtitles} disabled={!prefs.auto} onChange={(event) => update({ subtitles: event.target.checked })} />
        <span><strong>Sous-titres</strong><small>Affiche le texte pendant que la voix parle.</small></span>
      </label>
      <label className="mascot-settings__volume" htmlFor={`${idPrefix}-volume`}>
        <span>Volume</span>
        <input id={`${idPrefix}-volume`} type="range" min={0} max={1} step={0.05} value={prefs.volume} disabled={!prefs.auto || !prefs.voice} onChange={(event) => update({ volume: Number(event.target.value) })} />
        <output>{Math.round(prefs.volume * 100)} %</output>
      </label>
    </div>
  );
}