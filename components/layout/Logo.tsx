import Link from "next/link";

export default function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 group ${className ?? ""}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M16 2 L28 8 V16 C28 23 22.5 28.5 16 30 C9.5 28.5 4 23 4 16 V8 L16 2Z"
          fill="url(#logo-gradient)"
        />
        <circle cx="12" cy="15" r="1.6" fill="#050816" />
        <circle cx="20" cy="15" r="1.6" fill="#050816" />
        <path d="M11 21c1.5 1.4 8.5 1.4 10 0" stroke="#050816" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <defs>
          <linearGradient id="logo-gradient" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00A8FF" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-gradient transition-colors">
        Cyberpingo
      </span>
    </Link>
  );
}
