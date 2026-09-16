import { LessonBlock } from "@/types";

export default function LessonBlockRenderer({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "text":
      return <p className="text-white/80 leading-relaxed">{block.content}</p>;
    case "schema":
      return (
        <div className="bg-cyber-black border border-cyber-blue/20 rounded-xl p-5 text-center text-sm text-cyber-blue font-medium overflow-x-auto whitespace-nowrap">
          {block.content}
        </div>
      );
    case "video":
      return (
        <div className="aspect-video bg-cyber-black border border-white/10 rounded-xl flex items-center justify-center text-white/40 text-sm">
          ▶ Vidéo — {block.content}
        </div>
      );
    case "code":
      return (
        <pre className="bg-cyber-black border border-white/10 rounded-xl p-5 overflow-x-auto">
          <code className="font-mono text-sm text-cyber-green whitespace-pre">{block.content}</code>
        </pre>
      );
    case "example":
      return (
        <div className="bg-neon-purple/10 border border-neon-purple/20 rounded-xl p-5 text-sm text-white/80">
          <span className="text-neon-purple font-medium">Exemple — </span>
          {block.content}
        </div>
      );
    default:
      return null;
  }
}
