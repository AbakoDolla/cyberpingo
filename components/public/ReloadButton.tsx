"use client";

import { useRouter } from "next/navigation";

export default function ReloadButton({ label = "Réessayer" }: { label?: string }) {
  const router = useRouter();
  return <button type="button" className="public-button button-outline" onClick={() => router.refresh()}>{label}</button>;
}
