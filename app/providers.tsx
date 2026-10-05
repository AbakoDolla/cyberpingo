"use client";

import { UserProvider } from "@/context/UserContext";
import StartupAnimation from "@/components/layout/StartupAnimation";
import BroadcastTicker from "@/components/notifications/BroadcastTicker";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <StartupAnimation />
      <BroadcastTicker />
      {children}
    </UserProvider>
  );
}
