import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  banIp,
  clearIncidents,
  getSocSnapshot,
  setShieldMode,
  simulateDrill,
  unbanIp,
} from "@/lib/security/waf";

const failure = (error: string, status: number) => NextResponse.json({ error }, { status });

async function verifyStaff() {
  if (!isSupabaseConfigured) return { authorized: true, user: null };
  const { user, isAdmin } = await getRequestUser();
  if (!user || !isAdmin) return { authorized: false, user: null };
  return { authorized: true, user };
}

export async function GET() {
  const { authorized } = await verifyStaff();
  if (!authorized) return failure("Accès non autorisé au centre de sécurité SOC.", 403);

  const snapshot = getSocSnapshot();
  return NextResponse.json(snapshot);
}

export async function POST(request: NextRequest) {
  const { authorized, user } = await verifyStaff();
  if (!authorized) return failure("Accès non autorisé aux opérations du SOC.", 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return failure("Format de requête JSON invalide.", 400);
  }

  const action = typeof body.action === "string" ? body.action : "";
  const actor = user?.id ? `Admin (${user.id.slice(0, 8)})` : "SuperAdmin";

  switch (action) {
    case "toggle_shield": {
      const enabled = Boolean(body.enabled);
      const shieldMode = setShieldMode(enabled);
      return NextResponse.json({ success: true, shieldMode });
    }

    case "ban_ip": {
      const ip = typeof body.ip === "string" ? body.ip.trim() : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "Blocage manuel SOC";
      const duration = typeof body.durationMinutes === "number" ? body.durationMinutes : 1440;
      if (!ip) return failure("Adresse IP requise.", 400);
      const ban = banIp(ip, reason, duration, actor);
      return NextResponse.json({ success: true, ban });
    }

    case "unban_ip": {
      const ip = typeof body.ip === "string" ? body.ip.trim() : "";
      if (!ip) return failure("Adresse IP requise.", 400);
      const unbanned = unbanIp(ip);
      return NextResponse.json({ success: unbanned });
    }

    case "simulate_drill": {
      const drillType = typeof body.drillType === "string" ? body.drillType : "sqli";
      const threat = simulateDrill(drillType);
      return NextResponse.json({ success: true, threat });
    }

    case "clear_incidents": {
      clearIncidents();
      return NextResponse.json({ success: true });
    }

    default:
      return failure(`Action SOC inconnue: ${action}`, 400);
  }
}
