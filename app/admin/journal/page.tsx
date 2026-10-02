import { redirect } from "next/navigation";
import { AdminLogsPage } from "@/components/admin/AdminPages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestUser } from "@/lib/supabase/server";
import { isSuperadmin } from "@/lib/roles";

/** The audit log is reserved to super-administrators; administrators are sent back to the console home. */
export default async function AdminJournalPage() {
  if (isSupabaseConfigured) {
    const { user, role } = await getRequestUser();
    if (user && !isSuperadmin(role)) redirect("/admin");
  }
  return <AdminLogsPage />;
}