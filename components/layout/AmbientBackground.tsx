"use client";

import { memo } from "react";

/**
 * Unique cyber ambient background:
 * Layered aurora ribbons, subtle glowing cyber nodes and deep space grid.
 * GPU-accelerated, zero pointer events, and pauses on prefers-reduced-motion.
 */
function AmbientBackgroundComponent() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      {/* Dynamic aurora lights */}
      <div className="ambient-orb ambient-orb--cyan" />
      <div className="ambient-orb ambient-orb--violet" />
      <div className="ambient-orb ambient-orb--blue" />

      {/* Micro-particle cyber nodes */}
      <div className="ambient-nodes">
        <span style={{ top: "15%", left: "20%", animationDelay: "0s" }} />
        <span style={{ top: "35%", right: "18%", animationDelay: "2s" }} />
        <span style={{ top: "68%", left: "12%", animationDelay: "4s" }} />
        <span style={{ top: "82%", right: "25%", animationDelay: "1s" }} />
        <span style={{ top: "50%", left: "48%", animationDelay: "3s" }} />
      </div>
    </div>
  );
}

export default memo(AmbientBackgroundComponent);
