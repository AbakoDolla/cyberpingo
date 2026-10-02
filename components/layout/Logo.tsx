import Link from "next/link";
import Image from "next/image";
import logo from "@/public/images/cyberpingo-transparent.png";

interface LogoProps {
  className?: string;
  variant?: "default" | "badge";
}

export default function Logo({ className, variant = "default" }: LogoProps) {
  if (variant === "badge") {
    return (
      <Link href="/" aria-label="CyberPingo, accueil" className={`site-logo ${className ?? ""}`}>
        <span className="site-logo__badge" aria-hidden="true">
          <Image
            src="/images/brand/cyberpingo-mark-square.webp"
            alt=""
            width={192}
            height={192}
            sizes="64px"
            loading="eager"
            fetchPriority="high"
          />
        </span>
        <span className="site-logo__text" aria-hidden="true">
          <span className="site-logo__name">Cyber<span>Pingo</span></span>
          <span className="site-logo__tag">Apprends · Pratique · Protège</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" aria-label="CyberPingo, accueil" className={`flex items-center gap-2 group ${className ?? ""}`}>
      <Image
        src={logo}
        alt=""
        width={56}
        height={56}
        loading="eager"
        fetchPriority="high"
        className="shrink-0 object-contain"
      />
      <span className="flex flex-col" aria-hidden="true">
        <span className="font-body font-bold text-xl tracking-tight text-white">
          Cyber<span className="text-cyber-blue">Pingo</span>
        </span>
        <span className="text-[10px] text-slate-300">Apprends · Pratique · Protège</span>
      </span>
    </Link>
  );
}
