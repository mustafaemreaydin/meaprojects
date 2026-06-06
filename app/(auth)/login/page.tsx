import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/shared/logo";
import { SpiralAnimation } from "@/components/ui/spiral-animation";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-text">
      {/* Left: spiral animation panel (always dark) */}
      <div className="hidden md:flex md:w-[46%] relative flex-col justify-between overflow-hidden bg-black p-12">
        {/* Animated spiral */}
        <div className="absolute inset-0">
          <SpiralAnimation />
        </div>
        {/* Subtle vignette so text stays readable */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Top: logo */}
        <div className="relative z-10">
          <Logo light size="lg" />
        </div>

        {/* Bottom: tagline */}
        <div className="relative z-10">
          <p className="max-w-[300px] text-[17px] font-light leading-relaxed text-white/70">
            Your personal AI workspace.
          </p>
          <p className="mt-2 text-[12px] uppercase tracking-widest text-white/35">
            meaprojects.com
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        {/* Back to home */}
        <Link
          href="/"
          className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-text-muted transition-colors hover:text-text hover:bg-[var(--bg-elevated)]"
        >
          <ArrowLeft size={15} />
          Back to home
        </Link>

        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="mb-10 md:hidden">
            <Logo size="lg" />
          </div>

          <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-text-muted">
            Sign in
          </p>
          <h1 className="mb-2 text-[38px] font-light leading-none tracking-[-0.03em] text-text">
            Welcome back.
          </h1>
          <p className="mb-10 text-[14px] text-text-muted">
            Enter your credentials to continue.
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
