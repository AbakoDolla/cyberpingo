"use client";

import { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AmbientBackground from "./AmbientBackground";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const [motionEnabled, setMotionEnabled] = useState(true);
  return (
    <div className="public-site" data-motion={motionEnabled ? "on" : "off"}>
      <AmbientBackground />
      <a className="skip-link" href="#main-content">Aller au contenu principal</a>
      <Navbar motionEnabled={motionEnabled} onToggleMotion={() => setMotionEnabled(!motionEnabled)} />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
}
