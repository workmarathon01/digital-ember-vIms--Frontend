"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { FeatureGrid } from "@/components/feature-grid";
import { KioskPanel } from "@/components/kiosk-panel";
import { FooterBanner } from "@/components/footer-banner";
import { LogoMark } from "@/components/brand-logo";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !submitting,
    [email, password, submitting],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pb-10 pt-8">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <LogoMark size="lg" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
            Smart Visitor Management System
          </p>
        </header>

        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              <span className="block text-navy">Smart Access.</span>
              <span className="block text-primary">Secure Visitors.</span>
            </h1>

            <Card className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={2} />
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">
                  Security Sign-in
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Field label="Email Address" htmlFor="email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <TextInput
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Field label="Password" htmlFor="password">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <TextInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {error ? (
                  <p className="rounded-lg border border-warn/30 bg-warn-bg px-3 py-2 text-[13px] font-medium text-warn">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  variant="navy"
                  size="lg"
                  disabled={!canSubmit}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Sign In
                </Button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-xs font-medium text-muted">OR</span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <Button type="button" variant="secondary" size="lg" className="w-full">
                  Pre-Register Visitor
                </Button>
              </form>
            </Card>
          </div>

          <KioskPanel />
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink">
              Everything you need for modern access control
            </h2>
            <span className="h-px flex-1 bg-line" />
          </div>
          <FeatureGrid />
        </section>
      </div>

      <FooterBanner />
    </div>
  );
}