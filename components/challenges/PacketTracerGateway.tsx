import { IconAlert } from "@/components/ui/Icon";
import type { LabAsset } from "@/types/api";

/** Packet Tracer runs on the learner's computer. CyberPingo only provides the instructions, files, checks and report. */
export default function PacketTracerGateway({ assets, requiresComputer }: { assets: LabAsset[]; requiresComputer: boolean }) {
  const hasPkt = assets.some((asset) => asset.kind === "pkt");
  const hasReportTemplate = assets.some((asset) => asset.kind === "report_template");
  return (
    <section className="lab-panel lab-gateway" aria-labelledby="lab-gateway-title">
      <h2 id="lab-gateway-title">Comment faire ce lab avec Packet Tracer</h2>
      <p className="lab-gateway__notice"><IconAlert size={16} /> Packet Tracer ne s’exécute pas dans CyberPingo. Tu le lances sur ton ordinateur, CyberPingo te donne le sujet, les contrôles et le suivi.{requiresComputer ? " Un ordinateur est nécessaire pour ce lab." : ""}</p>
      <ol className="lab-gateway__steps">
        <li>Télécharge la topologie et le guide pas à pas dans « Fichiers du lab ».</li>
        <li>{hasPkt ? "Ouvre le fichier .pkt dans Cisco Packet Tracer." : "Le fichier .pkt n’est pas encore publié : construis la topologie dans Cisco Packet Tracer en suivant le guide."}</li>
        <li>Configure les adresses, la passerelle et teste la connectivité avec des pings.</li>
        <li>Réponds aux questions de contrôle pour vérifier ton plan d’adressage.</li>
        <li>{hasReportTemplate ? "Remplis le modèle de rapport, puis envoie ton rapport : un formateur le relit." : "Envoie ton rapport : un formateur le relit."}</li>
      </ol>
    </section>
  );
}