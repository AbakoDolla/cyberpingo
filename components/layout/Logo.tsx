import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
  variant?: "default" | "badge";
}

export default function Logo({ className, variant = "default" }: LogoProps) {
  if (variant === "badge") {
    return (
      <Link href="/" aria-label="CyberPingo, accueil" className={`site-logo group ${className ?? ""}`}>
        <span className="site-logo__badge" aria-hidden="true">
          <Image
            src="/images/brand/cyberpingo-mark-square.webp"
            alt=""
            width={192}
            height={192}
            sizes="64px"
            loading="eager"
            fetchPriority="high"
            className="transition-transform duration-300 group-hover:scale-110"
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
    <Link href="/" aria-label="CyberPingo, accueil" className={`site-logo group ${className ?? ""}`}>
      <span className="site-logo__badge" aria-hidden="true">
        <Image
          src="/images/brand/cyberpingo-mark-square.webp"
          alt=""
          width={128}
          height={128}
          loading="eager"
          fetchPriority="high"
          className="transition-transform duration-300 group-hover:scale-110"
        />
      </span>
      <span className="site-logo__text" aria-hidden="true">
        <span className="site-logo__name text-xl">Cyber<span>Pingo</span></span>
        <span className="site-logo__tag">Apprends · Pratique · Protège</span>
      </span>
    </Link>
  );
}
