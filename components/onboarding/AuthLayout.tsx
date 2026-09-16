import Logo from "@/components/layout/Logo";

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid-lines flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>
        <div className="bg-dark-navy border border-white/5 rounded-xl2 p-8 shadow-soft">
          <h1 className="font-display text-2xl font-semibold text-center">{title}</h1>
          <p className="mt-2 text-sm text-white/60 text-center">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-white/50">{footer}</p>
      </div>
    </div>
  );
}
