import PublicShell from "@/components/layout/PublicShell";
import "../landing.css";
import "../public-pages.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
