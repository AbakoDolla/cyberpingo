"use client";

import { UserProvider } from "@/context/UserContext";
import StartupAnimation from "@/components/layout/StartupAnimation";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <UserProvider><StartupAnimation />{children}</UserProvider>;
}
