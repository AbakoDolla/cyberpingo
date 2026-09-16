import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "cyber-blue": "#00A8FF",
        "neon-purple": "#8B5CF6",
        "cyber-green": "#00FF88",
        "cyber-black": "#050816",
        "dark-navy": "#0F172A",
        "cyber-red": "#EF4444",
        "cyber-yellow": "#F59E0B",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "cyber-gradient": "linear-gradient(135deg, #00A8FF 0%, #8B5CF6 100%)",
        "cyber-radial": "radial-gradient(circle at 50% 0%, rgba(0,168,255,0.15), transparent 60%)",
        "green-gradient": "linear-gradient(135deg, #00FF88 0%, #00A8FF 100%)",
        "purple-gradient": "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(0,168,255,0.35)",
        "glow-purple": "0 0 24px rgba(139,92,246,0.35)",
        "glow-green": "0 0 24px rgba(0,255,136,0.35)",
        "glow-yellow": "0 0 24px rgba(245,158,11,0.35)",
        soft: "0 8px 30px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl2: "20px",
      },
      keyframes: {
        "xp-pop": {
          "0%": { opacity: "0", transform: "translateX(-50%) translateY(8px) scale(0.9)" },
          "20%": { opacity: "1", transform: "translateX(-50%) translateY(0) scale(1.05)" },
          "80%": { opacity: "1", transform: "translateX(-50%) translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateX(-50%) translateY(-24px) scale(1)" },
        },
        "level-up": {
          "0%": { opacity: "0", transform: "translateX(-50%) translateY(16px) scale(0.8)" },
          "30%": { opacity: "1", transform: "translateX(-50%) translateY(0) scale(1.08)" },
          "70%": { opacity: "1", transform: "translateX(-50%) translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateX(-50%) translateY(-32px) scale(0.95)" },
        },
        "badge-pop": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "60%": { transform: "scale(1.15)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0px rgba(0,168,255,0.0)" },
          "50%": { boxShadow: "0 0 32px rgba(0,168,255,0.45)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "count-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "xp-pop": "xp-pop 2s ease-out forwards",
        "level-up": "level-up 2.4s ease-out forwards",
        "badge-pop": "badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.3s ease-out forwards",
        "count-up": "count-up 0.2s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
