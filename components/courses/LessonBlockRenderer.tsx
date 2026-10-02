"use client";

import { useState } from "react";
import Image from "next/image";
import { pendingVideoTitle, videoEmbed } from "@/lib/lesson-content";
import type { LessonBlock } from "@/types/api";

function TextBlock({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return <>{paragraphs.map((paragraph, index) => <p key={index} className="lesson-block-text">{paragraph}</p>)}</>;
}

function CodeBlock({ content, language }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setCopyError(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
      setCopied(false);
    }
  };
  return (
    <figure className="lesson-code-block">
      <figcaption>
        <span>{language ? language.toUpperCase() : "CODE"}</span>
        <button type="button" onClick={copy} aria-live="polite">{copied ? "Copié" : "Copier"}</button>
      </figcaption>
      <pre><code>{content}</code></pre>
      {copyError && <p className="lesson-code-block__status" role="alert">Copie indisponible dans ce navigateur.</p>}
    </figure>
  );
}

function PendingVideo({ title }: { title: string }) {
  return (
    <figure className="lesson-media lesson-video-slot">
      <div className="lesson-video-slot__frame" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9.5 5 2.5-5 2.5z" /></svg>
      </div>
      <figcaption>
        <strong>Vidéo en préparation</strong>
        <span>{title}</span>
        <small>Le contenu écrit de cette leçon couvre déjà l’essentiel.</small>
      </figcaption>
    </figure>
  );
}

function VideoBlock({ url, title }: { url: string; title?: string }) {
  const embed = videoEmbed(url);
  if (embed.kind === "iframe") {
    return <div className="lesson-media lesson-media--video"><iframe src={embed.src} title={title || "Vidéo de la leçon"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" /></div>;
  }
  return <div className="lesson-media lesson-media--video"><video src={embed.src} controls preload="metadata">Ton navigateur ne peut pas lire cette vidéo.</video></div>;
}

export default function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock content={block.content} />;
    case "heading":
      return <h2 className="lesson-block-heading">{block.content}</h2>;
    case "schema":
      return <pre className="lesson-schema"><code>{block.content}</code></pre>;
    case "example":
      return <aside className="lesson-callout lesson-callout--example"><strong>Exemple</strong><p>{block.content}</p></aside>;
    case "callout": {
      const pending = pendingVideoTitle(block.content);
      if (pending) return <PendingVideo title={pending} />;
      return <aside className="lesson-callout"><strong>À retenir</strong><p>{block.content}</p></aside>;
    }
    case "code":
      return <CodeBlock content={block.content} language={block.language} />;
    case "video":
      return <VideoBlock url={block.url} title={block.content} />;
    case "image":
      return <figure className="lesson-media"><Image src={block.url} alt={block.content || "Illustration de la leçon"} width={960} height={540} sizes="(max-width: 900px) 100vw, 720px" unoptimized />{block.content && <figcaption>{block.content}</figcaption>}</figure>;
    case "resource":
      return <p className="lesson-resource"><a href={block.url} target="_blank" rel="noopener noreferrer">{block.content || block.url} ↗</a></p>;
    default:
      return null;
  }
}