export default function MockTerminal({ lines }: { lines: string[] }) {
  return (
    <div className="bg-cyber-black border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <span className="w-2.5 h-2.5 rounded-full bg-cyber-red" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-cyber-green" />
        <span className="ml-3 text-xs text-white/40 font-mono">challenge@cyberpingo</span>
      </div>
      <pre className="p-4 font-mono text-sm text-cyber-green overflow-x-auto whitespace-pre">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
