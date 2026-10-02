"use client";

import Image from "next/image";
import { IconDownload } from "@/components/ui/Icon";
import LogViewer from "@/components/challenges/LogViewer";
import PcapViewer from "@/components/challenges/PcapViewer";
import type { LabAsset, LabAssetKind } from "@/types/api";

const KIND_LABEL: Record<LabAssetKind, string> = {
  log: "Journal", pcap: "Capture réseau", pkt: "Fichier Packet Tracer", guide: "Guide", image: "Image", topology: "Topologie", report_template: "Modèle de rapport",
};

/** Files the learner works from: captures and logs open in a viewer, everything else is a download. */
export default function LabAssets({ assets }: { assets: LabAsset[] }) {
  if (!assets.length) return null;
  const viewers = assets.filter((asset) => asset.kind === "pcap" || asset.kind === "log");
  const figures = assets.filter((asset) => asset.kind === "topology" || asset.kind === "image");
  const downloads = assets.filter((asset) => !viewers.includes(asset) && !figures.includes(asset));
  return (
    <section className="lab-panel lab-assets" aria-labelledby="lab-assets-title">
      <h2 id="lab-assets-title">Fichiers du lab</h2>
      {figures.map((asset) => (
        <figure key={asset.id} className="lab-figure">
          <Image src={asset.url} alt={asset.description || asset.title} width={760} height={450} unoptimized />
          <figcaption>{asset.title}</figcaption>
        </figure>
      ))}
      {viewers.map((asset) => asset.kind === "pcap"
        ? <PcapViewer key={asset.id} url={asset.url} title={asset.title} />
        : <LogViewer key={asset.id} url={asset.url} title={asset.title} />)}
      {downloads.length > 0 && (
        <ul className="lab-downloads">
          {downloads.map((asset) => (
            <li key={asset.id}>
              <a href={asset.url} download>
                <span className="lab-downloads__icon" aria-hidden="true"><IconDownload size={16} /></span>
                <span className="lab-downloads__text"><strong>{asset.title}</strong><small>{KIND_LABEL[asset.kind]}{asset.description ? ` · ${asset.description}` : ""}</small></span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}