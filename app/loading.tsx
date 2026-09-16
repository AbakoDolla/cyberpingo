export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cyber-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full border-4 border-dark-navy border-t-cyber-blue animate-spin" />
        <p className="text-sm text-white/50 font-body">Chargement de Cyberpingo…</p>
      </div>
    </div>
  );
}
