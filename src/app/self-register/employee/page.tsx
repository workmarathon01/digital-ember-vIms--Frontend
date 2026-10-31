"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import { LogoMark } from "@/components/brand-logo";
import { FooterBanner } from "@/components/footer-banner";
import { ProfileImageInput } from "@/components/profile-image-input";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import {
  fetchEmployeeRegistrationOptions,
  registerEmployee,
} from "@/lib/public-api";
import type {
  PublicEmployeeRegistrationOptions,
  PublicEmployeeRegistrationResponse,
} from "@/lib/types";

type Stage = "form" | "success";

type FormState = {
  firstname: string;
  lastname: string;
  email: string;
  mobile: string;
  password: string;
  password_confirmation: string;
  position: string;
  date_of_joining: string;
  current_site_id: string;
};

const EMPTY_FORM: FormState = {
  firstname: "",
  lastname: "",
  email: "",
  mobile: "",
  password: "",
  password_confirmation: "",
  position: "",
  date_of_joining: "",
  current_site_id: "",
};

const MIN_PASSWORD_LENGTH = 12;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

export default function EmployeeSelfRegisterPage() {
  const [stage, setStage] = useState<Stage>("form");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [options, setOptions] = useState<PublicEmployeeRegistrationOptions>({
    sites: [],
    minimum_password_length: MIN_PASSWORD_LENGTH,
  });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] =
    useState<PublicEmployeeRegistrationResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchEmployeeRegistrationOptions()
      .then((data) => {
        if (!cancelled) {
          setOptions(data);
          setOptionsError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOptionsError(
            err instanceof Error
              ? err.message
              : "Could not load work locations.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const passwordTooShort =
    form.password.length > 0 && form.password.length < MIN_PASSWORD_LENGTH;
  const passwordMismatch =
    form.password_confirmation.length > 0 &&
    form.password !== form.password_confirmation;

  const canSubmit = useMemo(
    () =>
      form.firstname.trim().length > 0 &&
      form.lastname.trim().length > 0 &&
      form.email.trim().length > 0 &&
      form.mobile.length >= 10 &&
      form.current_site_id.length > 0 &&
      form.password.length >= MIN_PASSWORD_LENGTH &&
      form.password === form.password_confirmation &&
      !submitting,
    [form, submitting],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.password !== form.password_confirmation) {
      setError("Password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await registerEmployee(
        {
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim(),
          mobile: form.mobile,
          password: form.password,
          password_confirmation: form.password_confirmation,
          position: form.position.trim() || undefined,
          date_of_joining: form.date_of_joining || undefined,
          current_site_id: Number(form.current_site_id),
        },
        profileImage,
      );
      setResult(response);
      setStage("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit your registration. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function registerAnother() {
    setStage("form");
    setForm(EMPTY_FORM);
    setProfileImage(null);
    setProfilePreview(null);
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/login" aria-label="VisiTrack home">
            <LogoMark size="lg" />
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Employee onboarding
          </div>
        </header>

        {stage === "form" ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-navy sm:text-3xl">
                Create your employee account
              </h1>
              <p className="mt-2 text-sm text-muted">
                Share this page with your team. Each registration is reviewed by
                an administrator or super admin before the account is activated.
              </p>
            </div>

            {error ? (
              <div className="mb-5 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-[13px] font-medium text-warn">
                {error}
              </div>
            ) : null}

            {optionsError ? (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-[13px] font-medium text-warn">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {optionsError} You can refresh the page and try again.
                </span>
              </div>
            ) : null}

            <Card className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-info-bg text-info">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">
                    Employee details
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Use your work email so administrators can verify you.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <Field label="First Name" htmlFor="employee_firstname" required>
                  <TextInput
                    id="employee_firstname"
                    required
                    autoComplete="given-name"
                    placeholder="e.g. Aditi"
                    value={form.firstname}
                    onChange={(event) => update("firstname", event.target.value)}
                  />
                </Field>

                <Field label="Last Name" htmlFor="employee_lastname" required>
                  <TextInput
                    id="employee_lastname"
                    required
                    autoComplete="family-name"
                    placeholder="e.g. Rao"
                    value={form.lastname}
                    onChange={(event) => update("lastname", event.target.value)}
                  />
                </Field>

                <Field label="Work Email" htmlFor="employee_email" required>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <TextInput
                      id="employee_email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="aditi@company.com"
                      value={form.email}
                      onChange={(event) => update("email", event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Field
                  label="Mobile Number"
                  htmlFor="employee_mobile"
                  required
                  hint="10–15 digits."
                >
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <TextInput
                      id="employee_mobile"
                      type="tel"
                      inputMode="numeric"
                      required
                      minLength={10}
                      maxLength={15}
                      autoComplete="tel"
                      placeholder="98765 43210"
                      value={form.mobile}
                      onChange={(event) =>
                        update("mobile", digitsOnly(event.target.value))
                      }
                      className="pl-9"
                    />
                  </div>
                </Field>

                <Field
                  label="Work Location"
                  htmlFor="employee_site"
                  required
                  hint="The site or campus where you work."
                >
                  <Select
                    id="employee_site"
                    required
                    value={form.current_site_id}
                    onChange={(event) =>
                      update("current_site_id", event.target.value)
                    }
                    disabled={optionsLoading || options.sites.length === 0}
                  >
                    <option value="">
                      {optionsLoading
                        ? "Loading locations…"
                        : options.sites.length === 0
                          ? "No locations available"
                          : "Select a work location"}
                    </option>
                    {options.sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.display_name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Position / Designation" htmlFor="employee_position">
                  <TextInput
                    id="employee_position"
                    placeholder="e.g. Facility Executive"
                    value={form.position}
                    onChange={(event) => update("position", event.target.value)}
                  />
                </Field>

                <Field
                  label="Date of Joining"
                  htmlFor="employee_joining_date"
                  hint="Optional."
                >
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <TextInput
                      id="employee_joining_date"
                      type="date"
                      value={form.date_of_joining}
                      onChange={(event) =>
                        update("date_of_joining", event.target.value)
                      }
                      className="pl-9"
                    />
                  </div>
                </Field>

                <div className="md:col-span-2">
                  <Field
                    label="Profile Photo"
                    hint="Take a clear photo of your face or upload a JPG, PNG or WebP image."
                  >
                    <ProfileImageInput
                      file={profileImage}
                      preview={profilePreview}
                      onChange={(file, preview) => {
                        setProfileImage(file);
                        setProfilePreview(preview);
                      }}
                    />
                  </Field>
                </div>

                <Field
                  label="Password"
                  htmlFor="employee_password"
                  required
                  hint="Minimum 12 characters."
                >
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <TextInput
                      id="employee_password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={form.password}
                      onChange={(event) =>
                        update("password", event.target.value)
                      }
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordTooShort ? (
                    <p className="mt-1 text-xs font-medium text-warn">
                      Use at least {MIN_PASSWORD_LENGTH} characters.
                    </p>
                  ) : null}
                </Field>

                <Field
                  label="Confirm Password"
                  htmlFor="employee_password_confirmation"
                  required
                >
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <TextInput
                      id="employee_password_confirmation"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={form.password_confirmation}
                      onChange={(event) =>
                        update("password_confirmation", event.target.value)
                      }
                      className="pl-9"
                    />
                  </div>
                  {passwordMismatch ? (
                    <p className="mt-1 text-xs font-medium text-warn">
                      Passwords do not match.
                    </p>
                  ) : null}
                </Field>

                <div className="flex flex-col-reverse gap-3 border-t border-line-soft pt-5 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </Link>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmit}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {submitting ? "Submitting…" : "Submit registration"}
                  </Button>
                </div>
              </form>
            </Card>

            <div className="mt-5 flex items-start gap-2 rounded-lg border border-info/20 bg-info-bg px-4 py-3 text-xs text-info">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Your account stays inactive until a Super Admin or Admin
                approves it. You will be able to sign in with your email and
                password after approval.
              </p>
            </div>
          </>
        ) : (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-primary-light px-6 py-8 text-center text-white">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                <CheckCircle2 className="h-8 w-8" strokeWidth={2} />
              </span>
              <h1 className="text-2xl font-bold">Registration submitted</h1>
              <p className="mt-2 text-sm text-white/85">
                Thanks{result ? `, ${result.employee.full_name}` : ""}. Your
                employee onboarding request is now with our administrators.
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {result ? (
                <dl className="mb-6 grid gap-3 rounded-lg border border-line bg-canvas px-4 py-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Email
                    </dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {result.employee.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Status
                    </dt>
                    <dd className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-warn">
                      <Clock className="h-3.5 w-3.5" />
                      Awaiting approval
                    </dd>
                  </div>
                </dl>
              ) : null}

              <div className="mb-6 flex items-start gap-3 rounded-lg border border-success/30 bg-success-bg px-4 py-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-semibold text-success">
                    What happens next?
                  </p>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-success/90">
                    <li>A Super Admin or Admin reviews your registration.</li>
                    <li>
                      Once approved, your account is activated automatically.
                    </li>
                    <li>
                      Sign in with your work email and the password you chose.
                    </li>
                  </ol>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={registerAnother}
                >
                  <UserPlus className="h-4 w-4" />
                  Register another employee
                </Button>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <UserRound className="h-4 w-4" />
                  Go to sign in
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      <FooterBanner />
    </div>
  );
}
