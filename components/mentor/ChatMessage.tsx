import { MentorMessage } from "@/types";
import { cn } from "@/lib/utils";
import { IconAI, IconProfile } from "@/components/ui/Icon";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="mentor-md-strong">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="mentor-md-em">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="mentor-md-inline-code">$1</code>');
}

function codeBlockHtml(lines: string[], language: string) {
  const langLabel = language ? `<span class="mentor-md-code-lang">${escapeHtml(language)}</span>` : "";
  return `<div class="mentor-md-code">${langLabel}<code>${escapeHtml(lines.join("\n"))}</code></div>`;
}

/**
 * Converts the mentor's constrained Markdown subset to escaped HTML.
 * Supported syntax: headings, bullet/numbered lists, inline emphasis and fenced code.
 */
function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        result.push(codeBlockHtml(codeLines, codeLang));
        codeLines = [];
        codeLang = "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("### ")) {
      result.push(`<p class="mentor-md-heading">${parseInline(line.slice(4))}</p>`);
      continue;
    }
    if (line.startsWith("## ")) {
      result.push(`<p class="mentor-md-heading">${parseInline(line.slice(3))}</p>`);
      continue;
    }
    if (line.startsWith("# ")) {
      result.push(`<p class="mentor-md-heading">${parseInline(line.slice(2))}</p>`);
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      result.push(`<div class="mentor-md-list"><span>›</span><span>${parseInline(line.slice(2))}</span></div>`);
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      result.push(`<div class="mentor-md-list"><span>${numberedMatch[1]}.</span><span>${parseInline(numberedMatch[2])}</span></div>`);
      continue;
    }

    if (line.trim() === "") {
      result.push('<div class="mentor-md-spacer"></div>');
      continue;
    }

    result.push(`<p>${parseInline(line)}</p>`);
  }

  if (inCodeBlock) result.push(codeBlockHtml(codeLines, codeLang));
  return result.join("");
}

export default function ChatMessage({ message }: { message: MentorMessage }) {
  const isMentor = message.role === "mentor";

  return (
    <div className={cn("mentor-message", isMentor ? "is-mentor" : "is-user")}>
      <div className="mentor-message-avatar" aria-hidden="true">
        {isMentor ? <IconAI size={15} strokeWidth={1.5} /> : <IconProfile size={15} strokeWidth={1.5} />}
      </div>

      <div className="mentor-message-bubble">
        {isMentor ? (
          <div
            className="mentor-markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        ) : (
          <p>{message.content}</p>
        )}
        <time dateTime={message.createdAt}>
          {new Date(message.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
}
