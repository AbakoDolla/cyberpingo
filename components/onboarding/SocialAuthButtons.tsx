import Button from "@/components/ui/Button";

export default function SocialAuthButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        variant="secondary"
        type="button"
        className="w-full opacity-60 cursor-not-allowed"
        title="Bientôt disponible"
        disabled
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.75H9v3.3h4.8a4.1 4.1 0 0 1-1.78 2.7v2.25h2.9c1.7-1.55 2.68-3.85 2.68-6.5Z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.9-2.25c-.8.55-1.85.87-3.06.87-2.35 0-4.34-1.58-5.05-3.7H.95v2.32A9 9 0 0 0 9 18Z" />
          <path fill="#FBBC05" d="M3.95 10.72a5.4 5.4 0 0 1 0-3.44V4.96H.95a9 9 0 0 0 0 8.08l3-2.32Z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .95 4.96l3 2.32C4.66 5.16 6.65 3.58 9 3.58Z" />
        </svg>
        Google
      </Button>
      <Button
        variant="secondary"
        type="button"
        className="w-full opacity-60 cursor-not-allowed"
        title="Bientôt disponible"
        disabled
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="currentColor">
          <path d="M9 .3a9 9 0 0 0-2.85 17.54c.45.08.61-.2.61-.43v-1.68c-2.5.55-3.03-1.06-3.03-1.06-.41-1.04-1-1.32-1-1.32-.82-.56.06-.55.06-.55.9.06 1.38.93 1.38.93.8 1.38 2.11.98 2.63.75.08-.58.32-.98.57-1.21-2-.23-4.1-1-4.1-4.45 0-.98.35-1.79.92-2.42-.09-.23-.4-1.15.09-2.4 0 0 .76-.24 2.48.92a8.6 8.6 0 0 1 4.52 0c1.72-1.16 2.48-.92 2.48-.92.49 1.25.18 2.17.09 2.4.57.63.92 1.44.92 2.42 0 3.46-2.11 4.22-4.12 4.44.33.28.62.85.62 1.7v2.53c0 .24.16.52.62.43A9 9 0 0 0 9 .3Z" />
        </svg>
        GitHub
      </Button>
      <p className="col-span-2 text-center text-xs text-white/30">
        Connexion sociale bientôt disponible
      </p>
    </div>
  );
}
