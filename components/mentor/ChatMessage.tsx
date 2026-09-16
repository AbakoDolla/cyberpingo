import { MentorMessage } from "@/types";
import { cn } from "@/lib/utils";
import { IconAI } from "@/components/ui/Icon";

/**
 * Transforme le Markdown basique de Gemini en HTML sécurisé.
 * On parse manuellement pour éviter une dépendance externe (react-markdown).
 * Supporte : **gras**, `code inline`, ```blocs de code```, listes, titres.
 */
function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blocs de code ```
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        const langLabel = codeLang
          ? `<span class="text-white/30 text-xs font-mono mb-1 block">${escapeHtml(codeLang)}</span>`
          : "";
        result.push(
          `<div class="bg-cyber-black/80 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto">${langLabel}<code class="font-mono text-xs text-cyber-green whitespace-pre">${escapeHtml(codeLines.join("\n"))}</code></div>`
        );
        codeLines = [];
        codeLang = "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Titres
    if (line.startsWith("### ")) {
      result.push(`<p class="font-semibold text-white mt-3 mb-1">${parseInline(line.slice(4))}</p>`);
      continue;
    }
    if (line.startsWith("## ")) {
      result.push(`<p class="font-semibold text-white mt-3 mb-1">${parseInline(line.slice(3))}</p>`);
      continue;
    }
    if (line.startsWith("# ")) {
      result.push(`<p class="font-semibold text-white mt-2 mb-1">${parseInline(line.slice(2))}</p>`);
      continue;
    }

    // Listes à puces
    if (line.startsWith("- ") || line.startsWith("* ")) {
      result.push(`<div class="flex gap-2 my-0.5"><span class="text-cyber-blue shrink-0 mt-0.5">›</span><span>${parseInline(line.slice(2))}</span></div>`);
      continue;
    }

    // Listes numérotées
    const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      result.push(`<div class="flex gap-2 my-0.5"><span class="text-cyber-blue shrink-0 font-mono text-xs mt-0.5">${numberedMatch[1]}.</span><span>${parseInline(numberedMatch[2])}</span></div>`);
      continue;
    }

    // Ligne vide
    if (line.trim() === "") {
      result.push(`<div class="h-1" />`);
      continue;
    }

    // Paragraphe normal
    result.push(`<p class="leading-relaxed">${parseInline(line)}</p>`);
  }

  return result.join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseInline(text: string): string {
  return (
    escapeHtml(text)
      // **gras**
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      // *italique*
      .replace(/\*(.+?)\*/g, '<em class="text-white/80 italic">$1</em>')
      // `code inline`
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-cyber-black/60 border border-white/10 rounded px-1 py-0.5 font-mono text-xs text-cyber-green">$1</code>'
      )
  );
}

export default function ChatMessage({ message }: { message: MentorMessage }) {
  const isMentor = message.role === "mentor";

  return (
    <div className={cn("flex gap-3", isMentor ? "justify-start" : "justify-end")}>
      {isMentor && (
        <div className="w-8 h-8 rounded-xl bg-neon-purple/15 border border-neon-purple/25 flex items-center justify-center shrink-0 mt-1">
          <IconAI size={15} strokeWidth={1.5} className="text-neon-purple" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[82%] px-4 py-3 rounded-xl text-sm",
          isMentor
            ? "bg-white/5 border border-white/8 rounded-tl-none text-white/90"
            : "bg-cyber-blue/20 border border-cyber-blue/20 rounded-tr-none text-white/90"
        )}
      >
        {isMentor ? (
          <div
            className="space-y-1"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        ) : (
          <p className="leading-relaxed">{message.content}</p>
        )}
        <p className="text-white/25 text-xs mt-2 text-right">
          {new Date(message.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
