import InfraLogo from '@/components/ui/InfraLogo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-infra-background px-4 py-12">
      {/* Decorative blobs */}
      <div className="absolute -left-32 -top-32 h-[400px] w-[400px] rounded-full bg-infra-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full bg-infra-accent/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex">
            <InfraLogo size="lg" />
          </a>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-8 shadow-card backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
