import Image from "next/image";
import { cn } from "@/lib/utils";

export interface PhotoCoverProps {
  src: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  position?: string;
}

export const CARD_COVER_SIZES = "(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 33vw";

export default function PhotoCover({ src, className, sizes = CARD_COVER_SIZES, priority = false, position }: PhotoCoverProps) {
  return (
    <div className={cn("cp-art cp-art--photo", className)} aria-hidden="true">
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className="cp-art__photo"
        style={position ? { objectPosition: position } : undefined}
      />
    </div>
  );
}
