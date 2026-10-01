import Link from "next/link";
import Image from "next/image";
import logo from "@/public/images/cyberpingo-transparent.png";

export default function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 group ${className ?? ""}`}>
      <span className="sr-only">Accueil — </span>
      <Image
        src={logo}
        alt=""
        width={56}
        height={56}
        className="shrink-0 object-contain"
      />
      <span className="flex flex-col">
        <span className="font-body font-bold text-xl tracking-tight text-white">
          Cyber<span className="text-cyber-blue">Pingo</span>
        </span>
        <span className="text-[10px] text-slate-300">Apprends · Pratique · Protège</span>
      </span>
    </Link>
  );
}
