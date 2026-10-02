import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Console admin",
  robots: { index: false, follow: false },
};

/** Second line of defence behind the middleware: a signed-in learner gets a plain 404, never the console. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) {
    const { user, isAdmin } = await getRequestUser();
    if (user && !isAdmin) notFound();
  }
  return <AdminShell>{children}</AdminShell>;
}