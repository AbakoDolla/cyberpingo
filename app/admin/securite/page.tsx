import { AdminSecuritySocPage } from "@/components/admin/AdminPages";

export const metadata = {
  title: "Centre de Sécurité & SOC | CyberPingo Admin",
  description: "Console de détection, pare-feu WAF, mitigation DDoS et télémétrie SOC en direct.",
};

export default function AdminSecuritePage() {
  return <AdminSecuritySocPage />;
}
